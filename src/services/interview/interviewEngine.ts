export type InterviewMode = 'practice' | 'mentor';
export type MentorProfile = 'communication' | 'socratic';

export interface InterviewConfig {
  userId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  interviewTime: number;
  language: string;
  difficulty: string;
  examinationPoints: string[];
  mode: InterviewMode;
  mentorProfile?: MentorProfile;
  ocrEnabled?: boolean;
}
