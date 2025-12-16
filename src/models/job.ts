export interface Job {
  job_id: string;
  job_title: string;
  job_description: string;
  technical_skills: string[];
  soft_skills: string[];
  is_public?: boolean;
}
