import React, { useState, useEffect } from "react";
import SelectionCard from "@/components/SelectionCard";

interface Job {
  job_id: string;
  job_title: string;
  job_description: string;
  technical_skills?: string[];
  soft_skills?: string[];
}

interface JobSelectionProps {
  jobs: Job[];
  onJobSelect?: (jobId: string | null) => void;
  selectedJobId?: string | null;
  showAll?: boolean;
}

export default function JobSelection({
  jobs,
  onJobSelect,
  selectedJobId,
  showAll = false,
}: JobSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(
    selectedJobId || null
  );

  useEffect(() => {
    setSelectedRole(selectedJobId || null);
  }, [selectedJobId]);

  const handleCardClick = (jobId: string) => {
    setSelectedRole(jobId);
    if (onJobSelect) {
      onJobSelect(jobId);
    }
  };

  const displayedJobs = showAll ? jobs : jobs.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
      {displayedJobs.map((role) => (
        <SelectionCard
          key={role.job_id}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={role.job_title}
          description={role.job_description}
          estimatedTime="5-10 mins"
          isSelected={selectedRole === role.job_id}
          onClick={() => handleCardClick(role.job_id)}
        />
      ))}
    </div>
  );
}
