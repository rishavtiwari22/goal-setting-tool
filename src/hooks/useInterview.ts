import { useState, useRef, useCallback, useEffect } from 'react';
import type { InterviewConfig } from '../services/interview/interviewEngine';
import { InterviewStateManager } from '../services/interview/interviewStateManager';
import type { InterviewSession } from '../models/interview';
import { saveInterviewResult, loadInterviewSessionBySessionId } from '../services/storage/interviewStorage';

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
}

export function useInterview({ config, sessionId, onComplete }: UseInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const managerRef = useRef<InterviewStateManager | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompletedRef = useRef(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    if (config && !managerRef.current) {
      managerRef.current = new InterviewStateManager(config, sessionId);
      const session = managerRef.current.getSession();
      setRemainingTime(session.remainingTime);

      const existingSession = sessionId ? loadInterviewSessionBySessionId(sessionId) : null;
      if (existingSession && existingSession.status === 'ongoing') {
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
      try {
        const result = await managerRef.current.manageInterviewState('end');
        const session = managerRef.current.getSession();
        if (session.result) {
          saveInterviewResult(session.sessionId, session.result);
        }
        onComplete(session);
      } catch (error) {
        console.error('Error ending interview:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onComplete]);

  const startInterview = useCallback(async () => {
    if (!managerRef.current || isCompletedRef.current) return;

    setIsLoading(true);
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
        },
      });

      setCurrentQuestion(result.question);

      if (result.question.includes('【Interview ended')) {
        await handleTimeUp();
      }
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleTimeUp]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!managerRef.current || !currentQuestion || isCompletedRef.current || isLoading) {
        return;
      }

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
          },
        });

        if (result.decision.decision === 'end') {
          isCompletedRef.current = true;
          setIsCompleted(true);
          const endResult = await managerRef.current.manageInterviewState('end');
          const session = managerRef.current.getSession();
          if (session.result) {
            saveInterviewResult(session.sessionId, session.result);
          }
          onComplete(session);
        } else if (result.nextQuestion) {
          if (result.nextQuestion.includes('【Interview ended')) {
            await handleTimeUp();
          }
        }
      } catch (error) {
        console.error('Error processing answer:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentQuestion, isLoading, onComplete, handleTimeUp]
  );

  return {
    messages,
    isLoading,
    isCompleted,
    remainingTime,
    submitAnswer,
    currentQuestion,
  };
}
