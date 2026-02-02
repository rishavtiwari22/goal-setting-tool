// Latency measurement script for all backends using .env config
// Requires: Node 18+ (global fetch, streams)

const fs = require("fs");
const path = require("path");

function getPerformance() {
  if (typeof performance !== "undefined") return performance;
  try {
    const { performance } = require("node:perf_hooks");
    return performance;
  } catch {
    return { now: () => Date.now() };
  }
}

const perf = getPerformance();

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env not found in ai-interviewer-standalone-client");
  }
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadDotEnv();

const API_BASE_URL = env.VITE_API_BASE_URL;
const API_TOKEN = env.VITE_API_TOKEN;
const LAMBDA_URL = env.VITE_LAMBDA_API_URL;
const CF_URL = env.VITE_DEEPSEEK_API_URL;
const HF_URL = env.VITE_HUGGINGFACE_API_URL;
const HF_KEY = env.VITE_HUGGINGFACE_API_KEY;
const HF_MODEL = env.VITE_HUGGINGFACE_MODEL || "openai/gpt-oss-20b:groq";

if (!LAMBDA_URL || !CF_URL || !HF_URL || !HF_KEY) {
  console.error("Missing required VITE_* env vars in .env for latency script");
  process.exit(1);
}

const sampleConfig = {
  jobTitle: "Senior Software Engineer",
  jobDescription:
    "Senior software engineer with full‑stack, system design, and cloud experience.",
  knowledgePoints: [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "System Design",
    "Databases",
  ],
  difficulty: "medium",
  language: "English",
  remainingTime: 30,
};

const sampleQAHistory = [
  {
    question: "Can you tell me a bit about yourself and your background?",
    answer:
      "I'm a software engineer with 6 years of experience working on React and Node.js applications.",
    timestamp: new Date().toISOString(),
  },
  {
    question: "What excites you about this role?",
    answer:
      "I enjoy working on scalable systems and leading technical projects that have real user impact.",
    timestamp: new Date().toISOString(),
  },
];

function formatQASummary(qaHistory) {
  if (!qaHistory || qaHistory.length === 0) return "No previous questions.";
  return qaHistory
    .map(
      (qa, i) =>
        `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`
    )
    .join("\n\n");
}

function buildDecisionPrompt() {
  const systemMessage = `You are a technical interviewer. Decide whether to ask a follow‑up question, move to next topic, or end the interview.
You must answer ONLY in JSON: {"decision": "followup" | "movenext" | "end"}.`;
  const humanMessage =
    "Question: Tell me about a challenging project you worked on.\nAnswer: I built a scalable notification service on AWS using SQS and Lambda.";
  return { systemMessage, humanMessage };
}

function buildQuestionPrompt() {
  const k = sampleConfig.knowledgePoints.join(", ");
  const systemMessage = `You are a senior technical interviewer for the role "${sampleConfig.jobTitle}".
Job Description: ${sampleConfig.jobDescription}
Knowledge Areas: ${k}
Language: ${sampleConfig.language}
Remaining Time: ${sampleConfig.remainingTime} minutes

Generate the next technical interview question as a single sentence (no formatting).`;
  const humanMessage = formatQASummary(sampleQAHistory);
  return { systemMessage, humanMessage };
}

function buildFeedbackPrompt() {
  const systemMessage = `You are a technical interviewer providing feedback.
Generate JSON:
{
  "feedback": "short feedback string",
  "summary": "short summary string",
  "nextPhase": "introduction" | "project" | "technical" | "end"
}`;
  const humanMessage = formatQASummary(sampleQAHistory);
  return { systemMessage, humanMessage };
}

function buildSummaryPrompt() {
  const systemMessage = `You are a technical interviewer summarizing an interview.
Return JSON:
{
  "summary": "overall summary",
  "score": number,
  "conclusion": "hire / no-hire / lean-hire / lean-no-hire"
}`;
  const humanMessage = formatQASummary(sampleQAHistory);
  return { systemMessage, humanMessage };
}

function fmtMs(ms) {
  const msStr = ms.toFixed(2);
  const secStr = (ms / 1000).toFixed(2);
  return `${msStr}ms (${secStr} seconds)`;
}

function calcStats(arr) {
  if (!arr.length) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  const avg = sum / arr.length;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  return { avg, min, max };
}

function calcStatsMs(arr) {
  const stats = calcStats(arr);
  if (!stats) return null;
  return {
    avg: stats.avg,
    min: stats.min,
    max: stats.max,
  };
}

async function timeUnaryCall(fn) {
  const start = perf.now();
  const res = { success: false, error: null };
  try {
    await fn();
    res.success = true;
  } catch (e) {
    res.error = e.message || String(e);
  }
  const end = perf.now();
  return { ...res, latency: end - start };
}

async function timeStreamingCall(fn) {
  const start = perf.now();
  const res = { success: false, error: null, firstChunkTime: null };
  try {
    const { firstChunkTime } = await fn(start);
    res.success = true;
    res.firstChunkTime = firstChunkTime;
  } catch (e) {
    res.error = e.message || String(e);
  }
  const end = perf.now();
  res.totalTime = end - start;
  return res;
}

// ---------- Server API (check + jobs) ----------

async function measureServerApi() {
  if (!API_BASE_URL || !API_TOKEN) return null;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_TOKEN}`,
  };

  const userCheckRes = await timeUnaryCall(async () => {
    const url = `${API_BASE_URL}/user/check?email=latency-test@example.com`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text.slice(0, 200));
    }
  });

  const jobsListRes = await timeUnaryCall(async () => {
    const url = `${API_BASE_URL}/job`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text.slice(0, 200));
    }
  });

  return { userCheckRes, jobsListRes };
}

// ---------- Lambda backend (HF router via Lambda) ----------

async function lambdaDecision() {
  const { systemMessage, humanMessage } = buildDecisionPrompt();
  await fetch(LAMBDA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.1,
      max_tokens: 128,
    }),
  });
}

async function lambdaQuestionStreaming(startTimeHint) {
  const { systemMessage, humanMessage } = buildQuestionPrompt();
  const resp = await fetch(LAMBDA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 512,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text.slice(0, 200));
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Response body not readable");
  const decoder = new TextDecoder();
  let buffer = "";
  let firstChunkTime = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content && firstChunkTime === null) {
            firstChunkTime = perf.now() - startTimeHint;
          }
        } catch {
          // ignore parse errors for SSE chunks
        }
      }
    }
  }
  reader.releaseLock();
  return { firstChunkTime };
}

async function lambdaFeedback() {
  const { systemMessage, humanMessage } = buildFeedbackPrompt();
  await fetch(LAMBDA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.3,
      max_tokens: 512,
    }),
  });
}

async function lambdaSummary() {
  const { systemMessage, humanMessage } = buildSummaryPrompt();
  await fetch(LAMBDA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.4,
      max_tokens: 512,
    }),
  });
}

// ---------- Cloudflare/DeepSeek backend ----------

async function cfDecision() {
  const { systemMessage, humanMessage } = buildDecisionPrompt();
  await fetch(CF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.1,
      max_tokens: 128,
    }),
  });
}

async function cfQuestionStreaming(startTimeHint) {
  const { systemMessage, humanMessage } = buildQuestionPrompt();
  const resp = await fetch(CF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 512,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text.slice(0, 200));
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Response body not readable");
  const decoder = new TextDecoder();
  let buffer = "";
  let firstChunkTime = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content && firstChunkTime === null) {
            firstChunkTime = perf.now() - startTimeHint;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }
  reader.releaseLock();
  return { firstChunkTime };
}

async function cfFeedback() {
  const { systemMessage, humanMessage } = buildFeedbackPrompt();
  await fetch(CF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.3,
      max_tokens: 512,
    }),
  });
}

async function cfSummary() {
  const { systemMessage, humanMessage } = buildSummaryPrompt();
  await fetch(CF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: humanMessage },
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.4,
      max_tokens: 512,
    }),
  });
}

// ---------- Direct Hugging Face backend ----------

async function hfChat(body) {
  const resp = await fetch(HF_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text.slice(0, 200));
  }
  return resp;
}

async function hfDecision() {
  const { systemMessage, humanMessage } = buildDecisionPrompt();
  await hfChat({
    model: HF_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: humanMessage },
    ],
    response_format: { type: "json_object" },
    stream: false,
    temperature: 0.1,
    max_tokens: 128,
  });
}

async function hfQuestionStreaming(startTimeHint) {
  const { systemMessage, humanMessage } = buildQuestionPrompt();
  const resp = await hfChat({
    model: HF_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: humanMessage },
    ],
    stream: true,
    temperature: 0.5,
    max_tokens: 512,
  });
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Response body not readable");
  const decoder = new TextDecoder();
  let buffer = "";
  let firstChunkTime = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") {
          break;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content && firstChunkTime === null) {
            firstChunkTime = perf.now() - startTimeHint;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }
  reader.releaseLock();
  return { firstChunkTime };
}

async function hfFeedback() {
  const { systemMessage, humanMessage } = buildFeedbackPrompt();
  await hfChat({
    model: HF_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: humanMessage },
    ],
    response_format: { type: "json_object" },
    stream: false,
    temperature: 0.3,
    max_tokens: 512,
  });
}

async function hfSummary() {
  const { systemMessage, humanMessage } = buildSummaryPrompt();
  await hfChat({
    model: HF_MODEL,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: humanMessage },
    ],
    response_format: { type: "json_object" },
    stream: false,
    temperature: 0.4,
    max_tokens: 512,
  });
}

async function runBackend(label, backendFns) {
  const NUM_INTERVIEWS = 5;
  const QUESTIONS_PER_INTERVIEW = 4;

  const decisionLatencies = [];
  const qFirstChunkLatencies = [];
  const qTotalLatencies = [];
  const feedbackLatencies = [];
  const summaryLatencies = [];

  const perceivedDependentFirst = [];
  const perceivedParallelFirst = [];

  for (let i = 0; i < NUM_INTERVIEWS; i++) {
    for (let qIndex = 0; qIndex < QUESTIONS_PER_INTERVIEW; qIndex++) {
      const d = await timeUnaryCall(backendFns.decision);
      if (d.success) decisionLatencies.push(d.latency);

      const f = await timeUnaryCall(backendFns.feedback);
      if (f.success) feedbackLatencies.push(f.latency);

      const s = await timeUnaryCall(backendFns.summary);
      if (s.success) summaryLatencies.push(s.latency);

      const q = await timeStreamingCall(backendFns.questionStreaming);
      if (q.success && q.firstChunkTime != null) {
        qFirstChunkLatencies.push(q.firstChunkTime);
        qTotalLatencies.push(q.totalTime);

        // Perceived latencies:
        // 1) Dependent: question can only start after summary completes
        perceivedDependentFirst.push(s.latency + q.firstChunkTime);
        // 2) Parallel: summary & question start together, user waits for max
        perceivedParallelFirst.push(
          Math.max(s.latency, q.firstChunkTime)
        );
      }
    }
  }

  console.log(`${label}`);

  const decisionStats = calcStatsMs(decisionLatencies);
  if (decisionStats) {
    console.log("Decision API:");
    console.log(`Average: ${fmtMs(decisionStats.avg)}`);
    console.log(
      `Range: ${fmtMs(decisionStats.min).split(" ")[0]} - ${
        fmtMs(decisionStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Decision API: no successful calls");
  }

  const qFirstStats = calcStatsMs(qFirstChunkLatencies);
  const qTotalStats = calcStatsMs(qTotalLatencies);

  console.log("Question Generation (Streaming):");
  if (qFirstStats) {
    console.log(`First Chunk Average: ${fmtMs(qFirstStats.avg)}`);
    console.log(
      `First Chunk Range: ${fmtMs(qFirstStats.min).split(" ")[0]} - ${
        fmtMs(qFirstStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("First Chunk: no successful calls");
  }
  if (qTotalStats) {
    console.log(`Total Stream Average: ${fmtMs(qTotalStats.avg)}`);
    console.log(
      `Total Stream Range: ${fmtMs(qTotalStats.min).split(" ")[0]} - ${
        fmtMs(qTotalStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Total Stream: no successful calls");
  }

  const fbStats = calcStatsMs(feedbackLatencies);
  if (fbStats) {
    console.log("Feedback API:");
    console.log(`Average: ${fmtMs(fbStats.avg)}`);
    console.log(
      `Range: ${fmtMs(fbStats.min).split(" ")[0]} - ${
        fmtMs(fbStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Feedback API: no successful calls");
  }

  const sumStats = calcStatsMs(summaryLatencies);
  if (sumStats) {
    console.log("Summary API:");
    console.log(`Average: ${fmtMs(sumStats.avg)}`);
    console.log(
      `Range: ${fmtMs(sumStats.min).split(" ")[0]} - ${
        fmtMs(sumStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Summary API: no successful calls");
  }

  const perceivedDepStats = calcStatsMs(perceivedDependentFirst);
  const perceivedParStats = calcStatsMs(perceivedParallelFirst);

  console.log("Perceived Latency (Question First Chunk):");
  if (perceivedDepStats) {
    console.log(
      `Dependent on Summary (sequential) Average: ${fmtMs(
        perceivedDepStats.avg
      )}`
    );
    console.log(
      `Dependent Range: ${fmtMs(perceivedDepStats.min).split(" ")[0]} - ${
        fmtMs(perceivedDepStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Dependent on Summary: no successful calls");
  }
  if (perceivedParStats) {
    console.log(
      `Parallel with Summary (max wait) Average: ${fmtMs(
        perceivedParStats.avg
      )}`
    );
    console.log(
      `Parallel Range: ${fmtMs(perceivedParStats.min).split(" ")[0]} - ${
        fmtMs(perceivedParStats.max).split(" ")[0]
      }`
    );
  } else {
    console.log("Parallel with Summary: no successful calls");
  }

  console.log("");
}

async function main() {
  if (typeof fetch === "undefined") {
    console.error("Node 18+ with global fetch is required");
    process.exit(1);
  }

  // Server API measurements (single call each)
  if (API_BASE_URL && API_TOKEN) {
    const server = await measureServerApi();
    if (server) {
      console.log("Server API");
      if (server.userCheckRes.success) {
        console.log(
          `User Check: ${fmtMs(server.userCheckRes.latency)}`
        );
      } else {
        console.log(`User Check: FAILED (${server.userCheckRes.error})`);
      }
      if (server.jobsListRes.success) {
        console.log(
          `Jobs List: ${fmtMs(server.jobsListRes.latency)}`
        );
      } else {
        console.log(`Jobs List: FAILED (${server.jobsListRes.error})`);
      }
      console.log("");
    }
  }

  await runBackend(
    `Lambda HF API (${HF_MODEL})`,
    {
      decision: lambdaDecision,
      questionStreaming: lambdaQuestionStreaming,
      feedback: lambdaFeedback,
      summary: lambdaSummary,
    }
  );

  await runBackend(
    "Cloudflare Deepseek Worker (deepseek-chat)",
    {
      decision: cfDecision,
      questionStreaming: cfQuestionStreaming,
      feedback: cfFeedback,
      summary: cfSummary,
    }
  );

  await runBackend(
    `Direct HuggingFace API (${HF_MODEL})`,
    {
      decision: hfDecision,
      questionStreaming: hfQuestionStreaming,
      feedback: hfFeedback,
      summary: hfSummary,
    }
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

