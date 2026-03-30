export interface Skill {
  skill: string;
  weight: number;
  evaluation_approach: string;
}

export interface BehavioralCompetency {
  competency: string;
  example_question: string;
}

export interface SkillsFramework {
  role: string;
  must_have_skills: Skill[];
  nice_to_have_skills: Skill[];
  behavioral_competencies: BehavioralCompetency[];
  red_flags_to_probe: string[];
  interview_focus_areas: string[];
  suggested_question_sequence: string[];
}
