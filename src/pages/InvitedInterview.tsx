import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { validateInvitationToken } from "../services/api/invitationApi";
import type { InterviewConfig } from "../services/interview/interviewEngine";

export default function InvitedInterview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeInvitedInterview = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        toast.error("No invitation token found");
        navigate("/");
        return;
      }

      try {
        setIsLoading(true);
        const invitationData = await validateInvitationToken(token);

        if (!invitationData) {
          toast.error("Invalid or expired invitation token");
          navigate("/");
          return;
        }

        localStorage.setItem("studentToken", invitationData.user_token);
        localStorage.setItem("studentEmail", invitationData.email);

        const interviewConfig: InterviewConfig = {
          userId: invitationData.email,
          jobId: invitationData.job_id,
          jobTitle: invitationData.job_title,
          jobDescription: invitationData.job_description,
          interviewTime: invitationData.interview_time,
          language: "English",
          difficulty: "medium",
          examinationPoints: [
            ...invitationData.technical_skills,
            ...invitationData.soft_skills,
          ],
          mode: 'practice',
        };

        sessionStorage.setItem("interviewConfig", JSON.stringify(interviewConfig));
        sessionStorage.setItem("isInvited", "true");
        sessionStorage.setItem("invitationId", invitationData.invitation_id);

        navigate("/interview");
      } catch (error) {
        console.error("Error initializing invited interview:", error);
        toast.error((error as Error).message || "Failed to initialize interview");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    initializeInvitedInterview();
  }, [navigate, searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return null;
}

