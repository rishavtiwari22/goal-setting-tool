import type { SkillsFramework } from '../../types/interviewTypes';
import type { InterviewMode, MentorProfile } from './interviewEngine';
import {
  getInterviewerSystemPrompt,
  getInterviewerOpeningSystemPrompt,
  getMentorSystemPrompt,
  getMentorOpeningSystemPrompt,
  getGoalSettingSystemPrompt,
  getGoalSettingOpeningSystemPrompt,
  getReflectionOpeningSystemPrompt,
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

export function buildExtractionMessages(jdText: string, mode: InterviewMode = 'practice'): ChatMessage[] {
  const contextType = mode === 'goal-setting' ? "Previous Day Goal" : "Today's Goal";
  const systemContent = mode === 'goal-setting'
    ? `You are an expert mentor. Your job is to analyze a student's previous day goal and extract a structured context framework to help guide today's goal-setting conversation.
Return ONLY a valid JSON object with no preamble, no markdown, no code fences. Raw JSON only.`
    : `You are an expert mentor. Your job is to analyze a student's goal for today and extract a structured reflection framework for a mentoring conversation.
Return ONLY a valid JSON object with no preamble, no markdown, no code fences. Raw JSON only.`;

  return [
    {
      role: 'system',
      content: systemContent,
    },
    {
      role: 'user',
      content: `Analyze this student's ${contextType} and extract a framework mapped to this structure.

${contextType}:
${jdText}

Return this exact JSON structure (map the goal details into these fields so the system can process it):
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

  let systemPrompt: string;
  let userContent: string;

  if (mode === 'goal-setting') {
    systemPrompt = getGoalSettingOpeningSystemPrompt(framework.role, frameworkJson);
    userContent = `Start the goal-setting session with a warm greeting. 
If the context shows they have a previous goal, acknowledge it. If not, welcome them to their first session.
IMPORTANT: You MUST explicitly ask them to share their specific goal for today (e.g., "What specific goal would you like to set for today?").`;
  } else if (mode === 'reflection') {
    systemPrompt = getReflectionOpeningSystemPrompt(framework.role, frameworkJson); // Use mentor persona
    userContent = `Start the reflection session with a warm, supportive greeting. 
IMPORTANT: You MUST explicitly ask the mentee to talk about the goal they set today, what they accomplished, and how it went.`;
  } else if (mode === 'mentor') {
    systemPrompt = isSocraticMentor
      ? getSocraticMentorOpeningSystemPrompt(framework.role, frameworkJson)
      : getMentorOpeningSystemPrompt(framework.role, frameworkJson);
    userContent = isSocraticMentor
      ? `Start the Socratic technical mentoring session with a warm greeting and ask the student to share their background and one technical topic they want to strengthen for their goal.`
      : `Start the learning session with a warm greeting and ask the student to share their background and experience relevant to their goal.`;
  } else {
    systemPrompt = getInterviewerOpeningSystemPrompt(framework.role, frameworkJson);
    userContent = `Generate a warm, supportive opening question for a reflection session. Ask the mentee to talk about what they accomplished today and how it went.`;
  }

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
  isFirstScreenShareTurn?: boolean,
): ChatMessage[] {
  const redFlags = framework.red_flags_to_probe.join(', ') || 'none identified';
  const elapsedMin = Math.floor((totalSeconds - timeRemainingSeconds) / 60);
  const remainingMin = Math.floor(timeRemainingSeconds / 60);
  const totalMin = Math.floor(totalSeconds / 60);
  const isSocraticMentor = shouldUseSocraticMentor(mode, mentorProfile);

  const timeContext = `- Total duration: ${totalMin} minutes\n- Time elapsed: ${elapsedMin} minute(s)\n- Time remaining: ${remainingMin} minute(s)\n- Adjust pacing based on time remaining to ensure coverage before the session ends.`;
  const frameworkJson = JSON.stringify(framework, null, 2);

  const hasScreenCode = screenCode && screenCode.trim().length > 20 && isScreenSharing;
  const ocrSystemSection = hasScreenCode ? '\n\n' + buildOcrSystemSection(screenCode!, Boolean(isFirstScreenShareTurn)) : '';

  // If OCR is enabled but candidate is NOT sharing → tell LLM how to request screen share
  const requestShareSection = (ocrEnabled && !isScreenSharing)
    ? '\n\n' + buildOcrRequestScreenShareSection(screenShareAskCount ?? 0)
    : '';

  let systemPrompt: string;
  if (mode === 'goal-setting') {
    systemPrompt = getGoalSettingSystemPrompt(framework.role, frameworkJson, timeContext);
  } else if (mode === 'reflection') {
    systemPrompt = getInterviewerSystemPrompt(framework.role, frameworkJson, timeContext, redFlags); // Reuse the reflection persona we built previously
  } else if (mode === 'mentor') {
    systemPrompt = isSocraticMentor
      ? getSocraticMentorSystemPrompt(framework.role, frameworkJson, timeContext) + ocrSystemSection
      : getMentorSystemPrompt(framework.role, frameworkJson, timeContext) + ocrSystemSection + requestShareSection;
  } else {
    systemPrompt = getInterviewerSystemPrompt(framework.role, frameworkJson, timeContext, redFlags) + ocrSystemSection + requestShareSection;
  }

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

  let closingInstruction: string;
  if (mode === 'goal-setting') {
    closingInstruction = 'Based on the conversation so far, provide brief feedback on the student\'s last response and ask your next clarifying question to sharpen their goal. Be encouraging and keep it to ONE short question.';
  } else if (mode === 'reflection') {
    closingInstruction = 'Based on the conversation so far, what is your next reflection question? Act like a rigorous interviewer: probe deeply into their technical or conceptual understanding to verify they ACTUALLY learned and fully completed their goal.';
  } else if (mode === 'mentor') {
    closingInstruction = (isSocraticMentor
      ? 'Based on the conversation so far, provide brief feedback on the student\'s last response and ask your next Socratic technical question. Be encouraging, use hints when needed, and keep it to one question.'
      : 'Based on the conversation so far, provide brief feedback on the student\'s last response and ask your next question. Be encouraging and teach when needed.') + screenShareReminder;
  } else {
    closingInstruction = 'Based on the conversation so far, what is your next reflection question? Act like a rigorous interviewer: probe deeply into their technical or conceptual understanding to verify they ACTUALLY learned and fully completed their goal.' + screenShareReminder;
  }

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
  /** Mentor mode only: topics the in-session coach silently parked. */
  parkedTopics?: string[];
}

function formatQAHistory(qaHistory: SummarizeQAItem[]): string {
  return qaHistory
    .map((qa, index) => `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`)
    .join('\n\n');
}

export function buildSummarizePrompt(params: BuildSummarizePromptParams): { systemMessage: string; humanMessage: string } {
  const isPractice = !params.mode || params.mode === 'practice';
  return isPractice
    ? buildPracticeSummarizePrompt(params)
    : buildMentorSummarizePrompt(params);
}

// ─────────────────────────────────────────────
// Practice (real interview) summarizer
// ─────────────────────────────────────────────

function buildPracticeSummarizePrompt(
  params: BuildSummarizePromptParams,
): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = (params.knowledgePoints || []).join(', ');
  const qaHistoryStr = formatQAHistory(params.qaHistory);

  const systemMessage = `You are a mentor summarizing a reflection conversation with a mentee. The mentee has just finished reflecting on their daily goal. Produce a specific, evidence-based assessment of their understanding and a reflection paragraph.

# Goal Description:
${params.jobDescription}

# Knowledge Points Covered:
${knowledgePointsStr}

# Session Duration:
${params.interviewTime} minutes

When writing the summary and conclusion:
- Assess whether the student demonstrates sufficient understanding of what they set out to do.
- Write a reflection paragraph as if summarizing the mentee's own experience, grounded in what they actually said in the conversation. Do not write a generic AI-generated summary.
- The 'summary' field MUST contain the reflection paragraph.
- Provide actionable feedback on what they did well and what they can improve.

REQUIREMENTS:
- Address the mentee as "You" throughout.
- Provide exactly 4 strengths and exactly 4 improvement areas (these can be related to their understanding and execution of the goal).
- No markdown formatting. No headings. No commentary outside the JSON.
- The conclusion should clearly summarize your assessment of their understanding and provide encouraging next steps.
- Avoid judgmental language. Focus on growth and reflection.

LANGUAGE: Write the full response in ${params.language}.

OUTPUT FORMAT — respond with ONLY valid JSON matching this EXACT structure:

{
  "summary": "detailed summary text describing overall performance",
  "score": 75,
  "conclusion": "final conclusion text",
  "topStrengths": [
    { "name": "Strength Name", "description": "What you did well, why it helped, how to keep building it" },
    { "name": "Strength Name", "description": "..." },
    { "name": "Strength Name", "description": "..." },
    { "name": "Strength Name", "description": "..." }
  ],
  "improvementAreas": [
    { "name": "Area Name", "description": "What needs improvement, why it matters, step-by-step actions" },
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

// ─────────────────────────────────────────────
// Mentor (interview-skill coaching) summarizer
// ─────────────────────────────────────────────
//
// The mentor evaluator is fundamentally different from the practice
// evaluator. We DO NOT score the candidate's technical correctness here.
// We score how WELL THEY INTERVIEW: structure, clarity, depth, confidence,
// communication. Concept gaps go in `topicsToStudy`, framed positively as
// study targets — not failure flags.

function buildMentorSummarizePrompt(
  params: BuildSummarizePromptParams,
): { systemMessage: string; humanMessage: string } {
  const knowledgePointsStr = (params.knowledgePoints || []).join(', ');
  const qaHistoryStr = formatQAHistory(params.qaHistory);
  const parked = (params.parkedTopics || []).filter(Boolean);
  const parkedSection = parked.length > 0
    ? `\n\n# Topics the in-session coach flagged for study (these MUST appear in topicsToStudy, framed positively):\n${parked.map((t, i) => `- ${t}`).join('\n')}`
    : '';

  const hasTopicsToFlag = parked.length > 0;

  let systemMessage: string;

  if (params.mode === 'goal-setting') {
    systemMessage = `You are a scribe finalizing a student's daily goal-setting session.
Your ONLY job is to extract and record the goals the student EXPLICITLY stated they will do today.

# STRICT RULES — read carefully:
- ONLY include goals the student clearly and explicitly committed to doing today.
- DO NOT infer, suggest, expand, or add any goal that was not directly stated by the student.
- DO NOT add coaching advice, sub-tasks, or improvements the mentor suggested unless the student explicitly agreed to them.
- If the student stated 1 goal, output exactly 1 goal. If 2, output 2. Never add more.
- keyActions must ONLY contain things the student said they would do — not suggestions.
- If unsure whether something was committed to, leave it out.

LANGUAGE: Write the full response in ${params.language}.

OUTPUT FORMAT — respond with ONLY valid JSON matching this EXACT structure:

{
  "summary": "One sentence summary of what the student committed to today.",
  "conclusion": "Brief closing note.",
  "goals": [
    {
      "summary": "Short, direct title of the goal — use the student's own words (max 10 words).",
      "conclusion": "One sentence describing the goal in the student's own words.",
      "keyActions": [
        "Exact action the student said they will take.",
        "Another exact action if they stated one."
      ],
      "status": "active",
      "score": 100,
      "topStrengths": [],
      "improvementAreas": [],
      "topicsToStudy": []
    }
  ]
}`;

  } else if (params.mode === 'reflection') {
    systemMessage = `You are an expert mentor finalizing a student's daily reflection session.
Your job is to read the conversation and output a structured reflection assessment.

# Reflection Assessment
Based on the conversation, assess whether the student actually did and understood what they set out to do in their goals today.
Provide a reflection paragraph grounded in what the student actually said.
If they successfully answered follow-ups, their status is "completed". If they struggled (couldn't articulate after follow-ups) or admitted failing, their status is "abandoned" or "partially_completed".

LANGUAGE: Write the full response in ${params.language}.

OUTPUT FORMAT — respond with ONLY valid JSON matching this EXACT structure:

{
  "summary": "A high-level summary of the entire reflection session.",
  "conclusion": "A brief conclusion.",
  "reflections": [
    {
      "summary": "A 2-3 sentence reflection paragraph summarizing their progress and understanding for this goal.",
      "conclusion": "An assessment of whether their understanding is sufficient or insufficient.",
      "status": "completed", 
      "score": 100,
      "topStrengths": [
        { "name": "Success", "description": "Something they achieved or understood well today." }
      ],
      "improvementAreas": [
        { "name": "Challenge", "description": "A blocker or misunderstanding they faced today." }
      ],
      "topicsToStudy": []
    }
  ]
}`;
  } else {
    systemMessage = `You are an interview coach reviewing a candidate's mock-interview session for the role of ${params.jobTitle}. Your job is NOT to evaluate technical correctness — it's to evaluate how WELL THEY INTERVIEW.

# Role Context:
${params.jobDescription}

# Topics In Scope:
${knowledgePointsStr}

# Session Duration:
${params.interviewTime} minutes

# What you score (interview skill, not technical correctness)
- STRUCTURE: did they organize answers (context → action → result, or similar)?
- CLARITY: did they get to the point or ramble?
- DEPTH: did they go beyond surface-level when prompted?
- CONFIDENCE: did they sound certain or hedge constantly?
- EXAMPLES: did they back claims with concrete examples or stay abstract?
- COMMUNICATION: did they listen, ask clarifying questions, own their work ("I" vs "we")?
- ADAPTABILITY: did their answers improve as the session went on?

# What you do NOT do
- Do NOT teach concepts in this report. The candidate can study on their own.
- Do NOT score technical correctness directly. If they got a topic wrong, that goes in \`topicsToStudy\` — never as a "failure" or "weakness" in summary/strengths/improvements.
- Do NOT mention that any topic was "skipped", "parked", "couldn't be answered", "moved past", etc. Frame everything in \`topicsToStudy\` as POSITIVE next-step study targets.

# Topics to study
This is the most important field. Combine:
1. Topics the in-session coach flagged (provided below — you MUST include all of them, rewritten in plain candidate-facing language).
2. Any other concepts the transcript shows the candidate was shaky on.

For each topic, write a one-sentence study target — what to learn and why it'll help them ace the next interview. Examples:
  • { "name": "Recursion base cases", "description": "Brush up on how to identify and write base cases for recursive functions — interviewers love a clean recursion answer." }
  • { "name": "SQL joins", "description": "Practice the difference between INNER, LEFT, and FULL OUTER joins so you can speak to query trade-offs with confidence." }

NEVER write things like "you couldn't answer", "you got stuck on", "you skipped", "you didn't know". Always frame it as a forward-looking study target.

# Other requirements
- Address the candidate as "You" throughout.
- Provide exactly 4 strengths and exactly 4 improvement areas — both about INTERVIEWING SKILL, not concept knowledge.
- topicsToStudy can have 1–6 items. If the in-session coach parked nothing AND the transcript shows no shaky topics, return an empty array.
- The summary itself MUST end with a one-sentence pointer if topicsToStudy is non-empty, like: "Take a look at the Topics to Study section above — reviewing those will make a noticeable difference in your next interview for this role." Use a natural variation of this sentence; do not copy it verbatim. Do NOT mention this pointer at all if topicsToStudy will be empty.${hasTopicsToFlag ? '\n  → For THIS session, topicsToStudy WILL be non-empty (the coach flagged at least one topic), so the pointer sentence is REQUIRED.' : '\n  → For THIS session, no topics were flagged in-session — only add the pointer if you yourself find a clearly shaky topic in the transcript and add it to topicsToStudy.'}
- The conclusion should be encouraging and forward-looking — what to focus on for the next interview.
- The score (0–100) reflects interviewing skill quality, not technical correctness.
- No markdown formatting. No headings. No commentary outside the JSON.

LANGUAGE: Write the full response in ${params.language}.

OUTPUT FORMAT — respond with ONLY valid JSON matching this EXACT structure:

{
  "summary": "How they did at interviewing — structure, clarity, depth, confidence. Lead with what improved or went well, then growth areas, end with an encouraging overall note.",
  "score": 75,
  "conclusion": "Forward-looking encouraging note about what to focus on for the next interview.",
  "topStrengths": [
    { "name": "Interview Skill Name", "description": "What they did well at INTERVIEWING (e.g. 'structured answers using situation-action-result'), why it helped them stand out, how to keep using it." },
    { "name": "Interview Skill Name", "description": "..." },
    { "name": "Interview Skill Name", "description": "..." },
    { "name": "Interview Skill Name", "description": "..." }
  ],
  "improvementAreas": [
    { "name": "Interview Skill Name", "description": "What to improve about HOW they interview (e.g. 'leading with the punchline before context'), why it matters, one concrete practice action." },
    { "name": "Interview Skill Name", "description": "..." },
    { "name": "Interview Skill Name", "description": "..." },
    { "name": "Interview Skill Name", "description": "..." }
  ],
  "topicsToStudy": [
    { "name": "Topic Name", "description": "Forward-looking study target — what to learn and why it'll help in the next interview. Never mention skipping or failing." }
  ]
}`;
  }

  const humanMessage = `# The questions and answers from the session are as follows:
${qaHistoryStr}${parkedSection}

# Notes:
1. Question numbers are in the format Q<number>.
2. Treat follow-up questions on the same topic as one cluster.
3. Remember: you are evaluating HOW they interview, not WHETHER their answers were technically correct. Concept gaps belong in topicsToStudy, never in improvementAreas.`;

  return { systemMessage, humanMessage };
}
