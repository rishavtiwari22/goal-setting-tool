import type { SkillsFramework } from '../../types/interviewTypes';
import type { InterviewMode, MentorProfile } from './interviewEngine';
import {
  getInterviewerSystemPrompt,
  getInterviewerOpeningSystemPrompt,
  getMentorSystemPrompt,
  getMentorOpeningSystemPrompt,
  getSocraticMentorSystemPrompt,
  getSocraticMentorOpeningSystemPrompt,
  buildOcrSystemSection,
  buildOcrUserSection,
  buildOcrRequestScreenShareSection,
} from './prompts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function shouldUseSocraticMentor(mode: InterviewMode, mentorProfile?: MentorProfile): boolean {
  return mode === 'mentor' && mentorProfile === 'socratic';
}

// ─────────────────────────────────────────────
// 1. JD Skill Extraction (one-time, non-streaming)
// ─────────────────────────────────────────────

export function buildExtractionMessages(jdText: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert technical recruiter and interview designer. Your job is to analyze job descriptions and extract a structured evaluation framework for conducting interviews.

Return ONLY a valid JSON object with no preamble, no markdown, no code fences. Raw JSON only.`,
    },
    {
      role: 'user',
      content: `Analyze this job description and extract a skill evaluation framework.

JD:
${jdText}

Return this exact JSON structure:
{
  "role": "string",
  "must_have_skills": [
    { "skill": "string", "weight": 1, "evaluation_approach": "string" }
  ],
  "nice_to_have_skills": [
    { "skill": "string", "weight": 1, "evaluation_approach": "string" }
  ],
  "behavioral_competencies": [
    { "competency": "string", "example_question": "string" }
  ],
  "red_flags_to_probe": ["string"],
  "interview_focus_areas": ["string"],
  "suggested_question_sequence": ["string"]
}`,
    },
  ];
}

// ─────────────────────────────────────────────
// 2. Opening Question (one-time, non-streaming)
// ─────────────────────────────────────────────

export function buildOpeningMessages(
  framework: SkillsFramework,
  mode: InterviewMode = 'practice',
  mentorProfile?: MentorProfile,
): ChatMessage[] {
  const frameworkJson = JSON.stringify(framework, null, 2);
  const isSocraticMentor = shouldUseSocraticMentor(mode, mentorProfile);

  const systemPrompt = mode === 'mentor'
    ? isSocraticMentor
      ? getSocraticMentorOpeningSystemPrompt(framework.role, frameworkJson)
      : getMentorOpeningSystemPrompt(framework.role, frameworkJson)
    : getInterviewerOpeningSystemPrompt(framework.role, frameworkJson);

  const userContent = mode === 'mentor'
    ? isSocraticMentor
      ? `Start the Socratic technical mentoring session with a warm greeting and ask the student to share their background and one technical topic they want to strengthen for the ${framework.role} role.`
      : ? `Start the learning session with a warm greeting and ask the student to share their background and experience relevant to the ${framework.role} role.`
    : `Generate a warm, professional opening question for a ${framework.role} interview. Ask the candidate to tell you about their background, their years of experience, and their specific tech stack expertise relevant to this role.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}

// ─────────────────────────────────────────────
// 3. AI Turn (recurring, streaming)
// ─────────────────────────────────────────────

export function buildInterviewerMessages(
  framework: SkillsFramework,
  rollingSummary: string,
  recentMessages: { role: 'interviewer' | 'candidate'; content: string }[],
  candidateMessage: string,
  timeRemainingSeconds: number,
  totalSeconds: number,
  mode: InterviewMode = 'practice',
  mentorProfile?: MentorProfile,
  screenCode?: string,
  ocrEnabled?: boolean,
  isScreenSharing?: boolean,
  screenShareAskCount?: number,
): ChatMessage[] {
  const redFlags = framework.red_flags_to_probe.join(', ') || 'none identified';
  const elapsedMin = Math.floor((totalSeconds - timeRemainingSeconds) / 60);
  const remainingMin = Math.floor(timeRemainingSeconds / 60);
  const totalMin = Math.floor(totalSeconds / 60);
  const isSocraticMentor = shouldUseSocraticMentor(mode, mentorProfile);

  const timeContext = `- Total duration: ${totalMin} minutes\n- Time elapsed: ${elapsedMin} minute(s)\n- Time remaining: ${remainingMin} minute(s)\n- Adjust pacing based on time remaining to ensure coverage before the session ends.`;
  const frameworkJson = JSON.stringify(framework, null, 2);

  const hasScreenCode = screenCode && screenCode.trim().length > 20 && isScreenSharing;
  const ocrSystemSection = hasScreenCode ? '\n\n' + buildOcrSystemSection(screenCode!) : '';

  // If OCR is enabled but candidate is NOT sharing → tell LLM how to request screen share
  const requestShareSection = (ocrEnabled && !isScreenSharing)
    ? '\n\n' + buildOcrRequestScreenShareSection(screenShareAskCount ?? 0)
    : '';

  const systemPrompt = mode === 'mentor'
    ? isSocraticMentor
      ? getSocraticMentorSystemPrompt(framework.role, frameworkJson, timeContext) + ocrSystemSection
      : ? getMentorSystemPrompt(framework.role, frameworkJson, timeContext) + ocrSystemSection + requestShareSection
    : getInterviewerSystemPrompt(framework.role, frameworkJson, timeContext, redFlags) + ocrSystemSection + requestShareSection;

  const recentConversation = recentMessages
    .map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const ocrUserSection = hasScreenCode ? '\n\n' + buildOcrUserSection(screenCode!) : '';

  // When OCR is enabled but candidate isn't sharing, append a forceful reminder at the very end
  // (LLMs follow end-of-prompt instructions much more strictly than mid-prompt rules)
  const screenShareReminder = (ocrEnabled && !isScreenSharing && (screenShareAskCount ?? 0) < 2)
    ? `

REMINDER (CRITICAL): The candidate has opted into screen sharing but has NOT started yet. If your next question is about a SPECIFIC PROJECT the candidate has mentioned or built (e.g. "walk me through your project", "tell me about your code", "how did you structure it") — you MUST first request screen share. Do this by:
1. Asking them politely to share their screen so you can look at the code together.
2. Appending the literal token [REQUEST_SCREEN_SHARE] at the END of your message.
3. NOT asking the code question itself in this same message — wait for them to share.
The system will strip the token before TTS. WITHOUT this token, no screen-share modal will appear. ${screenShareAskCount === 1 ? 'You have already asked once and they declined — this is your FINAL allowed attempt.' : 'This is your first allowed attempt.'}`
    : `

REMINDER: You have already requested screen share twice and it was declined, or it is not enabled. 
- DO NOT request screen share again. 
- DO NOT append the [REQUEST_SCREEN_SHARE] token.
- Focus entirely on the JD skills and high-level project discussions via voice only.`;

  const closingInstruction = (mode === 'mentor'
    ? isSocraticMentor
      ? 'Based on the conversation so far, provide brief feedback on the student\'s last response and ask your next Socratic technical question. Be encouraging, use hints when needed, and keep it to one question.'
      : 'Based on the conversation so far, provide brief feedback on the student\'s last response and ask your next question. Be encouraging and teach when needed.'
    : 'Based on the conversation so far, what is your next interviewer message? Probe uncovered skills, follow up on anything interesting or vague, and keep the conversation natural. If the candidate mentions a specific technical implementation, ask them to explain the trade-offs they made.') + screenShareReminder;

  const userPrompt = [
    '## Conversation Summary (context)',
    rollingSummary || 'Session just started. No summary yet.',
    '',
    '## Recent Messages',
    recentConversation || 'No messages yet.',
    '',
    '## Candidate Latest Response',
    candidateMessage,
    ocrUserSection ? '\n' + ocrUserSection : '',
    '',
    closingInstruction,
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ] as ChatMessage[];
}

// ─────────────────────────────────────────────
// 4. Summarization (recurring, non-streaming)
// ─────────────────────────────────────────────

export function buildSummarizationMessages(
  roleName: string,
  existingSummary: string,
  messagesToCompress: { role: 'interviewer' | 'candidate'; content: string }[],
  skillsList: string[],
): ChatMessage[] {
  const messagesText = messagesToCompress
    .map(m => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  return [
    {
      role: 'system',
      content: `You are a conversation summarizer for an AI interview system. Create dense, structured summaries that preserve all evaluation-relevant information.`,
    },
    {
      role: 'user',
      content: `You are summarizing an ongoing interview for a ${roleName} position.
      
IMPORTANT: Pay close attention to the candidate's self-reported experience level (years of experience, seniority, specific tech stack expertise). Ensure this is clearly captured in the summary so the next turn can be tailored appropriately.

## Existing Summary (if any)
${existingSummary || 'None yet.'}

## New Messages to Incorporate
${messagesText}

## Skills Being Evaluated
${skillsList.join(', ')}

Produce an updated summary in this format:

**Candidate Profile:** [Years of experience, seniority level, core tech stack]

**Skills Assessed:**
- [Skill Name]: [Demonstrated / Partial / Not Yet Covered] — key evidence: "quote or paraphrase"

**Notable Moments:**
- [Anything impressive, concerning, or worth probing further]

**Topics Covered:** [comma-separated list]

**Topics Not Yet Covered:** [comma-separated list]

**Candidate Communication Style:** [1 line]

Keep the summary under 400 words. Be dense and factual.`,
    },
  ];
}

// ─────────────────────────────────────────────
// 5. Final Summary (end of session)
// ─────────────────────────────────────────────

export interface SummarizeQAItem {
  question: string;
  answer: string;
}

export interface BuildSummarizePromptParams {
  jobTitle: string;
  jobDescription: string;
  knowledgePoints: string[];
  qaHistory: SummarizeQAItem[];
  interviewTime: number;
  language: string;
  mode?: InterviewMode;
}

function formatQAHistory(qaHistory: SummarizeQAItem[]): string {
  return qaHistory
    .map((qa, index) => `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`)
    .join('\n\n');
}

export function buildSummarizePrompt(params: BuildSummarizePromptParams): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = params.knowledgePoints.join(', ');
  const qaHistoryStr = formatQAHistory(params.qaHistory);
  const isMentor = params.mode === 'mentor';

  const identity = isMentor
    ? `You are a supportive learning coach reviewing a student's practice session for the role of ${params.jobTitle}.`
    : `You are a world-class software technology expert tasked with hiring a ${params.jobTitle}.`;

  const goalStatement = isMentor
    ? `Your goal is to produce an encouraging, growth-oriented evaluation that helps the student understand what they learned and where to focus next.`
    : `Your goal is to produce an evaluation that is specific, evidence-based, and useful for decision making. Base your judgment strictly on the interview content.`;

  const summaryGuidance = isMentor
    ? `When writing the summary and conclusion:
- Focus on what the student demonstrated, what they learned, and what they should work on.
- Be positive and growth-oriented. Highlight progress, not just gaps.
- Give specific, actionable suggestions instead of vague comments.
- Acknowledge effort and incremental progress.
- In the summary, describe what went well first, then growth areas, and finish with an encouraging overall assessment.`
    : `When writing the summary and conclusion:
- Focus on observable behaviors, decisions, reasoning, and communication — not personality traits.
- Reference concrete moments or patterns from the interview when appropriate (without quoting verbatim).
- Avoid vague comments (e.g., "needs improvement") unless paired with a clear explanation.
- Ensure all suggested improvements are actionable and relevant to the job.
- In the summary, describe strengths first, then areas for improvement, and finish with an objective overall assessment.
- For each strength, briefly describe how they can continue to leverage or build on it.`;

  const systemMessage = `${identity} The candidate has completed the session. Please summarize their performance clearly, objectively, and concisely.

# Role Description:
${params.jobDescription}

# Knowledge Points Assessed:
${knowledgePointsStr}

# Session Duration:
${params.interviewTime} minutes

${goalStatement}

${summaryGuidance}

IMPORTANT REQUIREMENTS:
- Address the candidate as "You" throughout.
- You must always provide exactly 4 strengths. If strengths were limited, identify the most relevant positive aspects.
- You must always provide exactly 4 improvement areas focused on realistic development opportunities.
- You must not use bold, italics, bullet points, or any markdown formatting.
- Do not include headings or extra commentary outside the JSON.
- ${isMentor ? 'The conclusion should be encouraging and highlight the student\'s learning journey and next steps.' : 'The conclusion should clearly indicate your recommendation (e.g., move forward, on hold, or not recommended) with a short rationale.'}
- Maintain a balanced tone: acknowledge what went well before discussing improvement areas.
- Avoid judgmental language. Focus on behavior and outcomes.

LANGUAGE:
- Write the full response in ${params.language}.

OUTPUT FORMAT:
You must respond with ONLY valid JSON matching this EXACT structure:

{
  "summary": "detailed summary text describing overall performance",
  "score": 75,
  "conclusion": "final conclusion text",
  "topStrengths": [
    { "name": "Strength Name", "description": "What you did well (with a specific example), why it helped, and how you can continue to develop this strength" },
    { "name": "Strength Name", "description": "..." },
    { "name": "Strength Name", "description": "..." },
    { "name": "Strength Name", "description": "..." }
  ],
  "improvementAreas": [
    { "name": "Area Name", "description": "What needs improvement (with a concrete example), why it matters, and step-by-step actions to improve" },
    { "name": "Area Name", "description": "..." },
    { "name": "Area Name", "description": "..." },
    { "name": "Area Name", "description": "..." }
  ]
}`;

  const humanMessage = `# The questions and answers from the session are as follows:
${qaHistoryStr}

# Notes:
1. Question numbers are generally in the format Q<number>.
2. If a question had follow-up questions due to brief answers, treat them as part of the same topic and merge them when summarizing.`;

  return { systemMessage, humanMessage };
}
