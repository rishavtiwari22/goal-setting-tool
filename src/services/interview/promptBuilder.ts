import { QAHistoryItem, InterviewPhase, ProjectInfo } from '../../models/interview';

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

// Format recent Q&A history for decision context
function formatRecentQAForDecision(qaHistory: QAHistoryItem[], count: number = 3): string {
  if (qaHistory.length === 0) {
    return "No previous Q&A.";
  }
  const recent = qaHistory.slice(-count);
  return recent
    .map((qa, index) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join("\n---\n");
}

export interface BuildDecisionPromptParams {
  question: string;
  answer: string;
  recentQAHistory?: QAHistoryItem[];  // Phase 2: Include recent history for context
  consecutiveIrrelevantCount?: number; // Phase 2: Current count of consecutive irrelevant answers
  currentTopicFollowupCount?: number;  // Phase 2: Current count of follow-ups for this topic
}

export function buildDecisionPrompt(params: BuildDecisionPromptParams): { systemMessage: string; humanMessage: string } {
  const recentContext = params.recentQAHistory && params.recentQAHistory.length > 0
    ? formatRecentQAForDecision(params.recentQAHistory, 3)
    : '';

  const consecutiveCount = params.consecutiveIrrelevantCount ?? 0;
  const followupCount = params.currentTopicFollowupCount ?? 0;

  const irrelevantInfo = `\nConsecutive Non-Substantive Answers: ${consecutiveCount}`;
  const followupInfo = `\nFollow-up Questions on Current Topic: ${followupCount}`;

  const systemMessage = `You are a technical interviewer analyzing candidate responses. Make deterministic decisions about the interview flow.


Decision Rules (in priority order):

1. END THE INTERVIEW IMMEDIATELY if:
   - User explicitly requests to end: "end the call", "end call", "stop", "end", "quit", "exit", "done", "end interview", "stop interview", etc.
   - Candidate has given ${consecutiveCount >= 2 ? 'MULTIPLE' : 'some'} non-substantive answers AND this answer shows:
     * No relevant technical knowledge
     * Refusal to engage (e.g., "I don't know", "never", "I won't")
     * Off-topic or nonsensical responses
   - After 3+ non-substantive answers, the candidate is clearly not a fit → END

2. FOLLOW-UP if (only if there's hope of a better answer):
   - Answer is too brief but shows SOME engagement
   - Answer needs minor clarification
   - This is the FIRST vague answer on this topic

3. MOVE TO NEXT TOPIC if:
   - Answer provides meaningful information
   - Candidate demonstrates some relevant knowledge
   - Further probing won't yield better results

${irrelevantInfo}${followupInfo}

IMPORTANT: Do NOT keep asking follow-ups to an unqualified or disengaged candidate. 
${consecutiveCount >= 2 ? '⚠️ WARNING: Multiple non-substantive answers detected. Strongly consider "end" if this answer also lacks substance.' : ''}

You must respond with ONLY valid JSON:
{{
  "decision": "followup" | "movenext" | "end"
}}`;

  let humanMessage = `Question: ${params.question}\nAnswer: ${params.answer}`;

  if (recentContext) {
    humanMessage = `Recent Conversation:\n${recentContext}\n\n---\nCurrent:\nQuestion: ${params.question}\nAnswer: ${params.answer}`;
  }

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

// const CREATE_QUESTION_FOLLOWUP_TECHNICAL_SYSTEM = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up technical question.

// Job Title: {job_title}
// Knowledge Areas: {knowledge_points}
// Difficulty: {difficulty}
// Language: {language}
// Remaining Time: {remaining_time} minutes

// Ask a concise follow-up technical question that helps clarify the candidate's understanding. Be specific and reference what they said.`;

const CREATE_QUESTION_MOVENEXT_INTRO_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes
Introduction Questions Asked So Far: {intro_question_count}

Current Phase: Introduction

Phase Guidelines:
- Build rapport with the candidate through 2-3 introduction questions
- Question 1: Ask candidate to introduce themselves (name, background, years of experience)
- Question 2: Ask about what excites them about this role or their career motivation
- Question 3 (optional): Ask about their preferred working style or team collaboration approach
- Keep questions warm, welcoming, and conversational
- DO NOT jump to technical questions yet - this is about building rapport
- Do NOT use bold texts or any other formatting. No * or ** or *** or ***

After 2-3 introduction questions, the feedback system will transition to project discussion.

Generate the next introduction question. Be warm and conversational. Do NOT include phase labels in the question.`;

const CREATE_QUESTION_MOVENEXT_PROJECT_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes

Current Phase: Project Discussion
{discussed_projects_context}

Phase Guidelines:
- Ask about recent projects they've worked on
- Focus on their role, technologies used, and challenges faced
- These should be open-ended questions
- DO NOT ask about projects that have already been fully discussed
- Do NOT use bold texts or any other formatting. No * or ** or *** or ***
- If returning from technical phase, ask about a NEW project they haven't mentioned yet

Generate the next question following the interview flow. The question should be open-ended, conversational, and assess project experience. Do NOT include phase labels in the question.`;

const CREATE_QUESTION_MOVENEXT_TECHNICAL_SYSTEM = `You are a senior technical interviewer conducting an interview for {job_title}.

Job Description: {job_description}
Knowledge Areas: {knowledge_points}
Difficulty: {difficulty}
Language: {language}
Remaining Time: {remaining_time} minutes
Technical Questions on Current Project: {current_project_question_count}
{discussed_projects_context}

Current Phase: Technical Discussion

Phase Guidelines:
- Ask technical questions requiring explanations (open-ended, conversational)
- Cover key concepts from {knowledge_points}
- Ask about their understanding, approach, and reasoning
- NO multiple choice - all questions should require explanations
- Do NOT use bold texts or any other formatting. No * or ** or *** or ***

IMPORTANT - Question Limits Per Project:
- After 2-3 technical questions about the same project, you MUST either:
  a) Ask about a DIFFERENT aspect/technology from their experience, OR
  b) Move to general technical concepts not tied to a specific project
- DO NOT keep drilling the same project repeatedly beyond 3 questions
- Do NOT use bold texts or any other formatting. No * or ** or *** or ***
Generate the next question. Vary the topics to keep the interview engaging. Do NOT include phase labels.`;

const CREATE_QUESTION_RETRY_SYSTEM = `You are a technical interviewer. The candidate has given a bad or irrelevant answer.
Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Language: {language}
Remaining Time: {remaining_time} minutes

The candidate's previous response was incorrect, nonsense, or a refusal to answer.
Your goal is to:
1. Firmly but politely state that the answer is incorrect or insufficient.
2. Ask them to try again, or ask a simplified follow-up question on the same topic to guide them.
3. Do NOT reveal the answer yet. Give them a chance to correct themselves.
4. Do NOT use bold texts or any other formatting. No * or **  `;
export interface BuildCreateQuestionPromptParams {
  jobTitle: string;
  jobDescription: string;
  knowledgePoints: string[];
  difficulty: string;
  language: string;
  remainingTime: number;
  currentPhase: InterviewPhase;
  decision: 'followup' | 'movenext' | 'retry';
  question?: string;
  answer?: string;
  qaHistory: QAHistoryItem[];
  summary?: string;
  discussedProjects?: ProjectInfo[];  // Phase 3: Projects already discussed
  // Question count tracking
  introductionQuestionCount?: number;
  currentProjectQuestionCount?: number;
}

function formatDiscussedProjects(projects?: ProjectInfo[]): string {
  if (!projects || projects.length === 0) {
    return '';
  }

  const projectList = projects.map(p => {
    const techStr = p.technologies.length > 0 ? ` (Technologies: ${p.technologies.join(', ')})` : '';
    const phasesStr = p.discussedInPhases.length > 0 ? ` [Discussed in: ${p.discussedInPhases.join(', ')}]` : '';
    return `- ${p.name}${techStr}${phasesStr}`;
  }).join('\n');

  return `\nProjects Already Discussed:\n${projectList}\n\nDO NOT repeat questions about these projects. Ask about NEW projects or unexplored aspects.`;
}

export function buildCreateQuestionPrompt(params: BuildCreateQuestionPromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const context = formatQASummary(params.qaHistory, useSummary, params.summary);
  const discussedProjectsContext = formatDiscussedProjects(params.discussedProjects);

  let systemTemplate = '';

  if (params.decision === 'followup') {
    if (params.currentPhase === 'introduction') {
      systemTemplate = CREATE_QUESTION_FOLLOWUP_INTRO_SYSTEM;
    } else if (params.currentPhase === 'project') {
      systemTemplate = CREATE_QUESTION_FOLLOWUP_PROJECT_SYSTEM;
    } else {
    }
  } else if (params.decision === 'retry') {
    systemTemplate = CREATE_QUESTION_RETRY_SYSTEM;
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
    .replace(/{remaining_time}/g, params.remainingTime.toString())
    .replace(/{discussed_projects_context}/g, discussedProjectsContext)
    .replace(/{intro_question_count}/g, (params.introductionQuestionCount ?? 0).toString())
    .replace(/{current_project_question_count}/g, (params.currentProjectQuestionCount ?? 0).toString());

  let humanMessage = context;

  if (params.decision === 'followup' && params.question && params.answer) {
    humanMessage = `Current Question: ${params.question}\nCandidate's Answer: ${params.answer}\n\n${context}`;
  }

  return { systemMessage, humanMessage };
}

const CREATE_FEEDBACK_INTRO_SYSTEM = `You are a technical interviewer providing feedback. Generate feedback and summary for the interview so far.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Introduction Questions Asked So Far: {intro_question_count}

Current Phase: Introduction

Phase Transition Rules:
- Stay in "introduction" if fewer than 2 questions have been asked
- Move to "project" after 2-3 introduction questions when candidate has shared sufficient background
- If candidate naturally mentions projects, still complete at least 2 intro questions first

Generate:
1. Feedback for the most recent answer (brief acknowledgment)
2. Summary of what we've learned about the candidate so far
3. Next phase: "introduction" (if < 2 questions) OR "project" (if >= 2 questions and rapport established)

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
{discussed_projects_context}

Current Phase: Technical Discussion

Generate:
1. Feedback for the most recent answer (if applicable)
2. Summary of all questions and answers so far (concise, for use in generating next questions)
3. Next phase determination:
   - If technical discussion for the current project is COMPLETE and candidate mentioned other projects we haven't explored technically → return "project" to go back and discuss another project
   - If more technical questions are needed for current project → return "technical"
   - If all projects have been fully explored technically → return "technical" for general technical questions
4. Whether the current project's technical discussion is complete
5. List any project names mentioned in the conversation

You must respond with ONLY valid JSON:
{{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "project" | "technical",
  "currentProjectComplete": boolean,
  "projectsMentioned": ["array of project names mentioned"]
}}`;

export interface BuildCreateFeedbackPromptParams {
  jobTitle: string;
  knowledgePoints: string[];
  qaHistory: QAHistoryItem[];
  summary?: string;
  currentPhase: InterviewPhase;
  discussedProjects?: ProjectInfo[];  // Phase 3: Projects already discussed
  // Question count tracking
  introductionQuestionCount?: number;
  currentProjectQuestionCount?: number;
}

export function buildCreateFeedbackPrompt(params: BuildCreateFeedbackPromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const qaSummary = formatQASummary(params.qaHistory, useSummary, params.summary);
  const discussedProjectsContext = formatDiscussedProjects(params.discussedProjects);

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
    .replace(/{knowledge_points}/g, knowledgePointsStr)
    .replace(/{discussed_projects_context}/g, discussedProjectsContext)
    .replace(/{intro_question_count}/g, (params.introductionQuestionCount ?? 0).toString())
    .replace(/{current_project_question_count}/g, (params.currentProjectQuestionCount ?? 0).toString());

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
  "score": number (0-5),
  "conclusion": "final conclusion text"
}}`;

  const humanMessage = `# The questions and answers from the interview are as follows:
${qaHistoryStr}

# Notes:
1. Question numbers are generally in the format Q<number>.
2. Some questions may have follow-up questions due to brief answers. Please merge these questions and answers into one for summarization.`;

  return { systemMessage, humanMessage };
}
