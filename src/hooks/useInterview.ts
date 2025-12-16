import { useState, useRef, useCallback, useEffect } from 'react';
import type { InterviewConfig } from '../services/interview/interviewEngine';
import { InterviewEngine } from '../services/interview/interviewEngine';
import type { InterviewSession } from '../models/interview';
import { saveInterviewResult } from '../services/storage/interviewStorage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface UseInterviewProps {
  config: InterviewConfig | null;
  onComplete: (session: InterviewSession) => void;
}

export function useInterview({ config, onComplete }: UseInterviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const engineRef = useRef<InterviewEngine | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompletedRef = useRef(false);
  const handleTimeUpRef = useRef<(() => Promise<void>) | null>(null);
  const startInterviewRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    if (config && !engineRef.current) {
      engineRef.current = new InterviewEngine(config);
      const session = engineRef.current.getSession();
      setRemainingTime(session.remainingTime);

      timerRef.current = setInterval(() => {
        if (engineRef.current && !isCompletedRef.current) {
          const time = engineRef.current.getRemainingTime();
          setRemainingTime(time);
          if (time <= 0 && handleTimeUpRef.current) {
            handleTimeUpRef.current();
          }
        }
      }, 1000);

      if (startInterviewRef.current) {
        startInterviewRef.current();
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [config]);

  const handleTimeUp = useCallback(async () => {
    if (engineRef.current && !isCompletedRef.current) {
      isCompletedRef.current = true;
      setIsCompleted(true);
      setIsLoading(true);
      try {
        await engineRef.current.finalizeInterview();
        const session = engineRef.current.getSession();
        if (session.result) {
          saveInterviewResult(session.sessionId, session.result);
        }
        onComplete(session);
      } catch (error) {
        console.error('Error finalizing interview:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onComplete]);

  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  const startInterview = useCallback(async () => {
    if (!engineRef.current || isCompletedRef.current) return;

    setIsLoading(true);
    try {
      const questionId = `q_${Date.now()}`;
      setCurrentQuestion('');

      let fullQuestion = '';

      await engineRef.current.generateNextQuestion((chunk: string) => {
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
      });

      setCurrentQuestion(fullQuestion);

      if (engineRef.current.isInterviewEnded(fullQuestion)) {
        if (handleTimeUpRef.current) {
          await handleTimeUpRef.current();
        }
      }
    } catch (error) {
      console.error('Error starting interview:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleTimeUp]);

  useEffect(() => {
    startInterviewRef.current = startInterview;
  }, [startInterview]);

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!engineRef.current || !currentQuestion || isCompletedRef.current || isLoading) {
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
        const analysis = await engineRef.current.processAnswer(answer, currentQuestion);

        if (analysis.feedback) {
          const feedbackId = `f_${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: feedbackId,
              role: 'assistant' as const,
              content: analysis.feedback,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        if (
          analysis.decision === 'END_INTERVIEW' ||
          engineRef.current.shouldEndInterview(analysis.decision)
        ) {
          isCompletedRef.current = true;
          setIsCompleted(true);
          await engineRef.current.finalizeInterview();
          const session = engineRef.current.getSession();
          if (session.result) {
            saveInterviewResult(session.sessionId, session.result);
          }
          onComplete(session);
        } else if (analysis.decision === 'MOVE_TO_NEXT') {
          if (startInterviewRef.current) {
            await startInterviewRef.current();
          }
        }
      } catch (error) {
        console.error('Error processing answer:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentQuestion, isLoading, startInterview, onComplete]
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
