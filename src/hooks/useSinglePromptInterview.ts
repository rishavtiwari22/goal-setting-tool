import { useState, useRef, useEffect, useCallback } from 'react';
import { ENV } from '../utils/env';
import type { InterviewConfig } from '../services/interview/interviewEngine';
import type { InterviewSession, InterviewResult } from '../models/interview';
import type { SkillsFramework } from '../types/interviewTypes';
import {
  buildExtractionMessages,
  buildOpeningMessages,
  buildInterviewerMessages,
  buildSummarizationMessages,
  buildSummarizePrompt,
  type ChatMessage,
} from '../services/interview/interviewPrompts';
import {
  saveInterviewSessionBySessionId,
  saveInterviewResult,
} from '../services/storage/interviewStorage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface UseInterviewProps {
  config: InterviewConfig | null;
  sessionId?: string;
  onComplete: (session: InterviewSession) => void;
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: () => void;
  onFeedback?: (feedback: string) => void;
  screenCode?: string;
  mode?: InterviewConfig['mode'];
  /** When false, delays starting the interview until set to true (e.g. after onboarding guide) */
  readyToStart?: boolean;
}

const RECENT_WINDOW = 3;
const SUMMARIZE_START_AFTER = 2; // Start summarizing after 2nd answer

// ── LLM client (reuses existing fetch infra) ──────────────────────────────────

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const url = ENV.CHAT_API_URL();
  const model = ENV.HUGGINGFACE_MODEL() || 'tgi';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error ${response.status}: ${text.slice(0, 200)}`);
  }

  const text = await response.text();
  // Handle wrapped responses (Cloudflare worker may add metadata)
  const lines = text.split('\n');
  const jsonLine =
    lines.find(l => {
      const t = l.trim();
      return t.startsWith('{') && !t.includes('statusCode');
    }) || text;

  const data = JSON.parse(jsonLine.trim());
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

async function* chatCompletionStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const url = ENV.CHAT_API_URL();
  const model = ENV.HUGGINGFACE_MODEL() || 'tgi';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM stream error ${response.status}: ${text.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Helper: build JD text from config ─────────────────────────────────────────

function buildJDText(config: InterviewConfig): string {
  const parts: string[] = [];
  if (config.jobTitle) parts.push(`Role: ${config.jobTitle}`);
  if (config.jobDescription) parts.push(config.jobDescription);
  if (config.examinationPoints?.length) {
    parts.push(`Key skills: ${config.examinationPoints.join(', ')}`);
  }
  return parts.join('\n\n');
}

// ── Helper: create initial session object ─────────────────────────────────────

function createInitialSession(config: InterviewConfig, sessionId: string): InterviewSession {
  return {
    sessionId,
    userId: config.userId,
    jobId: config.jobId,
    jobTitle: config.jobTitle,
    jobDescription: config.jobDescription,
    startTime: new Date().toISOString(),
    qaHistory: [],
    currentPhase: 'introduction',
    remainingTime: config.interviewTime * 60,
    interviewTime: config.interviewTime,
    language: config.language,
    difficulty: config.difficulty,
    examinationPoints: config.examinationPoints,
    status: 'ongoing',
    mode: config.mode ?? 'practice',
    consecutiveIrrelevantCount: 0,
    currentTopicFollowupCount: 0,
    discussedProjects: [],
    currentProjectIndex: 0,
    introductionQuestionCount: 0,
    projectQuestionCount: 0,
    technicalQuestionCount: 0,
    currentProjectQuestionCount: 0,
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useSinglePromptInterview({
  config,
  sessionId: initialSessionId,
  onComplete,
  onStreamChunk,
  onStreamComplete,
  screenCode,
  readyToStart = true,
}: UseInterviewProps) {
  // Don't cache config mode here - use ref to always get latest value
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [sessionId, setSessionId] = useState(initialSessionId || '');

  // Internal refs — not causing re-renders
  const configRef = useRef<InterviewConfig | null>(config);
  const frameworkRef = useRef<SkillsFramework | null>(null);
  const recentMessagesRef = useRef<{ role: 'interviewer' | 'candidate'; content: string }[]>([]);
  const archivedRef = useRef<{ role: 'interviewer' | 'candidate'; content: string }[]>([]);
  const rollingSummaryRef = useRef('');
  const turnCountRef = useRef(0);
  const sessionRef = useRef<InterviewSession | null>(null);
  const timeRemainingRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompletedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const currentQuestionRef = useRef('');
  const screenCodeRef = useRef(screenCode);

  // Stable refs for callbacks used inside setInterval / async closures
  const endInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const onStreamChunkRef = useRef(onStreamChunk);
  const onStreamCompleteRef = useRef(onStreamComplete);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync with latest values
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { onStreamChunkRef.current = onStreamChunk; }, [onStreamChunk]);
  useEffect(() => { onStreamCompleteRef.current = onStreamComplete; }, [onStreamComplete]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { screenCodeRef.current = screenCode; }, [screenCode]);

  // ── End interview ──────────────────────────────────────────────────────────

  const endInterview = useCallback(async () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    setIsCompleted(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const session = sessionRef.current;
    if (!session) return;

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.remainingTime = timeRemainingRef.current;

    try {
      const { systemMessage, humanMessage } = buildSummarizePrompt({
        jobTitle: frameworkRef.current?.role || session.jobTitle,
        jobDescription: session.jobDescription,
        knowledgePoints: session.examinationPoints,
        qaHistory: session.qaHistory.filter(qa => qa.answer),
        interviewTime: Math.floor(((session.interviewTime * 60) - timeRemainingRef.current) / 60),
        language: session.language || 'English',
        mode: configRef.current?.mode ?? 'practice',
      });
      const evalMsgs: ChatMessage[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: humanMessage },
      ];
      const raw = await chatCompletion(evalMsgs);
      const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

      let result: InterviewResult;
      try {
        const parsed = JSON.parse(cleaned);
        result = {
          summary: parsed.summary || '',
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          conclusion: parsed.conclusion || '',
          totalQuestions: session.qaHistory.length,
          correctAnswers: Math.round(session.qaHistory.length * 0.6),
          elapsedTime: (session.interviewTime * 60) - timeRemainingRef.current,
          topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths : [],
          improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : [],
        };
      } catch {
        result = {
          summary: rollingSummaryRef.current || 'Interview completed.',
          score: 0,
          conclusion: 'Thank you for completing the interview.',
          totalQuestions: session.qaHistory.length,
          correctAnswers: 0,
          elapsedTime: (session.interviewTime * 60) - timeRemainingRef.current,
          topStrengths: [],
          improvementAreas: [],
        };
      }

      session.result = result;
      saveInterviewResult(session.sessionId, result);
      saveInterviewSessionBySessionId(session);
    } catch (error) {
      console.error('Error generating interview results:', error);
      saveInterviewSessionBySessionId(session);
    }

    onCompleteRef.current(session);
  }, []);

  // Keep endInterviewRef in sync
  useEffect(() => { endInterviewRef.current = endInterview; }, [endInterview]);

  // ── Time up handler (uses ref to avoid stale closures in timer) ────────────

  const handleTimeUp = useCallback(async () => {
    if (isCompletedRef.current) return;
    await endInterviewRef.current();
  }, []);

  // ── Rolling summarization (async, non-blocking) ────────────────────────────

  const isSummarizingRef = useRef(false);

  const runSummarization = useCallback(() => {
    if (isSummarizingRef.current) return;
    const toCompress = [...archivedRef.current];
    if (toCompress.length === 0 || !frameworkRef.current) return;

    // Clear archived immediately so new messages don't get re-summarized
    archivedRef.current = [];
    isSummarizingRef.current = true;

    const skillsList = [
      ...frameworkRef.current.must_have_skills.map(s => s.skill),
      ...frameworkRef.current.nice_to_have_skills.map(s => s.skill),
    ];

    const msgs = buildSummarizationMessages(
      frameworkRef.current.role,
      rollingSummaryRef.current,
      toCompress,
      skillsList,
    );

    // Fire-and-forget: runs in background, updates summary when ready
    chatCompletion(msgs)
      .then(summary => {
        rollingSummaryRef.current = summary;
      })
      .catch(err => {
        console.error('Summarization failed:', err);
        // Put messages back so they can be retried next cycle
        archivedRef.current = [...toCompress, ...archivedRef.current];
      })
      .finally(() => {
        isSummarizingRef.current = false;
      });
  }, []);

  // ── Start interview ────────────────────────────────────────────────────────

  const startInterview = useCallback(async (cfg: InterviewConfig, sid: string) => {
    setIsLoading(true);
    try {
      const jd = buildJDText(cfg);

      // Extract skills framework from JD
      const extractMsgs = buildExtractionMessages(jd);
      const rawFramework = await chatCompletion(extractMsgs);
      const cleanedFramework = rawFramework.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

      let framework: SkillsFramework;
      try {
        framework = JSON.parse(cleanedFramework);
      } catch {
        // Fallback framework if parsing fails
        framework = {
          role: cfg.jobTitle,
          must_have_skills: cfg.examinationPoints.map(s => ({
            skill: s,
            weight: 1,
            evaluation_approach: 'Direct questioning',
          })),
          nice_to_have_skills: [],
          behavioral_competencies: [],
          red_flags_to_probe: [],
          interview_focus_areas: cfg.examinationPoints,
          suggested_question_sequence: [],
        };
      }
      frameworkRef.current = framework;

      // Generate opening question (non-streaming)
      const openingMsgs = buildOpeningMessages(framework, configRef.current?.mode ?? 'practice');
      const openingQuestion = await chatCompletion(openingMsgs);

      // Add to internal message history
      recentMessagesRef.current = [{ role: 'interviewer', content: openingQuestion }];
      setCurrentQuestion(openingQuestion);

      // Add to UI messages
      const msgId = `q_0_${Date.now()}`;
      setMessages([{
        id: msgId,
        role: 'assistant',
        content: openingQuestion,
        timestamp: new Date().toISOString(),
      }]);

      // Send to TTS pipeline as a single chunk
      if (onStreamChunkRef.current) onStreamChunkRef.current(openingQuestion);
      if (onStreamCompleteRef.current) onStreamCompleteRef.current();

      // Persist initial session with session ID
      if (sessionRef.current) {
        saveInterviewSessionBySessionId(sessionRef.current, true);
      }

    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── On config load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!config || !readyToStart || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const newSessionId = initialSessionId || crypto.randomUUID();
    setSessionId(newSessionId);

    const totalSeconds = config.interviewTime * 60;
    timeRemainingRef.current = totalSeconds;
    setRemainingTime(totalSeconds);

    // Create session
    const session = createInitialSession(config, newSessionId);
    sessionRef.current = session;

    // Start countdown
    timerRef.current = setInterval(() => {
      timeRemainingRef.current -= 1;
      setRemainingTime(timeRemainingRef.current);
      if (timeRemainingRef.current <= 0) {
        handleTimeUp();
      }
    }, 1000);

    startInterview(config, newSessionId);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [config, readyToStart]);

  // ── Submit answer ──────────────────────────────────────────────────────────

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (isCompletedRef.current) return;

      // Handle explicit end call
      if (answer.trim().toLowerCase() === 'end the call') {
        await endInterviewRef.current();
        return;
      }

      const answerId = `a_${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: answerId,
          role: 'user' as const,
          content: answer,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsLoading(true);

      try {
        const framework = frameworkRef.current;
        if (!framework) throw new Error('Framework not loaded');

        const recent = recentMessagesRef.current.slice(-RECENT_WINDOW);
        const msgs = buildInterviewerMessages(
          framework,
          rollingSummaryRef.current,
          recent,
          answer,
          timeRemainingRef.current,
          (sessionRef.current?.interviewTime ?? 10) * 60,
          configRef.current?.mode ?? 'practice',
          screenCodeRef.current,
        );

        let fullResponse = '';
        const questionId = `q_${Date.now()}`;

        // Stream interviewer response
        for await (const chunk of chatCompletionStream(msgs)) {
          fullResponse += chunk;
          const displayChunk = chunk.replace(/\[INTERVIEW_OVER\]/gi, '');
          if (displayChunk && onStreamChunkRef.current) onStreamChunkRef.current(displayChunk);

          setMessages(prev => {
            const displayText = fullResponse.replace(/\[INTERVIEW_OVER\]/gi, '').trim();
            const existing = prev.find(m => m.id === questionId);
            if (existing) {
              return prev.map(m =>
                m.id === questionId ? { ...m, content: displayText } : m
              );
            }
            return [
              ...prev,
              {
                id: questionId,
                role: 'assistant' as const,
                content: displayText,
                timestamp: new Date().toISOString(),
              },
            ];
          });
        }

        if (onStreamCompleteRef.current) onStreamCompleteRef.current();

        const hasEndToken = /\[INTERVIEW_OVER\]/i.test(fullResponse);
        const cleanedResponse = fullResponse.replace(/\[INTERVIEW_OVER\]/gi, '').trim();

        setCurrentQuestion(cleanedResponse);

        // Update message history
        const newMsgs = [
          { role: 'candidate' as const, content: answer },
          { role: 'interviewer' as const, content: cleanedResponse },
        ];
        const updated = [...recentMessagesRef.current, ...newMsgs];

        // Archive messages beyond the window
        if (updated.length > RECENT_WINDOW) {
          archivedRef.current = [
            ...archivedRef.current,
            ...updated.slice(0, updated.length - RECENT_WINDOW),
          ];
          recentMessagesRef.current = updated.slice(-RECENT_WINDOW);
        } else {
          recentMessagesRef.current = updated;
        }

        // Update session QA history
        if (sessionRef.current) {
          sessionRef.current.qaHistory.push({
            question: currentQuestionRef.current,
            answer,
            score: 0,
            isCorrect: false,
            timestamp: new Date().toISOString(),
          });
          saveInterviewSessionBySessionId(sessionRef.current);
        }

        // Async summarization: every turn after the 2nd answer
        turnCountRef.current += 1;
        if (turnCountRef.current >= SUMMARIZE_START_AFTER) {
          runSummarization();
        }

        if (hasEndToken) {
          await endInterviewRef.current();
        }
      } catch (error) {
        console.error('Error processing answer:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [runSummarization]
  );

  return {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
    currentQuestion,
    sessionId,
  };
}
