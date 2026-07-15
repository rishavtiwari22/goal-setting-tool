import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { TestResults } from "../components/results/TestResults";
import { InterviewFeedback } from "../components/feedback/InterviewFeedback";
import type { InterviewSession } from "../models/interview";
import { createUserFeedbackDocument } from "../services/storage/firebaseStorage";
import { loadInterviewSessionBySessionId } from "../services/storage/interviewStorage";
import { resultGenerationStatus } from "../services/resultGenerationStatus";

export default function Results() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingResult, setIsGeneratingResult] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);

  const isInvited = typeof window !== 'undefined' ? sessionStorage.getItem("isInvited") === "true" : false;
  const invitationId = typeof window !== 'undefined' ? sessionStorage.getItem("invitationId") : null;

  useEffect(() => {
    const loadSessionAndUserName = async () => {
      setIsLoading(true);
      
      let interviewSession: InterviewSession | null = null;

      const sessionStr = sessionStorage.getItem("interviewSession");
      if (sessionStr) {
        try {
          interviewSession = JSON.parse(sessionStr) as InterviewSession;
        } catch (error) {
          console.error("Error parsing session from sessionStorage:", error);
        }
      }

      if (sessionId) {
        const localStorageSession = loadInterviewSessionBySessionId(sessionId);
        if (localStorageSession) {
          if (interviewSession) {
            interviewSession = {
              ...localStorageSession,
              ...interviewSession,
              result: localStorageSession.result || interviewSession.result,
            };
          } else {
            interviewSession = localStorageSession;
          }
        }
      }

      if (!interviewSession) {
        toast.error("No interview session found");
        navigate("/selfapply");
        setIsLoading(false);
        return;
      }

      if (interviewSession) {
        sessionStorage.setItem("interviewSession", JSON.stringify(interviewSession));
      }

      setSession(interviewSession);

      const storedUserName = localStorage.getItem("userName");
      if (storedUserName) {
        setUserName(storedUserName);
      }

      setIsLoading(false);

    };

    loadSessionAndUserName();
  }, [navigate, sessionId]);

  useEffect(() => {
    let effectiveSessionId = sessionId;
    
    if (!effectiveSessionId && session) {
      effectiveSessionId = session.sessionId;
      console.log('[Results] No sessionId in URL, using sessionId from session state:', effectiveSessionId);
    }
    
    if (!effectiveSessionId) {
      const sessionStr = sessionStorage.getItem("interviewSession");
      if (sessionStr) {
        try {
          const parsedSession = JSON.parse(sessionStr) as InterviewSession;
          effectiveSessionId = parsedSession.sessionId;
          console.log('[Results] No sessionId in URL, using sessionId from sessionStorage:', effectiveSessionId);
        } catch (error) {
          console.error('[Results] Failed to parse session from sessionStorage:', error);
        }
      }
    }
    
    if (!effectiveSessionId) {
      console.log('[Results] No sessionId available, skipping status check');
      return;
    }

    console.log('[Results] Setting up status check for sessionId:', effectiveSessionId);

    const checkStatus = () => {
      console.log('[Results] checkStatus called for sessionId:', effectiveSessionId);
      const generating = resultGenerationStatus.isCurrentlyGenerating(effectiveSessionId);
      console.log('[Results] Is generating:', generating);
      setIsGeneratingResult(generating);

      if (!generating) {
        console.log('[Results] Not generating, checking localStorage for result');
        const sessionWithResult = loadInterviewSessionBySessionId(effectiveSessionId);
        console.log('[Results] Loaded session from localStorage:', {
          hasSession: !!sessionWithResult,
          hasResult: !!sessionWithResult?.result,
          resultKeys: sessionWithResult?.result ? Object.keys(sessionWithResult.result) : []
        });
        
        if (sessionWithResult?.result) {
          console.log('[Results] Found result in localStorage, updating session state');
          setSession((prevSession) => {
            if (prevSession && !prevSession.result) {
              console.log('[Results] Updating session with result');
              const updatedSession: InterviewSession = {
                ...prevSession,
                result: sessionWithResult.result,
              };
              sessionStorage.setItem("interviewSession", JSON.stringify(updatedSession));
              return updatedSession;
            }
            console.log('[Results] Session already has result or no prevSession');
            return prevSession;
          });
        } else {
          console.log('[Results] No result found and generation is complete. Marking as failed.');
          setGenerationFailed(true);
        }
      }
    };

    checkStatus();
    
    console.log('[Results] Subscribing to resultGenerationStatus');
    const unsubscribe = resultGenerationStatus.subscribe((isGenerating, currentSessionId) => {
      console.log('[Results] Subscription callback:', { isGenerating, currentSessionId, effectiveSessionId });
      if (currentSessionId === effectiveSessionId) {
        console.log('[Results] Status update matches sessionId, updating state');
        setIsGeneratingResult(isGenerating);
        if (!isGenerating) {
          console.log('[Results] Generation complete, checking for result');
          checkStatus();
        }
      }
    });

    return () => {
      console.log('[Results] Cleaning up subscription');
      unsubscribe();
    };
  }, [sessionId, session]);

  useEffect(() => {
    if (isInvited && invitationId && session?.result) {
      const updateInvitationStatus = async () => {
        try {
          const { updateInvitationStatus: updateStatus } = await import("../services/api/invitationApi");
          await updateStatus(invitationId, "completed");
          sessionStorage.removeItem("isInvited");
          sessionStorage.removeItem("invitationId");
        } catch (error) {
          console.error("Failed to update invitation status:", error);
        }
      };
      updateInvitationStatus();
    }
  }, [isInvited, invitationId, session?.result]);

  const handleFeedbackSubmit = async (feedback: {
    questionRelevance: number;
    referralLikelihood: number;
  }) => {
    if (!session) return;

    const latestSession = sessionId 
      ? loadInterviewSessionBySessionId(sessionId)
      : null;
    
    const sessionToUpdate = latestSession || session;

    const updatedSession: InterviewSession = {
      ...sessionToUpdate,
      userFeedback: {
        questionRelevance: feedback.questionRelevance,
        referralLikelihood: feedback.referralLikelihood,
        submittedAt: new Date().toISOString(),
      },
    };

    sessionStorage.setItem("interviewSession", JSON.stringify(updatedSession));
    setSession(updatedSession);

    const email = localStorage.getItem("studentEmail") || sessionToUpdate.userId;
    if (email) {
      try {
        await createUserFeedbackDocument(
          email,
          sessionToUpdate.sessionId,
          feedback.questionRelevance,
          feedback.referralLikelihood
        );
      } catch (error) {
        console.error("Failed to save feedback to Firebase:", error);
      }
    }

    if (!updatedSession.result && sessionId) {
      const checkForResult = () => {
        if (!resultGenerationStatus.isCurrentlyGenerating(sessionId)) {
          const sessionWithResult = loadInterviewSessionBySessionId(sessionId);
          if (sessionWithResult?.result) {
            const finalSession: InterviewSession = {
              ...updatedSession,
              result: sessionWithResult.result,
            };
            sessionStorage.setItem("interviewSession", JSON.stringify(finalSession));
            setSession(finalSession);
          }
        }
      };
      
      checkForResult();
      
      const unsubscribe = resultGenerationStatus.subscribe((isGenerating, currentSessionId) => {
        if (currentSessionId === sessionId && !isGenerating) {
          checkForResult();
          unsubscribe();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>No session found</div>
      </div>
    );
  }

  if (!session.userFeedback && !isInvited) {
    return <InterviewFeedback onSubmit={handleFeedbackSubmit} />;
  }

  if (isInvited && !session.result) {
    if (isGeneratingResult) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div>
            {session?.config?.mode === 'goal-setting' ? 'Shaping your daily goal...' :
             session?.config?.mode === 'reflection' ? 'Reflecting on what you shared...' :
             'Generating results...'}
          </div>
        </div>
      );
    }
    
    if (generationFailed) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-400 max-w-md">
            We couldn't generate the final summary for your session. The AI might have encountered an error while processing your conversation.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>
          {session?.config?.mode === 'goal-setting' ? 'Finalizing your goal...' :
           session?.config?.mode === 'reflection' ? 'Preparing your reflection summary...' :
           'Waiting for results...'}
        </div>
      </div>
    );
  }

  if (isInvited && session.result) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          <p className="text-lg mb-8">
            Thanks for the interview our team you will be updated on the next steps.
          </p>
        </div>
      </div>
    );
  }

  if (!session.result && isGeneratingResult) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>
          {session?.config?.mode === 'goal-setting' ? 'Shaping your daily goal...' :
           session?.config?.mode === 'reflection' ? 'Reflecting on what you shared...' :
           'Generating results...'}
        </div>
      </div>
    );
  }
  
  if (!session.result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Waiting for results...</div>
      </div>
    );
  }

  const testResult = {
    id: session.sessionId,
    test_id: session.sessionId,
    user_id: session.userId,
    summary:
      session.result?.summary ||
      session.summary ||
      "Interview completed successfully.",
    score: session.result?.score || 0,
    question_number: session.result?.totalQuestions || session.qaHistory.length,
    correct_number: session.result?.correctAnswers || 0,
    elapse_time: session.result?.elapsedTime || 0,
    qa_history: session.qaHistory.map((qa) => ({
      question: qa.question,
      answer: qa.answer,
      summary: "",
    })),
    topStrengths: session.result?.topStrengths || [],
    improvementAreas: session.result?.improvementAreas || [],
    topicsToStudy: session.result?.topicsToStudy || [],
    mode: session.mode,
    created_at: session.startTime,
    updated_at: session.endTime || new Date().toISOString(),
  };

  return <TestResults testResult={testResult} userName={userName} />;
}
