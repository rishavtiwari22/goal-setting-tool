import { useState, useRef, useCallback, useEffect } from 'react';
import type { InterviewConfig } from '../services/interview/interviewEngine';
import { InterviewStateManager } from '../services/interview/interviewStateManager';
import type { InterviewSession } from '../models/interview';
import { saveInterviewResult, loadInterviewSessionBySessionId } from '../services/storage/interviewStorage';
import { 
  trackInterviewStart, 
  trackInterviewComplete, 
  trackInterviewAbandon,
  trackUserEngagement,
  trackInterviewEngagement
} from '../services/analytics';

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
}

export function useInterview({
  config,
  sessionId,
  onComplete,
  onStreamChunk,
  onStreamComplete,
  onFeedback
}: UseInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const managerRef = useRef<InterviewStateManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompletedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const interviewStartTime = useRef<number>(Date.now());
  const questionStartTime = useRef<number>(Date.now());
  const totalInteractions = useRef<number>(0);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    if (config && !managerRef.current) {
      managerRef.current = new InterviewStateManager(config, sessionId);
      const session = managerRef.current.getSession();
      setRemainingTime(session.remainingTime);

      const existingSession = sessionId ? loadInterviewSessionBySessionId(sessionId) : null;

      // Allow loading both ongoing and completed sessions
      if (existingSession && (existingSession.status === 'ongoing' || existingSession.status === 'completed')) {
        // If session is already completed, update state immediately
        if (existingSession.status === 'completed') {
          setIsCompleted(true);
          isCompletedRef.current = true;
          // Optionally notify parent immediately, though UI might just use isCompleted
        }

        const restoredMessages: Message[] = [];
        existingSession.qaHistory.forEach((qa, index) => {
          restoredMessages.push({
            id: `q_${index}`,
            role: 'assistant' as const,
            content: qa.question,
            timestamp: qa.timestamp,
          });
          restoredMessages.push({
            id: `a_${index}`,
            role: 'user' as const,
            content: qa.answer,
            timestamp: qa.timestamp,
          });
        });
        if (restoredMessages.length > 0) {
          setMessages(restoredMessages);
          const lastQuestion = existingSession.qaHistory[existingSession.qaHistory.length - 1]?.question;
          if (lastQuestion) {
            setCurrentQuestion(lastQuestion);
          }
        }
      }

      timerRef.current = setInterval(() => {
        if (managerRef.current && !isCompletedRef.current) {
          const time = managerRef.current.getRemainingTime();
          setRemainingTime(time);
          if (time <= 0) {
            handleTimeUp();
          }
        }
      }, 1000);

      if (!hasStartedRef.current && (!existingSession || existingSession.qaHistory.length === 0)) {
        hasStartedRef.current = true;
        startInterview();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (managerRef.current) {
        managerRef.current.cleanup();
      }
    };
  }, [config, sessionId]);

  const handleTimeUp = useCallback(async () => {
    if (managerRef.current && !isCompletedRef.current) {
      isCompletedRef.current = true;
      setIsCompleted(true);
      setIsLoading(true);
      
      const session = managerRef.current.getSession();
      const interviewDuration = Date.now() - interviewStartTime.current;
      
      // Track interview abandonment due to timeout
      trackInterviewAbandon(session.sessionId, 'timeout');
      trackUserEngagement('interview_timeout', {
        session_id: session.sessionId,
        duration_ms: interviewDuration,
        questions_answered: totalInteractions.current,
        job_title: session.jobTitle
      });
      
      try {
        const result = await managerRef.current.manageInterviewState('end');
        if (session.result) {
          saveInterviewResult(session.sessionId, session.result);
        }
        onComplete(session);
      } catch (error) {
        console.error('Error ending interview:', error);
        onComplete(session);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onComplete]);

  const startInterview = useCallback(async () => {
    if (!managerRef.current || isCompletedRef.current) return;

    setIsLoading(true);
    interviewStartTime.current = Date.now();
    questionStartTime.current = Date.now();
    
    const session = managerRef.current.getSession();
    
    // Track interview start
    trackInterviewStart(session.sessionId, session.jobTitle);
    trackUserEngagement('interview_started', {
      session_id: session.sessionId,
      job_title: session.jobTitle,
      difficulty: session.difficulty,
      language: session.language
    });
    
    try {
      const questionId = `q_${Date.now()}`;
      setCurrentQuestion('');

      let fullQuestion = '';

      const result = await managerRef.current.manageInterviewState('kickoff', {
        onChunk: (chunk: string) => {
          fullQuestion += chunk;
          setCurrentQuestion(fullQuestion);

          setMessages((prev) => {
            const existing = prev.find((m) => m.id === questionId);
            if (existing) {
              return prev.map((m) =>
                m.id === questionId ? { ...m, content: fullQuestion } : m
              );
            }
            return [
              ...prev,
              {
                id: questionId,
                role: 'assistant' as const,
                content: fullQuestion,
                timestamp: new Date().toISOString(),
              },
            ];
          });

          // Send chunk to TTS
          if (onStreamChunk) {
            onStreamChunk(chunk);
          }
        },
      });

      setCurrentQuestion(result.question);
      
      // Track first question engagement
      trackInterviewEngagement('first_question_presented', session.sessionId, {
        question_length: result.question.length,
        stage: 'introduction'
      });

      // Signal streaming complete
      if (onStreamComplete) {
        onStreamComplete();
      }

      if (result.question.includes('【Interview ended')) {
        await handleTimeUp();
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      trackUserEngagement('interview_error', {
        session_id: session.sessionId,
        error_type: 'start_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleTimeUp, onStreamChunk, onStreamComplete]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!managerRef.current || !currentQuestion || isCompletedRef.current || isLoading) {
        return;
      }

      const session = managerRef.current.getSession();
      const questionResponseTime = Date.now() - questionStartTime.current;
      totalInteractions.current += 1;
      
      // Track answer submission engagement
      trackInterviewEngagement('answer_submitted', session.sessionId, {
        question_number: totalInteractions.current,
        response_time_ms: questionResponseTime,
        answer_length: answer.length,
        stage: totalInteractions.current <= 3 ? 'introduction' : 'technical'
      });

      const answerId = `a_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: answerId,
          role: 'user' as const,
          content: answer,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsLoading(true);
      questionStartTime.current = Date.now(); // Reset for next question

      try {
        const questionId = `q_${Date.now()}`;
        let accumulatedQuestion = '';

        const result = await managerRef.current.manageInterviewState('processAnswer', {
          answer,
          question: currentQuestion,
          onChunk: (chunk: string) => {
            accumulatedQuestion += chunk;
            setCurrentQuestion(accumulatedQuestion);
            setMessages((prevMessages) => {
              const existing = prevMessages.find((m) => m.id === questionId);
              if (existing) {
                return prevMessages.map((m) =>
                  m.id === questionId ? { ...m, content: accumulatedQuestion } : m
                );
              }
              return [
                ...prevMessages,
                {
                  id: questionId,
                  role: 'assistant' as const,
                  content: accumulatedQuestion,
                  timestamp: new Date().toISOString(),
                },
              ];
            });

            // Send chunk to TTS
            if (onStreamChunk) {
              onStreamChunk(chunk);
            }
          },
        });

        // Track question generation engagement
        trackInterviewEngagement('question_generated', session.sessionId, {
          question_number: totalInteractions.current + 1,
          question_length: accumulatedQuestion.length,
          has_feedback: !!result.decision?.feedback
        });

        // Send feedback to TTS if present
        if (result.decision?.feedback && result.decision.feedback.trim() && onFeedback) {
          onFeedback(result.decision.feedback);
        }

        // Signal streaming complete
        if (onStreamComplete) {
          onStreamComplete();
        }

        if (result.decision.decision === 'end') {
          const interviewDuration = Date.now() - interviewStartTime.current;
          
          // Track interview completion
          trackInterviewComplete(session.sessionId, interviewDuration);
          trackUserEngagement('interview_completed', {
            session_id: session.sessionId,
            duration_ms: interviewDuration,
            questions_answered: totalInteractions.current,
            job_title: session.jobTitle,
            completion_reason: 'natural_end'
          });

          // Add thank you/feedback message to the chat
          const feedbackMessage = result.decision?.feedback?.trim() || 'Thank you for the interview! We are now generating your results.';
          const feedbackMsgId = `feedback_${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: feedbackMsgId,
              role: 'assistant' as const,
              content: feedbackMessage,
              timestamp: new Date().toISOString(),
            },
          ]);

          isCompletedRef.current = true;
          setIsCompleted(true);

          try {
            const endResult = await managerRef.current.manageInterviewState('end');
            if (session.result) {
              saveInterviewResult(session.sessionId, session.result);
            }
            onComplete(session);
          } catch (endError) {
            console.error('Error generating summary:', endError);
            trackUserEngagement('interview_error', {
              session_id: session.sessionId,
              error_type: 'summary_generation_failed',
              error_message: endError instanceof Error ? endError.message : 'Unknown error'
            });
            onComplete(session);
          }
        } else if (result.nextQuestion) {
          if (result.nextQuestion.includes('【Interview ended')) {
            await handleTimeUp();
          }
        }
      } catch (error) {
        console.error('Error processing answer:', error);
        trackUserEngagement('interview_error', {
          session_id: session.sessionId,
          error_type: 'answer_processing_failed',
          question_number: totalInteractions.current,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentQuestion, isLoading, onComplete, handleTimeUp, onStreamChunk, onStreamComplete, onFeedback]
  );

  return {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
    currentQuestion,
    sessionId: managerRef.current?.getSession().sessionId || sessionId,
  };
}