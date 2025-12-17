import { QAHistoryItem, InterviewPhase } from '../../models/interview';

function formatQAHistory(qaHistory: QAHistoryItem[]): string {
  if (qaHistory.length === 0) {
    return "None";
  }
  return qaHistory
    .map((qa, index) => {
      return `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`;
    })
    .join("\n\n");
}

function formatQASummary(qaHistory: QAHistoryItem[], useSummary: boolean, existingSummary?: string): string {
  if (useSummary && existingSummary) {
    return `Summary of previous Q&A:\n${existingSummary}\n\nMost recent Q&A:\nQ: ${qaHistory[qaHistory.length - 1]?.question || ''}\nA: ${qaHistory[qaHistory.length - 1]?.answer || ''}`;
  }

  if (qaHistory.length === 0) {
    return "No previous questions and answers.";
  }

  if (qaHistory.length <= 3) {
    return qaHistory
      .map((qa, index) => `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`)
      .join("\n\n");
  }

  return qaHistory
    .slice(-3)
    .map((qa, index) => `Q${qaHistory.length - 3 + index + 1}: ${qa.question}\nA${qaHistory.length - 3 + index + 1}: ${qa.answer}`)
    .join("\n\n");
}

export interface BuildDecisionPromptParams {
  question: string;
  answer: string;
}

export function buildDecisionPrompt(params: BuildDecisionPromptParams): { systemMessage: string; humanMessage: string } {
  const systemMessage = `You are a technical interviewer analyzing candidate responses. Make deterministic decisions about follow-up questions.

Decision Rules:
- If answer is gibberish, incoherent, or completely unclear → followup
- If answer provides ANY meaningful information → movenext
- If user wants to end interview → end
- If answer is too brief (1-2 words with no context) → followup
- DEFAULT: movenext

You must respond with ONLY valid JSON in this exact format:
{{
  "decision": "followup" | "movenext" | "end"
}}

No other text, no explanation, just the JSON object.`;

  const humanMessage = `Question: ${params.question}\nAnswer: ${params.answer}`;

  return { systemMessage, humanMessage };
}

const CREATE_QUESTION_FOLLOWUP_INTRO_SYSTEM = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up question to get more information.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Language: {language}
Remaining Time: {remaining_time} minutes

Ask a concise follow-up question that helps clarify the candidate's answer. Be specific and reference what they said.`;

const CREATE_QUESTION_FOLLOWUP_PROJECT_SYSTEM = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up question about their project experience.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Language: {language}
Remaining Time: {remaining_time} minutes

Ask a concise follow-up question that helps clarify the candidate's project experience. Be specific and reference what they said.`;

const CREATE_QUESTION_FOLLOWUP_TECHNICAL_SYSTEM = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up technical question.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes

Ask a concise follow-up technical question that helps clarify the candidate's understanding. Be specific and reference what they said.`;

const CREATE_QUESTION_MOVENEXT_INTRO_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes

Current Phase: Introduction

Phase Guidelines:
- Ask candidate to introduce themselves: name, background, years of experience
- This should be a warm, welcoming open-ended question
- Only ask this ONCE at the very beginning

Generate the next question following the interview flow. The question should be open-ended, conversational, and assess basic information. Do NOT include phase labels in the question.`;

const CREATE_QUESTION_MOVENEXT_PROJECT_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes

Current Phase: Project Discussion

Phase Guidelines:
- Ask about 1-2 recent projects they've worked on
- Focus on their role, technologies used, and challenges faced
- These should be open-ended questions

Generate the next question following the interview flow. The question should be open-ended, conversational, and assess project experience. Do NOT include phase labels in the question.`;

const CREATE_QUESTION_MOVENEXT_TECHNICAL_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes

Current Phase: Technical Discussion

Phase Guidelines:
- Ask 3-5 technical questions requiring explanations
- Questions should be open-ended and conversational
- Cover key concepts from {knowledge_points}
- Ask about their understanding, approach, and reasoning
- NO multiple choice - all questions should require explanations

Generate the next question following the interview flow. The question should be open-ended, conversational, and assess technical competency. Do NOT include phase labels in the question.`;

export interface BuildCreateQuestionPromptParams {
  jobTitle: string;
  jobDescription: string;
  knowledgePoints: string[];
  difficulty: string;
  language: string;
  remainingTime: number;
  currentPhase: InterviewPhase;
  decision: 'followup' | 'movenext';
  question?: string;
  answer?: string;
  qaHistory: QAHistoryItem[];
  summary?: string;
}

export function buildCreateQuestionPrompt(params: BuildCreateQuestionPromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const context = formatQASummary(params.qaHistory, useSummary, params.summary);

  let systemTemplate = '';

  if (params.decision === 'followup') {
    if (params.currentPhase === 'introduction') {
      systemTemplate = CREATE_QUESTION_FOLLOWUP_INTRO_SYSTEM;
    } else if (params.currentPhase === 'project') {
      systemTemplate = CREATE_QUESTION_FOLLOWUP_PROJECT_SYSTEM;
    } else {
      systemTemplate = CREATE_QUESTION_FOLLOWUP_TECHNICAL_SYSTEM;
    }
  } else {
    if (params.currentPhase === 'introduction') {
      systemTemplate = CREATE_QUESTION_MOVENEXT_INTRO_SYSTEM;
    } else if (params.currentPhase === 'project') {
      systemTemplate = CREATE_QUESTION_MOVENEXT_PROJECT_SYSTEM;
    } else {
      systemTemplate = CREATE_QUESTION_MOVENEXT_TECHNICAL_SYSTEM;
    }
  }

  const systemMessage = systemTemplate
    .replace(/{job_title}/g, params.jobTitle)
    .replace(/{job_description}/g, params.jobDescription)
    .replace(/{knowledge_points}/g, knowledgePointsStr)
    .replace(/{difficulty}/g, params.difficulty)
    .replace(/{language}/g, params.language)
    .replace(/{remaining_time}/g, params.remainingTime.toString());

  let humanMessage = context;

  if (params.decision === 'followup' && params.question && params.answer) {
    humanMessage = `Current Question: ${params.question}\nCandidate's Answer: ${params.answer}\n\n${context}`;
  }

  return { systemMessage, humanMessage };
}

const CREATE_FEEDBACK_INTRO_SYSTEM = `You are a technical interviewer providing feedback. Generate feedback and summary for the interview so far.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}

Current Phase: Introduction

Generate:
1. Feedback for the most recent answer (if applicable)
2. Summary of all questions and answers so far (concise, for use in generating next questions)
3. Next phase determination: Based on the conversation, determine if we should move to 'project' phase or stay in 'introduction'

You must respond with ONLY valid JSON:
{{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "introduction" | "project"
}}`;

const CREATE_FEEDBACK_PROJECT_SYSTEM = `You are a technical interviewer providing feedback. Generate feedback and summary for the interview so far.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}

Current Phase: Project Discussion

Generate:
1. Feedback for the most recent answer (if applicable)
2. Summary of all questions and answers so far (concise, for use in generating next questions)
3. Next phase determination: Based on the conversation, determine if we should move to 'technical' phase or stay in 'project'

You must respond with ONLY valid JSON:
{{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "project" | "technical"
}}`;

const CREATE_FEEDBACK_TECHNICAL_SYSTEM = `You are a technical interviewer providing feedback. Generate feedback and summary for the interview so far.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}

Current Phase: Technical Discussion

Generate:
1. Feedback for the most recent answer (if applicable)
2. Summary of all questions and answers so far (concise, for use in generating next questions)
3. Next phase determination: Based on the conversation, determine if we should stay in 'technical' phase

You must respond with ONLY valid JSON:
{{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "technical"
}}`;

export interface BuildCreateFeedbackPromptParams {
  jobTitle: string;
  knowledgePoints: string[];
  qaHistory: QAHistoryItem[];
  summary?: string;
  currentPhase: InterviewPhase;
}

export function buildCreateFeedbackPrompt(params: BuildCreateFeedbackPromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const qaSummary = formatQASummary(params.qaHistory, useSummary, params.summary);

  let systemTemplate = '';

  if (params.currentPhase === 'introduction') {
    systemTemplate = CREATE_FEEDBACK_INTRO_SYSTEM;
  } else if (params.currentPhase === 'project') {
    systemTemplate = CREATE_FEEDBACK_PROJECT_SYSTEM;
  } else {
    systemTemplate = CREATE_FEEDBACK_TECHNICAL_SYSTEM;
  }

  const systemMessage = systemTemplate
    .replace(/{job_title}/g, params.jobTitle)
    .replace(/{knowledge_points}/g, knowledgePointsStr);

  const humanMessage = qaSummary;

  return { systemMessage, humanMessage };
}

export interface BuildSummarizePromptParams {
  jobTitle: string;
  jobDescription: string;
  knowledgePoints: string[];
  qaHistory: QAHistoryItem[];
  interviewTime: number;
  language: string;
}

export function buildSummarizePrompt(params: BuildSummarizePromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const qaHistoryStr = formatQAHistory(params.qaHistory);

  const systemMessage = `You are a world-class software technology expert tasked with hiring a ${params.jobTitle}. The candidate has completed the interview. Please summarize the candidate's performance.

# Role Description:
${params.jobDescription}

# The knowledge points to be assessed in the interview are as follows:
${knowledgePointsStr}

# The interview duration is ${params.interviewTime} minutes.

Based on the above information, summarize the candidate's performance in 【${params.language}】 and provide an interview conclusion and a score (0-10).

You must respond with ONLY valid JSON:
{{
  "summary": "detailed summary text",
  "score": number (0-10),
  "conclusion": "final conclusion text"
}}`;

  const humanMessage = `# The questions and answers from the interview are as follows:
${qaHistoryStr}

# Notes:
1. Question numbers are generally in the format Q<number>.
2. Some questions may have follow-up questions due to brief answers. Please merge these questions and answers into one for summarization.`;

  return { systemMessage, humanMessage };
}
