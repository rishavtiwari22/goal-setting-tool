import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TestResults } from '../components/results/TestResults';
import type { InterviewSession } from '../models/interview';

export default function Results() {
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);

  useEffect(() => {
    const sessionStr = sessionStorage.getItem('interviewSession');
    if (!sessionStr) {
      toast.error('No interview session found');
      navigate('/selfapply');
      return;
    }

    try {
      const interviewSession = JSON.parse(sessionStr) as InterviewSession;
      setSession(interviewSession);
    } catch (error) {
      console.error('Error parsing interview session:', error);
      toast.error('Invalid interview session data');
      navigate('/selfapply');
    }
  }, [navigate]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const testResult = {
    id: session.sessionId,
    test_id: session.sessionId,
    user_id: session.userId,
    summary: session.result?.summary || session.summary || "Interview completed successfully.",
    score: session.result?.score || 0,
    question_number: session.result?.totalQuestions || session.qaHistory.length,
    correct_number: session.result?.correctAnswers || 0,
    elapse_time: session.result?.elapsedTime || 0,
    qa_history: session.qaHistory.map((qa) => ({
      question: qa.question,
      answer: qa.answer,
      summary: "",
    })),
    created_at: session.startTime,
    updated_at: session.endTime || new Date().toISOString(),
  };

  return <TestResults testResult={testResult} />;
}
