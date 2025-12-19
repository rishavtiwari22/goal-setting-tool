const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL ||
  "https://your-cloudflare-worker-url.workers.dev";

const getPerformance = () => {
  if (typeof performance !== "undefined") return performance;
  if (typeof globalThis !== "undefined" && globalThis.performance)
    return globalThis.performance;
  return { now: () => Date.now() };
};

const perf = getPerformance();

function formatQAHistory(qaHistory) {
  if (qaHistory.length === 0) {
    return "None";
  }
  return qaHistory
    .map((qa, index) => {
      return `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`;
    })
    .join("\n\n");
}

function formatQASummary(qaHistory, useSummary, existingSummary) {
  if (useSummary && existingSummary) {
    return `Summary of previous Q&A:\n${existingSummary}\n\nMost recent Q&A:\nQ: ${
      qaHistory[qaHistory.length - 1]?.question || ""
    }\nA: ${qaHistory[qaHistory.length - 1]?.answer || ""}`;
  }

  if (qaHistory.length === 0) {
    return "No previous questions and answers.";
  }

  if (qaHistory.length <= 3) {
    return qaHistory
      .map(
        (qa, index) =>
          `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`
      )
      .join("\n\n");
  }

  return qaHistory
    .slice(-3)
    .map(
      (qa, index) =>
        `Q${qaHistory.length - 3 + index + 1}: ${qa.question}\nA${
          qaHistory.length - 3 + index + 1
        }: ${qa.answer}`
    )
    .join("\n\n");
}

function formatRecentQAForDecision(qaHistory, count = 3) {
  if (qaHistory.length === 0) {
    return "No previous Q&A.";
  }
  const recent = qaHistory.slice(-count);
  return recent
    .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
    .join("\n---\n");
}

function formatDiscussedProjects(projects) {
  if (!projects || projects.length === 0) {
    return "";
  }

  const projectList = projects
    .map((p) => {
      const techStr =
        p.technologies.length > 0
          ? ` (Technologies: ${p.technologies.join(", ")})`
          : "";
      const phasesStr =
        p.discussedInPhases.length > 0
          ? ` [Discussed in: ${p.discussedInPhases.join(", ")}]`
          : "";
      return `- ${p.name}${techStr}${phasesStr}`;
    })
    .join("\n");

  return `\nProjects Already Discussed:\n${projectList}\n\nDO NOT repeat questions about these projects. Ask about NEW projects or unexplored aspects.`;
}

function buildDecisionPrompt(params) {
  const recentContext =
    params.recentQAHistory && params.recentQAHistory.length > 0
      ? formatRecentQAForDecision(params.recentQAHistory, 3)
      : "";

  const consecutiveCount = params.consecutiveIrrelevantCount ?? 0;
  const followupCount = params.currentTopicFollowupCount ?? 0;

  const irrelevantInfo = `\nConsecutive Non-Substantive Answers: ${consecutiveCount}`;
  const followupInfo = `\nFollow-up Questions on Current Topic: ${followupCount}`;

  const systemMessage = `You are a technical interviewer analyzing candidate responses. Make deterministic decisions about the interview flow.


Decision Rules (in priority order):

1. END THE INTERVIEW IMMEDIATELY if:
   - User explicitly requests to end: "end the call", "end call", "stop", "end", "quit", "exit", "done", "end interview", "stop interview", etc.
   - Candidate has given ${
     consecutiveCount >= 2 ? "MULTIPLE" : "some"
   } non-substantive answers AND this answer shows:
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
${
  consecutiveCount >= 2
    ? '⚠️ WARNING: Multiple non-substantive answers detected. Strongly consider "end" if this answer also lacks substance.'
    : ""
}

You must respond with ONLY valid JSON:
{
  "decision": "followup" | "movenext" | "end"
}`;

  let humanMessage = `Question: ${params.question}\nAnswer: ${params.answer}`;

  if (recentContext) {
    humanMessage = `Recent Conversation:\n${recentContext}\n\n---\nCurrent:\nQuestion: ${params.question}\nAnswer: ${params.answer}`;
  }

  return { systemMessage, humanMessage };
}

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

function buildCreateQuestionPrompt(params) {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const context = formatQASummary(params.qaHistory, useSummary, params.summary);
  const discussedProjectsContext = formatDiscussedProjects(
    params.discussedProjects
  );

  let systemTemplate = "";

  if (params.decision === "followup") {
    if (params.currentPhase === "introduction") {
      systemTemplate = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up question to get more information.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Language: {language}
Remaining Time: {remaining_time} minutes

Ask a concise follow-up question that helps clarify the candidate's answer. Be specific and reference what they said.`;
    } else if (params.currentPhase === "project") {
      systemTemplate = `You are a technical interviewer. The candidate's answer was unclear or insufficient. Ask a follow-up question about their project experience.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}
Language: {language}
Remaining Time: {remaining_time} minutes

Ask a concise follow-up question that helps clarify the candidate's project experience. Be specific and reference what they said.`;
    }
  } else if (params.decision === "retry") {
    systemTemplate = `You are a technical interviewer. The candidate has given a bad or irrelevant answer.
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
  } else {
    if (params.currentPhase === "introduction") {
      systemTemplate = CREATE_QUESTION_MOVENEXT_INTRO_SYSTEM;
    } else if (params.currentPhase === "project") {
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
    .replace(
      /{intro_question_count}/g,
      (params.introductionQuestionCount ?? 0).toString()
    )
    .replace(
      /{current_project_question_count}/g,
      (params.currentProjectQuestionCount ?? 0).toString()
    );

  let humanMessage = context;

  if (params.decision === "followup" && params.question && params.answer) {
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
{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "introduction" | "project"
}`;

const CREATE_FEEDBACK_PROJECT_SYSTEM = `You are a technical interviewer providing feedback. Generate feedback and summary for the interview so far.

Job Title: {job_title}
Knowledge Areas: {knowledge_points}

Current Phase: Project Discussion

Generate:
1. Feedback for the most recent answer (if applicable)
2. Summary of all questions and answers so far (concise, for use in generating next questions)
3. Next phase determination: Based on the conversation, determine if we should move to 'technical' phase or stay in 'project'

You must respond with ONLY valid JSON:
{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "project" | "technical"
}`;

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
{
  "feedback": "string",
  "summary": "string",
  "nextPhase": "project" | "technical",
  "currentProjectComplete": boolean,
  "projectsMentioned": ["array of project names mentioned"]
}`;

function buildCreateFeedbackPrompt(params) {
  const knowledgePointsStr = params.knowledgePoints.join(", ");
  const useSummary = params.qaHistory.length > 3;
  const qaSummary = formatQASummary(
    params.qaHistory,
    useSummary,
    params.summary
  );
  const discussedProjectsContext = formatDiscussedProjects(
    params.discussedProjects
  );

  let systemTemplate = "";

  if (params.currentPhase === "introduction") {
    systemTemplate = CREATE_FEEDBACK_INTRO_SYSTEM;
  } else if (params.currentPhase === "project") {
    systemTemplate = CREATE_FEEDBACK_PROJECT_SYSTEM;
  } else {
    systemTemplate = CREATE_FEEDBACK_TECHNICAL_SYSTEM;
  }

  const systemMessage = systemTemplate
    .replace(/{job_title}/g, params.jobTitle)
    .replace(/{knowledge_points}/g, knowledgePointsStr)
    .replace(/{discussed_projects_context}/g, discussedProjectsContext)
    .replace(
      /{intro_question_count}/g,
      (params.introductionQuestionCount ?? 0).toString()
    )
    .replace(
      /{current_project_question_count}/g,
      (params.currentProjectQuestionCount ?? 0).toString()
    );

  const humanMessage = qaSummary;

  return { systemMessage, humanMessage };
}

async function makeDecision(systemMessage, humanMessage) {
  const startTime = perf.now();

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: humanMessage },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.1,
      }),
    });

    const endTime = perf.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error(
        "Failed to parse decision response:",
        parseError,
        "Content:",
        content
      );
      result = { decision: "movenext" };
    }

    return {
      success: true,
      latency,
      data: result,
      responseSize: JSON.stringify(data).length,
      promptSize: (systemMessage + humanMessage).length,
    };
  } catch (error) {
    const endTime = perf.now();
    return {
      success: false,
      latency: endTime - startTime,
      error: error.message,
    };
  }
}

async function createQuestion(systemMessage, humanMessage) {
  const startTime = perf.now();
  let totalContent = "";
  let firstChunkTime = null;
  let chunkCount = 0;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: humanMessage },
        ],
        stream: true,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body is not readable");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              if (firstChunkTime === null) {
                firstChunkTime = perf.now() - startTime;
              }
              totalContent += content;
              chunkCount++;
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }
    }

    reader.releaseLock();
    const endTime = perf.now();
    const latency = endTime - startTime;

    return {
      success: true,
      latency,
      firstChunkTime,
      chunkCount,
      contentLength: totalContent.length,
      responseSize: totalContent.length,
      promptSize: (systemMessage + humanMessage).length,
    };
  } catch (error) {
    const endTime = perf.now();
    return {
      success: false,
      latency: endTime - startTime,
      error: error.message,
    };
  }
}

async function createFeedback(systemMessage, humanMessage) {
  const startTime = perf.now();

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: humanMessage },
        ],
        response_format: { type: "json_object" },
        stream: false,
        temperature: 0.3,
      }),
    });

    const endTime = perf.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error(
        "Failed to parse feedback response:",
        parseError,
        "Content:",
        content
      );
      result = { feedback: "", summary: "" };
    }

    return {
      success: true,
      latency,
      data: result,
      responseSize: JSON.stringify(data).length,
      promptSize: (systemMessage + humanMessage).length,
    };
  } catch (error) {
    const endTime = perf.now();
    return {
      success: false,
      latency: endTime - startTime,
      error: error.message,
    };
  }
}

const testConfig = {
  jobTitle: "Senior Software Engineer",
  jobDescription:
    "We are looking for a Senior Software Engineer with expertise in full-stack development, system design, and cloud technologies. The ideal candidate should have 5+ years of experience building scalable applications.",
  knowledgePoints: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "System Design",
    "AWS",
    "Database Design",
  ],
  difficulty: "medium",
  language: "English",
  remainingTime: 30,
};

const sampleQAHistory = [
  {
    question: "Can you tell me a bit about yourself and your background?",
    answer:
      "I'm a software engineer with 6 years of experience. I've worked primarily with JavaScript and TypeScript, building web applications using React and Node.js. I've also worked with cloud platforms like AWS.",
    timestamp: new Date().toISOString(),
  },
  {
    question: "What excites you about this role?",
    answer:
      "I'm excited about the opportunity to work on challenging problems and contribute to a product that impacts many users. I'm also interested in learning more about system design at scale.",
    timestamp: new Date().toISOString(),
  },
];

async function runTest() {
  console.log(
    "Starting latency test with EXACT prompts from ai-interview-client...\n"
  );
  console.log(`API URL: ${DEEPSEEK_API_URL}\n`);

  const results = {
    decision: [],
    question: [],
    feedback: [],
  };

  console.log("Test 1: Decision API Calls (3 iterations)");
  console.log("=".repeat(60));
  for (let i = 1; i <= 3; i++) {
    const testQuestion =
      i === 1
        ? "Can you tell me about a challenging project you worked on?"
        : i === 2
        ? "How do you handle state management in React applications?"
        : "Explain the difference between SQL and NoSQL databases.";

    const testAnswer =
      i === 1
        ? "I worked on an e-commerce platform where I had to optimize the checkout process. I implemented caching strategies and database indexing which improved performance by 40%."
        : i === 2
        ? "I use Redux for complex state management and React Context for simpler cases. I also leverage custom hooks to encapsulate state logic."
        : "SQL databases are relational and use structured schemas, while NoSQL databases are more flexible and can handle unstructured data better.";

    const { systemMessage, humanMessage } = buildDecisionPrompt({
      question: testQuestion,
      answer: testAnswer,
      recentQAHistory: sampleQAHistory.slice(-2),
      consecutiveIrrelevantCount: 0,
      currentTopicFollowupCount: 0,
    });

    const result = await makeDecision(systemMessage, humanMessage);
    results.decision.push(result);

    if (result.success) {
      console.log(
        `Decision ${i}: ${result.latency.toFixed(2)}ms | Decision: ${
          result.data.decision
        } | Prompt: ${result.promptSize} chars | Response: ${
          result.responseSize
        } bytes`
      );
    } else {
      console.log(`Decision ${i}: FAILED - ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\nTest 2: Question API Calls - Streaming (3 iterations)");
  console.log("=".repeat(60));
  for (let i = 1; i <= 3; i++) {
    const phase = i === 1 ? "introduction" : i === 2 ? "project" : "technical";
    const decision = "movenext";

    const { systemMessage, humanMessage } = buildCreateQuestionPrompt({
      jobTitle: testConfig.jobTitle,
      jobDescription: testConfig.jobDescription,
      knowledgePoints: testConfig.knowledgePoints,
      difficulty: testConfig.difficulty,
      language: testConfig.language,
      remainingTime: testConfig.remainingTime,
      currentPhase: phase,
      decision: decision,
      qaHistory: sampleQAHistory,
      summary:
        i > 1
          ? "Candidate has good experience with React and Node.js. Shows interest in system design."
          : undefined,
      discussedProjects:
        i > 2
          ? [
              {
                name: "E-commerce Platform",
                technologies: ["React", "Node.js"],
                discussedInPhases: ["project"],
                technicalQuestionsAsked: [],
              },
            ]
          : undefined,
      introductionQuestionCount: phase === "introduction" ? i : 2,
      currentProjectQuestionCount: phase === "technical" ? 1 : 0,
    });

    const result = await createQuestion(systemMessage, humanMessage);
    results.question.push(result);

    if (result.success) {
      console.log(
        `Question ${i} (${phase}): Total: ${result.latency.toFixed(
          2
        )}ms | First Chunk: ${result.firstChunkTime?.toFixed(2)}ms | Chunks: ${
          result.chunkCount
        } | Content: ${result.contentLength} chars | Prompt: ${
          result.promptSize
        } chars`
      );
    } else {
      console.log(`Question ${i}: FAILED - ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\nTest 3: Feedback API Calls (3 iterations)");
  console.log("=".repeat(60));
  for (let i = 1; i <= 3; i++) {
    const phase = i === 1 ? "introduction" : i === 2 ? "project" : "technical";

    const { systemMessage, humanMessage } = buildCreateFeedbackPrompt({
      jobTitle: testConfig.jobTitle,
      knowledgePoints: testConfig.knowledgePoints,
      qaHistory: sampleQAHistory,
      summary:
        i > 1
          ? "Candidate has good experience with React and Node.js."
          : undefined,
      currentPhase: phase,
      discussedProjects:
        i > 2
          ? [
              {
                name: "E-commerce Platform",
                technologies: ["React", "Node.js"],
                discussedInPhases: ["project"],
                technicalQuestionsAsked: [],
              },
            ]
          : undefined,
      introductionQuestionCount: phase === "introduction" ? i : 2,
      currentProjectQuestionCount: phase === "technical" ? 1 : 0,
    });

    const result = await createFeedback(systemMessage, humanMessage);
    results.feedback.push(result);

    if (result.success) {
      console.log(
        `Feedback ${i} (${phase}): ${result.latency.toFixed(2)}ms | Prompt: ${
          result.promptSize
        } chars | Response: ${result.responseSize} bytes | NextPhase: ${
          result.data.nextPhase || "N/A"
        }`
      );
    } else {
      console.log(`Feedback ${i}: FAILED - ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n\nSummary Statistics");
  console.log("=".repeat(60));

  const calculateStats = (arr) => {
    const successful = arr.filter((r) => r.success);
    if (successful.length === 0) return null;

    const latencies = successful.map((r) => r.latency);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);

    const promptSizes = successful.map((r) => r.promptSize || 0);
    const avgPromptSize =
      promptSizes.reduce((a, b) => a + b, 0) / promptSizes.length;

    return {
      avg,
      min,
      max,
      count: successful.length,
      total: arr.length,
      avgPromptSize,
    };
  };

  const decisionStats = calculateStats(results.decision);
  if (decisionStats) {
    console.log("\nDecision API:");
    console.log(
      `  Success Rate: ${decisionStats.count}/${decisionStats.total}`
    );
    console.log(`  Avg Latency: ${decisionStats.avg.toFixed(2)}ms`);
    console.log(`  Min Latency: ${decisionStats.min.toFixed(2)}ms`);
    console.log(`  Max Latency: ${decisionStats.max.toFixed(2)}ms`);
    console.log(
      `  Avg Prompt Size: ${decisionStats.avgPromptSize.toFixed(0)} chars`
    );
  }

  const questionStats = calculateStats(results.question);
  if (questionStats) {
    const firstChunkTimes = results.question
      .filter((r) => r.success && r.firstChunkTime)
      .map((r) => r.firstChunkTime);
    const avgFirstChunk =
      firstChunkTimes.length > 0
        ? firstChunkTimes.reduce((a, b) => a + b, 0) / firstChunkTimes.length
        : null;

    console.log("\nQuestion API (Streaming):");
    console.log(
      `  Success Rate: ${questionStats.count}/${questionStats.total}`
    );
    console.log(`  Avg Total Latency: ${questionStats.avg.toFixed(2)}ms`);
    console.log(
      `  Avg First Chunk Time: ${
        avgFirstChunk ? avgFirstChunk.toFixed(2) : "N/A"
      }ms`
    );
    console.log(`  Min Latency: ${questionStats.min.toFixed(2)}ms`);
    console.log(`  Max Latency: ${questionStats.max.toFixed(2)}ms`);
    console.log(
      `  Avg Prompt Size: ${questionStats.avgPromptSize.toFixed(0)} chars`
    );
  }

  const feedbackStats = calculateStats(results.feedback);
  if (feedbackStats) {
    console.log("\nFeedback API:");
    console.log(
      `  Success Rate: ${feedbackStats.count}/${feedbackStats.total}`
    );
    console.log(`  Avg Latency: ${feedbackStats.avg.toFixed(2)}ms`);
    console.log(`  Min Latency: ${feedbackStats.min.toFixed(2)}ms`);
    console.log(`  Max Latency: ${feedbackStats.max.toFixed(2)}ms`);
    console.log(
      `  Avg Prompt Size: ${feedbackStats.avgPromptSize.toFixed(0)} chars`
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test completed!");
  console.log(
    "\nNote: These tests use the EXACT same prompts and API calls as the production code."
  );
}

if (typeof fetch === "undefined") {
  console.error("This script requires Node.js 18+ with native fetch support");
  process.exit(1);
}

runTest().catch(console.error);
