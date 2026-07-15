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
// import { enqueueSessionComplete } from '../services/sync/sessionCompleteBridge';
import { resultGenerationStatus } from '../services/resultGenerationStatus';
import * as dailySessionApi from '../services/api/dailySessionApi';

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
  /** Whether the candidate is currently sharing their screen */
  isScreenSharing?: boolean;
  /** Called when the LLM emits the [REQUEST_SCREEN_SHARE] control token */
  onRequestScreenShare?: () => void;
}

const RECENT_WINDOW = 10;
const SUMMARIZE_START_AFTER = 2; // Start summarizing after 2nd answer

// ── System-marker handling (PARKED + INTERVIEW_OVER) ─────────────────────────
//
// Mentor prompt emits `[PARKED: <topic>]` when it silently moves the candidate
// off a topic. INTERVIEW_OVER is the existing end-of-session token. Both must
// be:
//   • stripped from text shown in the chat UI
//   • stripped from chunks fed to TTS so the candidate never hears them
//   • (PARKED only) collected into session.parkedTopics for the post-session
//     evaluator to compile a "topics to study" list
//
// Tricky bit: tokens may be split across streaming chunks (e.g. one chunk
// ends with "[PARK", the next starts with "ED: foo]"). A naive per-chunk
// regex never matches. We buffer any chunk text starting with '[' until we
// see a matching ']' (or the stream ends), then decide whether to strip.
const PARKED_RE = /\[PARKED:\s*([^\]]+?)\s*\]/gi;
const INTERVIEW_OVER_RE = /\[INTERVIEW_OVER\]/gi;
const REQUEST_SHARE_RE = /\[\s*REQUEST[_\s-]*SCREEN[_\s-]*SHARE\s*\]/gi;
const REQUEST_SHARE_BARE_RE = /REQUEST[_\s-]*SCREEN[_\s-]*SHARE/gi;
// Non-global single-shot tests (avoid statefulness from /g flag)
const PARKED_TEST = /^\[PARKED:\s*[^\]]+\]$/i;
const INTERVIEW_OVER_TEST = /^\[INTERVIEW_OVER\]$/i;
const REQUEST_SHARE_TEST = /^\[\s*REQUEST[_\s-]*SCREEN[_\s-]*SHARE\s*\]$/i;

function stripParkedMarkers(s: string): string {
  return s.replace(PARKED_RE, '');
}

function stripAllMarkers(s: string): string {
  return s
    .replace(PARKED_RE, '')
    .replace(INTERVIEW_OVER_RE, '')
    .replace(REQUEST_SHARE_RE, '')
    .replace(REQUEST_SHARE_BARE_RE, '');
}

function extractParkedTopics(s: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PARKED_RE.source, PARKED_RE.flags);
  while ((m = re.exec(s)) !== null) {
    const topic = m[1]?.trim();
    if (topic) out.push(topic);
  }
  return out;
}

/**
 * Streaming-safe marker stripper. Holds back any pending `[...]` segment
 * until it can decide whether to drop it (matches PARKED/INTERVIEW_OVER) or
 * pass it through.
 *
 * Usage:
 *   const s = makeMarkerStripper();
 *   for await (const chunk of stream) {
 *     const safe = s.push(chunk);
 *     if (safe) emit(safe);
 *   }
 *   const tail = s.flush();
 *   if (tail) emit(tail);
 */
function makeMarkerStripper() {
  let pending = '';

  function push(chunk: string): string {
    pending += chunk;
    let output = '';

    while (true) {
      const openIdx = pending.indexOf('[');
      if (openIdx === -1) {
        // No open bracket anywhere — emit it all
        output += pending;
        pending = '';
        return output;
      }

      // Emit everything before the '['
      output += pending.slice(0, openIdx);
      pending = pending.slice(openIdx);

      const closeIdx = pending.indexOf(']');
      if (closeIdx === -1) {
        // Incomplete bracket — hold and wait for more chunks
        return output;
      }

      const segment = pending.slice(0, closeIdx + 1);
      pending = pending.slice(closeIdx + 1);

      // If it's a known system marker, drop it; otherwise pass through
      if (
        PARKED_TEST.test(segment) ||
        INTERVIEW_OVER_TEST.test(segment) ||
        REQUEST_SHARE_TEST.test(segment)
      ) {
        // drop
      } else {
        output += segment;
      }
    }
  }

  function flush(): string {
    // End of stream — strip any remaining markers and emit the rest
    const out = stripAllMarkers(pending);
    pending = '';
    return out;
  }

  return { push, flush };
}

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
    mentorProfile: config.mentorProfile,
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
  isScreenSharing = false,
  onRequestScreenShare,
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
  const currentQuestionRef = useRef('');
  const screenCodeRef = useRef(screenCode);
  const isScreenSharingRef = useRef(isScreenSharing);
  const screenShareAskCountRef = useRef(0);
  const screenShareFirstTurnUsedRef = useRef(false);
  const hasStartedInterviewRef = useRef(false);

  // Stable refs for callbacks used inside setInterval / async closures
  const endInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const onStreamChunkRef = useRef(onStreamChunk);
  const onStreamCompleteRef = useRef(onStreamComplete);
  const onCompleteRef = useRef(onComplete);
  const onRequestScreenShareRef = useRef(onRequestScreenShare);

  // Keep refs in sync with latest values
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { onStreamChunkRef.current = onStreamChunk; }, [onStreamChunk]);
  useEffect(() => { onStreamCompleteRef.current = onStreamComplete; }, [onStreamComplete]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { screenCodeRef.current = screenCode; }, [screenCode]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
  useEffect(() => { onRequestScreenShareRef.current = onRequestScreenShare; }, [onRequestScreenShare]);
  useEffect(() => {
    if (!isScreenSharing) {
      screenShareFirstTurnUsedRef.current = false;
    }
  }, [isScreenSharing]);

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

    // Signal to Results.tsx that summary + rubric LLM calls are in flight so
    // it shows a generating state instead of immediately concluding the
    // result is missing. setComplete fires in every exit path below.
    resultGenerationStatus.setGenerating(session.sessionId);

    try {
      const { systemMessage, humanMessage } = buildSummarizePrompt({
        jobTitle: frameworkRef.current?.role || session.jobTitle,
        jobDescription: session.jobDescription,
        knowledgePoints: session.examinationPoints,
        qaHistory: session.qaHistory.filter(qa => qa.answer),
        interviewTime: Math.floor(((session.interviewTime * 60) - timeRemainingRef.current) / 60),
        language: session.language || 'English',
        mode: configRef.current?.mode ?? 'practice',
        parkedTopics: session.parkedTopics,
      });
      const evalMsgs: ChatMessage[] = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: humanMessage },
      ];
      const raw = await chatCompletion(evalMsgs);
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

      let result: InterviewResult;
      try {
        const parsed = JSON.parse(cleaned);

        // --- BACKEND API INTEGRATION ---
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (configRef.current?.mode === 'goal-setting' && Array.isArray(parsed.goals)) {
          const payload = {
            email: localStorage.getItem('studentEmail') || '',
            date: todayStr,
            goals: parsed.goals.map((g: any) => ({
              goalId: crypto.randomUUID(),
              description: g.conclusion || g.summary || ''
            }))
          };
          dailySessionApi.saveDailyRecord(payload).then(() => {
            window.dispatchEvent(new Event('goalSaved'));
          }).catch(console.error);
        } else if (configRef.current?.mode === 'reflection' && Array.isArray(parsed.reflections)) {
          let sourceGoals: any[] = [];
          try {
             // We can use getMonthlyRecords to find the goals, but getDailyRecord is better since we just added it.
             const record = await dailySessionApi.getDailyRecord(todayStr);
             sourceGoals = record?.goals || [];
          } catch(e) {}
          
          // Send each reflection incrementally
          parsed.reflections.forEach((r: any, idx: number) => {
            const reflectionPayload = {
              email: localStorage.getItem('studentEmail') || '',
              date: todayStr,
              reflections: [{
                goalId: sourceGoals[idx]?.goalId || sourceGoals[idx]?.id || crypto.randomUUID(),
                assessment: (r.conclusion?.toLowerCase().includes('insufficient') ? 'insufficient' : 'sufficient') as 'sufficient' | 'insufficient',
                reflectionText: r.summary || ''
              }]
            };
            dailySessionApi.saveDailyRecord(reflectionPayload).then(() => {
              window.dispatchEvent(new Event('goalSaved'));
            }).catch(console.error);
          });

          // If revisions are generated alongside reflections, send them incrementally too
          if (Array.isArray(parsed.revisions)) {
            parsed.revisions.forEach((rev: any, idx: number) => {
              const revisionPayload = {
                email: localStorage.getItem('studentEmail') || '',
                date: todayStr,
                revisions: [{
                  topic: rev.topic || '',
                  sourceGoalId: rev.sourceGoalId || sourceGoals[idx]?.goalId || sourceGoals[idx]?.id || crypto.randomUUID(),
                  reason: rev.reason || ''
                }]
              };
              dailySessionApi.saveDailyRecord(revisionPayload).then(() => {
                window.dispatchEvent(new Event('goalSaved'));
              }).catch(console.error);
            });
          }
        }
        // -------------------------------

        result = {
          summary: parsed.summary || '',
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          conclusion: parsed.conclusion || '',
          totalQuestions: session.qaHistory.length,
          correctAnswers: Math.round(session.qaHistory.length * 0.6),
          elapsedTime: (session.interviewTime * 60) - timeRemainingRef.current,
          topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths : [],
          improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : [],
          topicsToStudy: Array.isArray(parsed.topicsToStudy) ? parsed.topicsToStudy : undefined,
        };
      } catch {
        // Fallback: build a minimal topicsToStudy from parkedTopics directly
        // so the candidate still gets value if the LLM call fails.
        const fallbackTopics = (session.parkedTopics || []).map((t) => ({
          name: t,
          description: `Brush up on ${t} — reviewing this will help you give a stronger answer next time.`,
        }));
        result = {
          summary: rollingSummaryRef.current || 'Interview completed.',
          score: 0,
          conclusion: 'Thank you for completing the interview.',
          totalQuestions: session.qaHistory.length,
          correctAnswers: 0,
          elapsedTime: (session.interviewTime * 60) - timeRemainingRef.current,
          topStrengths: [],
          improvementAreas: [],
          topicsToStudy: fallbackTopics.length > 0 ? fallbackTopics : undefined,
        };
      }

      session.result = result;
      saveInterviewResult(session.sessionId, result);
      saveInterviewSessionBySessionId(session);
    } catch (error) {
      console.error('Error generating interview results:', error);
      saveInterviewSessionBySessionId(session);
    } finally {
      // Flip the generating flag back so Results.tsx stops waiting and either
      // renders the result (success path) or falls through to its fallback
      // state (catch path).
      resultGenerationStatus.setComplete(session.sessionId);
    }

    onCompleteRef.current(session);
  }, []);

  // Keep endInterviewRef in sync
  useEffect(() => { endInterviewRef.current = endInterview; }, [endInterview]);

  // ── Time up handler (uses ref to avoid stale closures in timer) ────────────

  const handleTimeUp = useCallback(async () => {
    if (isCompletedRef.current) return;
    try {
      // Diagnostic log to help verify the timer hit zero and path executed
      // in the user's environment. Remove after verification.
      // eslint-disable-next-line no-console
      console.debug('[timer] handleTimeUp triggered, timeRemaining=', timeRemainingRef.current);
    } catch (e) {
      // ignore logging failures
    }
    await endInterviewRef.current();
  }, []);

  // Defensive: if remainingTime state becomes exactly 0 for any reason,
  // ensure the time-up flow is executed. This guards against any interval
  // scheduling edge where the interval tick might be missed.
  useEffect(() => {
    if (remainingTime === 0) {
      try {
        // eslint-disable-next-line no-console
        console.log('[timer] remainingTime reached 0 in state, calling handleTimeUp');
      } catch (e) {}
      void handleTimeUp();
    }
  }, [remainingTime, handleTimeUp]);

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
      let framework: SkillsFramework;

      if (cfg.mode === 'goal-setting' || cfg.mode === 'reflection') {
        let contextGoals = 'No previous goals found.';
        if (cfg.mode === 'reflection') {
          try {
            const todayStr = new Date().toISOString().split('T')[0];
            const todaySession = await dailySessionApi.getDailyRecord(todayStr);
            if (todaySession && todaySession.goals && todaySession.goals.length > 0) {
              contextGoals = JSON.stringify(todaySession.goals, null, 2);
            }
          } catch (e) {
            console.error('Error fetching today goals for reflection', e);
          }
        }
        
        framework = {
          role: cfg.jobTitle,
          must_have_skills: [{ skill: contextGoals, weight: 1, evaluation_approach: 'Direct' }],
          nice_to_have_skills: [],
          behavioral_competencies: [],
          red_flags_to_probe: [],
          interview_focus_areas: [contextGoals],
          suggested_question_sequence: [],
        } as any; // Cast as any because we are overloading the SkillsFramework to just pass a string payload
      } else {
        const jd = buildJDText(cfg);
        const extractMsgs = buildExtractionMessages(jd);
        const rawFramework = await chatCompletion(extractMsgs);
        const cleanedFramework = rawFramework.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

        try {
          framework = JSON.parse(cleanedFramework);
        } catch {
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
      }
      frameworkRef.current = framework;

      // Generate opening question (non-streaming)
      const openingMsgs = buildOpeningMessages(
        framework,
        configRef.current?.mode ?? 'practice',
        configRef.current?.mentorProfile,
      );
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
    // Log IMMEDIATELY before any guards to see if this runs at all
    try {
      // eslint-disable-next-line no-console
      console.log('[timer] useEffect ENTRY - checking conditions:', {
        hasConfig: !!config,
        readyToStart,
        timerActive: !!timerRef.current,
        configValue: config ? { userId: config.userId, jobTitle: config.jobTitle, interviewTime: config.interviewTime } : null
      });
    } catch (e) {}

    // Check each guard condition separately and log which one blocks
    if (!config) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[timer] BLOCKED: config is null/undefined');
      } catch (e) {}
      return;
    }
    if (!readyToStart) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[timer] BLOCKED: readyToStart is false');
      } catch (e) {}
      return;
    }
    if (timerRef.current) {
      try {
        // eslint-disable-next-line no-console
        console.warn('[timer] BLOCKED: timer is already active');
      } catch (e) {}
      return;
    }

    // If we get here, all guards passed - proceed with initialization
    try {
      // eslint-disable-next-line no-console
      console.log('[timer] PROCEEDING with initialization - all guards passed');
    } catch (e) {}

    const newSessionId = initialSessionId || crypto.randomUUID();
    setSessionId(newSessionId);

    const totalSeconds = config.interviewTime * 60;
    timeRemainingRef.current = totalSeconds;
    setRemainingTime(totalSeconds);

    // Create session
    const session = createInitialSession(config, newSessionId);
    sessionRef.current = session;

    // Start countdown
    // Diagnostic: log timer start
    // try {
    //   // eslint-disable-next-line no-console
    //   console.debug('[timer] started, startSeconds=', startSeconds);
    // } catch (e) {}

    timerRef.current = setInterval(() => {
      if (isCompletedRef.current) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      if (timeRemainingRef.current <= 1) {
        timeRemainingRef.current = 0;
        setRemainingTime(0);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        try {
          // eslint-disable-next-line no-console
          console.debug('[timer] reached 0 in interval, calling handleTimeUp');
        } catch (e) {}
        void handleTimeUp();
        return;
      }

      timeRemainingRef.current -= 1;
      // Only log the final few seconds to avoid noise
      if (timeRemainingRef.current <= 6) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[timer] tick, remaining=', timeRemainingRef.current);
        } catch (e) {}
      }
      setRemainingTime(timeRemainingRef.current);
    }, 1000);

    // Guard initial question bootstrap so Strict Mode double-invoke
    // doesn't generate/send the opening prompt twice.
    if (!hasStartedInterviewRef.current) {
      hasStartedInterviewRef.current = true;
      void startInterview(config, newSessionId);
    }

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
        console.log('[ScreenShare] Building msgs with:', {
          ocrEnabled: configRef.current?.ocrEnabled,
          isScreenSharing: isScreenSharingRef.current,
          askCount: screenShareAskCountRef.current,
          firstTurnUsed: screenShareFirstTurnUsedRef.current,
        });

        const isFirstScreenShareTurn = Boolean(
          configRef.current?.ocrEnabled &&
          isScreenSharingRef.current &&
          !screenShareFirstTurnUsedRef.current
        );

        const msgs = buildInterviewerMessages(
          framework,
          rollingSummaryRef.current,
          recent,
          answer,
          timeRemainingRef.current,
          (sessionRef.current?.interviewTime ?? 10) * 60,
          configRef.current?.mode ?? 'practice',
          configRef.current?.mentorProfile,
          screenCodeRef.current,
          configRef.current?.ocrEnabled,
          isScreenSharingRef.current,
          screenShareAskCountRef.current,
          isFirstScreenShareTurn,
        );

        let fullResponse = '';
        const questionId = `q_${Date.now()}`;

        // Streaming-safe marker stripper: holds back any [...] segment that
        // arrives split across chunks until we can decide to drop or pass it.
        // Used for chunks fed to onStreamChunk (caption + TTS pipelines).
        const stripper = makeMarkerStripper();

        for await (const chunk of chatCompletionStream(msgs)) {
          fullResponse += chunk;
          const displayChunk = stripper.push(chunk);
          if (displayChunk && onStreamChunkRef.current) onStreamChunkRef.current(displayChunk);

          // Message bubble update — operates on the accumulated fullResponse
          // so it always renders the cleanly-stripped current text.
          setMessages(prev => {
            const displayText = stripAllMarkers(fullResponse).trim();
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

        // Flush any pending text from the stripper buffer (e.g. an incomplete
        // bracket the model never closed — strip it as a precaution then emit)
        const tail = stripper.flush();
        if (tail && onStreamChunkRef.current) onStreamChunkRef.current(tail);

        if (onStreamCompleteRef.current) onStreamCompleteRef.current();

        if (isFirstScreenShareTurn) {
          screenShareFirstTurnUsedRef.current = true;
        }

        // Capture parked topics from the raw response BEFORE stripping
        if (sessionRef.current) {
          const parked = extractParkedTopics(fullResponse);
          if (parked.length > 0) {
            sessionRef.current.parkedTopics = [
              ...(sessionRef.current.parkedTopics || []),
              ...parked,
            ];
          }
        }

        const hasEndToken = /\[INTERVIEW_OVER\]/i.test(fullResponse);
        // Robust token matching that handles potential LLM variations
        const hasRequestShareToken = /\[\s*REQUEST[_\s-]*SCREEN[_\s-]*SHARE\s*\]/i.test(fullResponse) ||
          /REQUEST[_\s-]*SCREEN[_\s-]*SHARE/i.test(fullResponse);

        const cleanedResponse = stripAllMarkers(fullResponse).trim();

        // If LLM requested screen share, fire the callback (UI shows modal).
        // Allow up to 2 asks per session — counter is managed here.
        if (hasRequestShareToken && screenShareAskCountRef.current < 2) {
          screenShareAskCountRef.current += 1;
          onRequestScreenShareRef.current?.();
        }

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

        const limitReached = configRef.current?.turnLimit && turnCountRef.current >= configRef.current.turnLimit;

        if (hasEndToken || limitReached) {
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
