# AI Interviewer Standalone Client – System Design

**Scope**: React SPA for AI-driven voice interviews in the browser. This doc describes architecture, services, speech pipeline, and cross-cutting concerns.

---

## 1. Overview and goals

- **Client-only execution**: Interview flow (questions, answers, decisions) runs in the browser; no server during the live session.
- **Local-first storage**: Sessions in `localStorage` first; Firebase for sync and recovery only.
- **Streaming AI**: Questions and decisions from Lambda; streaming for questions.
- **Speech-to-speech**: User speaks (STT), hears AI (TTS); app coordinates so STT/TTS do not overlap.

---

## 2. System context

**Actors**: Candidate (Self Apply / Invited, interview, results); Admin (dashboard, users, recruitment, jobs after role check).

**External systems**: Backend API (`VITE_API_BASE_URL`) — user, jobs, auth. Lambda (`VITE_LAMBDA_API_URL`) — questions, decisions, feedback, summary. Firebase (optional) — Firestore sync, admin role lookup. Analytics — GA4 + Mixpanel (initialized from `main.tsx`).

**Boundary**: Single static client; calls external APIs and uses browser storage + optional Firebase.

---

## 3. Technology stack

| Layer | Choice | Role |
|-------|--------|------|
| Runtime / language | Browser, TypeScript | SPA, typed models |
| Framework / build | React 19, Vite 7 | UI, dev/bundle |
| Routing / styling | react-router-dom 7, Tailwind 4 | Routes, guards, CSS |
| UI / content | Radix, react-markdown, framer-motion | Components, markdown, animation |
| STT | Web Speech API | Speech recognition; answer commit via 1.5s silence |
| TTS | @mintplex-labs/piper-tts-web | Piper; sentence queue, Web Audio |
| ONNX | onnxruntime-web | Piper runtime (local WASM); VAD not used |
| Storage | localStorage, Firebase Firestore (optional) | Session persistence, sync |
| Analytics | GA4, Mixpanel | Events, page views |

**Note**: `utils/stt/vadController.ts` (VAD) and `workers/feedbackWorker.ts` exist but are not used in the current pipeline.

---

## 4. Application structure

### 4.1 Bootstrap

- **index.html**: Mixpanel stub + gtag in `<head>`; root `#app`; script `/src/main.tsx`.
- **main.tsx**: `validateEnvironment()` (required: `VITE_API_BASE_URL`, `VITE_API_TOKEN`, `VITE_LAMBDA_API_URL`); on failure, full-screen error, no mount. Then `initializeAnalytics()` (1s delay), optional `trackTokenEntry(token)` if URL has token. Renders `<App />`, `<Toaster />`.
- **App.tsx**: `BrowserRouter`; `usePageTracking()`; on mount `ensureVoiceReady()` (Piper), `cleanupSyncedSessions()`. Routes (see table below). COEP/COOP required for Piper (dev/preview/build).

### 4.2 Routing and guards

| Path | Guard | Page |
|------|-------|------|
| `/`, `/selfapply`, `/interview/:sessionId?`, `/results/:sessionId?` | AuthGuard | Home, SelfApply, Interview, Results |
| `/data-policy`, `/interview/invited` | none | DataPolicy, InvitedInterview |
| `/admin`, `/admin/users`, `/admin/recruitment`, `/admin/jobs` | AdminAuthGuard | AdminDashboard, AdminUserList, AdminRecruitment, AdminJobs |

- **AuthGuard**: Token from `searchParams.token/jwt` or `localStorage.studentToken`. If URL has token → render children. Else `isTokenValid(token)`; invalid → clear storage, redirect to zuvy.org with returnUrl.
- **AdminAuthGuard**: Valid `studentToken` → JWT email → Firestore `users` where `email==` → require `role==='admin'`; else redirect `/`. Shows spinner while checking. Firebase optional (if unavailable, redirect).

---

## 5. Data models

- **User**: `user_id`, `email`, optional `name`. **UserCheckResponse**: `exists`, optional `user`.
- **Job**: `job_id`, `job_title`, `job_description`, `technical_skills[]`, `soft_skills[]`, optional `is_public`.
- **Interview**: **InterviewPhase** `'introduction'|'project'|'technical'`. **QAHistoryItem** `question`, `answer`, `score`, `isCorrect`, `timestamp`, optional `questionId`. **InterviewSession**: identity (sessionId, userId, jobId, jobTitle, jobDescription), time (startTime, endTime?, remainingTime, interviewTime), flow (qaHistory, currentPhase, status, feedbackHistory?, summary?), config (language, difficulty, examinationPoints), result?, userFeedback?, irrelevant-answer counters (consecutiveIrrelevantCount, currentTopicFollowupCount), phase-3 (discussedProjects, currentProjectIndex, phase question counts). **InterviewResult**: summary, score, conclusion, totalQuestions, correctAnswers, elapsedTime, topStrengths?, improvementAreas?. **DecisionResponse**: decision `'followup'|'movenext'|'end'|'retry'`, optional feedback. **FeedbackResponse**: feedback, summary, nextPhase?, currentProjectComplete?, projectsMentioned?.

---

## 6. Environment and build

**Required**: `VITE_API_BASE_URL`, `VITE_API_TOKEN`, `VITE_LAMBDA_API_URL`. **Optional** (via `utils/env.ts`): HuggingFace, GA4, Firebase (`VITE_FIREBASE_*`), `VITE_ADMIN_API_BASE_URL`. Missing optional → `''`; callers treat as disabled.

**Vite**: Plugins `serveOrtFiles` (/ort from onnxruntime-web), `patchPiperTtsWeb` (CDN → /ort/). Alias `@` → src; exclude onnx/piper from optimizeDeps; server/preview COOP/COEP; proxy `/api/deepseek`; build `assetsInlineLimit: 0`.

**Commands**: `npm run dev` | `build` (tsc + vite build) | `preview`; `test:latency`, `test:lambda`. Deploy static; production needs COOP/COEP and `VITE_*` at build time.

---

## 7. API layer

### 7.1 Lambda / DeepSeek (`services/api/deepseekApi.ts`)

- **Base**: `ENV.LAMBDA_API_URL()`, model `ENV.HUGGINGFACE_MODEL()` or `'tgi'`. POST body: `{ model, messages, stream?, temperature?, max_tokens?, response_format? }`.
- **streamResponse(response)**: Read body, split lines; skip Lambda metadata line; for `data: ` lines yield `choices[0].delta.content`; stop on `[DONE]`.
- **makeDecision**: Non-stream, temp 0.1, max_tokens 10; parse content, first of `followup`|`movenext`|`end` wins, default `movenext`.
- **createQuestion**: Stream, temp 0.5; yield chunks via streamResponse.
- **createFeedback**: Non-stream, `response_format: json_object`, temp 0.3; return feedback, summary, nextPhase?, currentProjectComplete?, projectsMentioned?.
- **summarizeInterview**: Non-stream, json_object, temp 0.5; strip metadata/code blocks; return summary, score, conclusion, topStrengths?, improvementAreas?; on parse error return safe defaults.

### 7.2 Server API (`serverApi.ts`)

- **Base** + Bearer `ENV.API_TOKEN()`. `fetchWithAuth`: GET, check `data.code === "0"`. Endpoints: `checkUser(email)`, `getUser(userId)`, `getJobs()` / `getJob(jobId)` with admin API fallback.

### 7.3 Admin API (`adminApi.ts`)

- **Base** `ADMIN_API_BASE_URL`; auth `studentToken` or API_TOKEN. Invitations (list, create, bulk, update status); jobs (list, get, create, update, delete).

### 7.4 Invitation API (`invitationApi.ts`)

- **validateInvitationToken(token)**: POST validate-token (no auth) → job + user_token etc. **updateInvitationStatus**: PATCH with studentToken.

---

## 8. Interview engine

### 8.1 InterviewStateManager (`services/interview/interviewStateManager.ts`)

- **Config** `InterviewConfig`: userId, jobId, jobTitle, jobDescription, interviewTime, language, difficulty, examinationPoints.
- **Construct**: Load by sessionId from interviewStorage if ongoing; else new session (`session_${Date.now()}_${random}`). Migrate missing fields (counters, discussedProjects, phase counts). Every change → `saveSession()` (remainingTime, localStorage, optional syncManager.syncSession).
- **kickoff(onChunk)**: Time check; build movenext question prompt; stream apiCreateQuestion; return { question, sessionId } or end message.
- **decision(question, answer)**: Time/explícit-end check; build decision prompt (last 3 Q/A, counters); makeDecision → **applyCounterLogic**: end → irrelevantCount, retry until >2 then goodbye; followup → topicFollowupCount, movenext if ≥3; movenext/retry → reset or increment; save.
- **createQuestion(decision, q, a, onChunk)**: Build phase/decision prompt; stream question; save; return { question }.
- **createFeedback()**: Increment phase question count; apiCreateFeedback; update summary, phase, discussedProjects; optional syncManager.syncFeedbackItem; save.
- **endAndGenerateSummary()**: status completed; build summarize prompt; resultGenerationStatus.setGenerating; summarizeInterview; set session.result; save; setComplete.
- **manageInterviewState**: `kickoff` (onChunk); `processAnswer` (question, answer, onChunk) — append QA, save, sync QA, decision → createQuestion → createFeedback (background), return decision + nextQuestion; `end` → endAndGenerateSummary.

### 8.2 PromptBuilder (`services/interview/promptBuilder.ts`)

- Formatters: formatQAHistory, formatQASummary, formatRecentQAForDecision, formatDiscussedProjects.
- **buildDecisionPrompt**: System rules + counters + remaining time; human recent Q/A + current Q/A; output one word.
- **buildCreateQuestionPrompt**: Per phase and decision (followup/movenext/retry) system templates; placeholders job_title, knowledge_points, remaining_time, discussed_projects_context, intro_question_count, current_project_question_count, etc.
- **buildCreateFeedbackPrompt**: Per phase; JSON feedback, summary, nextPhase; technical adds currentProjectComplete, projectsMentioned.
- **buildSummarizePrompt**: Role, job, knowledge points, duration, language; JSON summary, conclusion, topStrengths, improvementAreas.

---

## 9. Storage and sync

### 9.1 Local storage (`services/storage/interviewStorage.ts`)

- **Keys**: `interview_session_${sessionId}`, `interview_history`. Save: setItem session, addToHistory (upsert, cap 50); if userId → syncManager.syncSession. QuotaExceeded → cleanupSyncedSessions then retry. Load by sessionId; getInterviewHistory. Recovery: recoverSessionFromFirebase / recoverOngoingSessionFromFirebase (fetch Firestore, write local). **cleanupSyncedSessions**: Keep 10 most recent completed+synced within 30 days; drop older session docs; rewrite history. saveInterviewResult; clearInterviewSession / clearInterviewHistory.

### 9.2 Firebase (`services/storage/firebaseStorage.ts`, `firebase/schema.ts`)

- **Paths**: user id = first 32 hex of SHA-256(lowercase email). `users/{id}`, `users/{id}/sessions/{sessionId}`, `.../qaItems/{qaId}`, `.../feedback/{feedbackId}`, `.../userFeedback/feedback`.
- **Writes**: createUserDocument, createSessionDocument, updateSessionDocument (merge), createQAItemDocument, createFeedbackItemDocument, createUserFeedbackDocument; retryWithBackoff(3); on failure enqueue writeQueue, rethrow.
- **Reads**: getSessionFromFirebase (session + qaItems by timestamp); getOngoingSessionsFromFirebase (status==ongoing, limit 10). **batchWriteQueueItems**: writeBatch over queue items → user/session/qa/feedback docs.

### 9.3 Sync pipeline

- **WriteClassifier**: Session critical if isInitialCreate or status→completed or result set; user critical if isInitialCreate; else normal.
- **WriteQueue**: localStorage key `firebase_write_queue`; max 100; enqueue by sessionId+operation (replace); getCriticalItems / getNormalItems; removeItem; persist on change.
- **SyncManager**: syncSession — classify; critical → createUser (if initial), create/updateSession; failure → enqueue critical, trigger worker; normal → enqueue, trigger. syncQAItem / syncFeedbackItem — try Firestore; failure → enqueue normal, trigger. syncUser — critical direct create else enqueue.
- **SyncWorker**: online → triggerSync; offline → clear timer; visibility hidden / beforeunload → flushSync. processBatch(10): critical then normal; batchWriteQueueItems; success → markSynced, remove from queue; failure → incrementFailedWrites. sync() debounced 5s; flushSync drains queue.
- **SyncStatus**: localStorage `sync_status_${sessionId}`; lastSyncedAt, pendingWrites, failedWrites, syncInProgress, fieldSyncStatus; helpers markSynced, setSyncInProgress, etc.

---

## 10. Speech pipeline

### 10.1 STT – ResetSTTLogic (`utils/stt/sttLogic.ts`)

- Web Speech API; onLog, onTranscript; options sessionDurationMs (default 30s), interimSaveIntervalMs, preserveTranscriptOnStart. start/stop/destroy; auto-restart by mic time; preserve transcript across restarts; interim save; repeat collapse; getFullTranscript, clearTranscript. setVadCallbacks exists but unused (VAD removed).

### 10.2 TTS – Piper (`lib/ort-setup.ts`, `lib/piper.ts`)

- **ort-setup**: WASM paths `/ort/`, numThreads 1; set globalThis.ort before Piper.
- **Piper**: ort-setup then piper-tts-web; backend `cpu`, voice `en_US-hfc_female-medium`. Per-backend state (ortReady, voiceReady, warmed); corrupt model → clear cache, re-download. preparePiperVoice: ORT + load voice (IndexedDB) + warm-up. streamTokensToSpeech: sentence boundaries `.!?`, force 500 chars; queue → synthesize → Web Audio; handle stop(), finished; callbacks onStatus, onAudioChunkStart/End, onPlayFinished.

### 10.3 Unused

- **VAD** (`utils/stt/vadController.ts`): Not imported. Answer commit uses Web Speech + 1.5s silence in useSpeechRecognition only.
- **feedbackWorker.ts**: Not used; feedback is created in-process in InterviewStateManager.

---

## 11. Hooks

- **useSpeechRecognition(onSpeechResult, enabled)**: Single ResetSTTLogic; on transcript → 1.5s silence timer → getFullTranscript → onSpeechResult; start/stop/pause/resume; resume 100ms after TTS for handoff. State: isListening, isSpeechMode, permissionGranted; checkMicPermission.
- **useStreamingTTS**: addChunk (buffer → sentences `.!?` or 500 chars → queue); processQueue → synthAndPlayChunk (ensureReady, streamTokensToSpeech); finishStreaming (flush, poll until done, onStopSpeaking); stop; clearCaption. State: isReady, isSpeaking, isActuallyPlaying, currentlySpokenText.
- **useInterview(config, sessionId, onComplete, onStreamChunk, onStreamComplete, onFeedback)**: Creates InterviewStateManager once; restores messages from session; 1s timer remainingTime/handleTimeUp. startInterview → manageInterviewState('kickoff', onChunk) → chunks to onStreamChunk (TTS). submitAnswer → append message, manageInterviewState('processAnswer', …) → onStreamChunk, onFeedback(decision.feedback); on decision 'end' → manageInterviewState('end'), saveInterviewResult, onComplete. Returns messages, isLoading, isCompleted, remainingTime, submitAnswer, currentQuestion, sessionId.
- **usePageTracking**: useLocation → trackPageView(path, dynamicTitle); route→title + domain branding.
- **useScreenWakeLock(enabled)**: navigator.wakeLock.request('screen'); re-request on visibility visible; release on unmount/disabled.

---

## 12. Cross-cutting

- **Analytics** (`services/analytics`): initializeAnalytics (Mixpanel stub then both). trackEvent, trackPageView, trackInterviewStart, trackInterviewComplete, trackJobSelection, trackUserEngagement → GA4 + Mixpanel; identifyUser (Mixpanel). GA4: gtag, trackTokenEntry. Mixpanel: init, track, people.set.
- **resultGenerationStatus**: Singleton setGenerating(sessionId), setComplete(sessionId); isCurrentlyGenerating(sessionId?), subscribe(listener). Used by InterviewStateManager and Results UI.

---

## 13. End-to-end flows

**Bootstrap**: Env validate → analytics init → App mount → Piper ensureVoiceReady, cleanupSyncedSessions → routes.

**Interview (STS)**: Question: AI stream → onStreamChunk → useStreamingTTS.addChunk → sentence queue → Piper → playback; Interview page pauseListening on TTS start, resumeListening on TTS stop. Answer: user speech → Web Speech (ResetSTTLogic) → 1.5s silence → onSpeechResult → submitAnswer → decision → createQuestion (stream) + createFeedback (background) or end → endAndGenerateSummary.

**Storage**: On session change → localStorage save → SyncManager.syncSession (classify → Firestore or enqueue) → SyncWorker processBatch (critical then normal, 5s debounce); visibility/beforeunload flushSync.

---

## 14. Interview flow (user perspective)

Step-by-step from the moment the user runs the interviewer: APIs, prompts, Piper, STT, and storage. Component details are in the sections referenced below.

### 14.1 Page load and session setup

1. **User navigates to `/interview` or `/interview/:sessionId`** (e.g. from Self Apply or resume).
2. **Interview page** reads config: from `sessionStorage.interviewConfig` (Self Apply) or, if only `sessionId` in URL, loads session via `loadInterviewSessionBySessionId(sessionId)` or `recoverSessionFromFirebase(email, sessionId)`; builds `InterviewConfig` from session.
3. **useInterview** (see §11): When `config` is set, creates `InterviewStateManager(config, sessionId)` once. If `sessionId` given, loads session from interviewStorage; if found and ongoing, restores and migrates fields; else or no sessionId, new session (`session_${Date.now()}_${random}`). If existing session has qaHistory, restores `messages` and `currentQuestion` from it. If no existing session or qaHistory empty, calls `startInterview()`.
4. **Storage**: New session → `saveSession()` → `saveInterviewSessionBySessionId(session, true)` → localStorage `interview_session_${sessionId}`, `addToHistory(session)`; if userId, `syncManager.syncSession(userId, session, true)` (classify → critical: createUserDocument, createSessionDocument; see §9).

### 14.2 First question (kickoff)

5. **startInterview()** calls `manageInterviewState('kickoff', { onChunk })`. `onChunk` in Interview page: updates `currentQuestion` and `messages` in useInterview state, and calls `onStreamChunk(chunk)` which is `addTtsChunk(chunk)` when speech output is enabled.
6. **InterviewStateManager.kickoff(onChunk)**:
   - **Input**: Session state (jobTitle, jobDescription, examinationPoints, difficulty, language, remainingTime, currentPhase `'introduction'`, qaHistory `[]`, summary, discussedProjects, introductionQuestionCount `0`, currentProjectQuestionCount `0`).
   - **Prompt**: `buildCreateQuestionPrompt({ …, decision: 'movenext', qaHistory: [], currentPhase: 'introduction', … })`. System: `CREATE_QUESTION_MOVENEXT_INTRO_SYSTEM` (job_title, job_description, knowledge_points, difficulty, language, remaining_time, intro_question_count 0) — “senior technical interviewer”, 2–3 intro questions, build rapport, generate next introduction question. Human: `formatQASummary([], …)` → `"No previous questions and answers."`.
   - **API**: `createQuestion(systemMessage, humanMessage)` (see §7.1). POST to `LAMBDA_API_URL`, body `{ model, messages: [{ role: 'system', content }, { role: 'user', content }], stream: true, temperature: 0.5 }`. Response: SSE stream; `streamResponse(response)` skips Lambda metadata line, for each `data: ` line yields `choices[0].delta.content`.
   - **Output**: Each chunk yielded → `onChunk(chunk)` → Interview page: (a) useInterview accumulates in `currentQuestion` and updates messages list, (b) `addTtsChunk(chunk)`.
7. **Piper (TTS)** — see §10.2:
   - **addTtsChunk(chunk)**: Append to `textBuffer`. While buffer has sentence end (`.!?`) or length ≥500: extract sentence/chunk, push to `ttsQueue`, call `processQueue()`.
   - **processQueue()** → **synthAndPlayChunk(text)**: `ensureReady()` (load Piper voice if needed); split text into tokens (whitespace); `streamTokensToSpeech(tokens, { … })` → Piper synthesizes, Web Audio plays. Callbacks: `onAudioChunkStart` / `onAudioChunkEnd` / `onPlayFinished`.
   - **Interview page**: `onStartSpeaking` → `pauseListening()` (STT stopped so user does not hear themselves in the mic). `onStopSpeaking` → if not pendingSessionRef and not completed, `resumeListening()` (100ms delay in useSpeechRecognition).
8. **After kickoff stream ends**: useInterview’s startInterview() awaits the kickoff promise, then calls `onStreamComplete()` → Interview page calls `finishTtsStreaming()`. **finishStreaming**: Flush remaining `textBuffer` into `ttsQueue`, processQueue; poll until queue empty and not processing → set isStreamComplete, `onStopSpeaking()` → `resumeListening()` so user can answer.
9. **Persistence**: kickoff ends with `saveSession()` → localStorage update, syncManager.syncSession (session doc; usually normal priority after first save).

### 14.3 One answer cycle (after user speaks)

10. **User speaks**. ResetSTTLogic (see §10.1) produces interim then final transcript; useSpeechRecognition sets 1.5s silence timer; on timeout calls `getFullTranscript()`, stops recognition, invokes `onSpeechResult(fullTranscript)`.
11. **Interview page** `onSpeechResult(text)`: `clearCaption()`, `submitAnswer(text)`.
12. **submitAnswer(answer)** (useInterview): Appends user message to `messages`. Calls `manageInterviewState('processAnswer', { answer, question: currentQuestion, onChunk })`.
13. **InterviewStateManager.processAnswer**:
    - **Append QA**: Push `{ question, answer, score: 0, isCorrect: false, timestamp, questionId }` to `session.qaHistory`. `saveSession()` (localStorage + syncManager.syncSession). If userId, `syncManager.syncQAItem(userId, sessionId, qaItem, currentPhase)` (Firestore subcollection or enqueue; see §9).
    - **Decision**:
      - **Input**: question, answer, recentHistory = last 3 from qaHistory, consecutiveIrrelevantCount, currentTopicFollowupCount, remainingTime.
      - **Prompt**: `buildDecisionPrompt({ question, answer, recentQAHistory, consecutiveIrrelevantCount, currentTopicFollowupCount, remainingTime })`. System: decision rules (movenext / followup / end), counters, “Respond with ONLY ONE WORD: followup OR movenext OR end”. Human: “Context: Remaining Time: N minutes”, recent Q/A, then “Question: … Answer: …”.
      - **API**: `makeDecision(systemMessage, humanMessage)`. POST same Lambda URL, non-stream, `temperature: 0.1`, `max_tokens: 10`. Parse first JSON line, read `choices[0].message.content`, normalize to lowercase; first of `followup`|`movenext`|`end` wins; default `movenext`. **applyCounterLogic**: e.g. end → increment irrelevant count, return `retry` until >2 then end with goodbye; followup → increment topic followup, force movenext if ≥3; movenext → reset both counters. **Output**: `DecisionResponse { decision, feedback? }`.
    - If `decision === 'end'`: return `{ decision }`; caller (useInterview) will then run end flow (step 18).
14. **Next question** (when decision is followup/movenext/retry):
    - **Input**: decision, currentQuestion, currentAnswer, session (currentPhase, qaHistory including this QA, summary, discussedProjects, phase counts, consecutiveIrrelevantCount for retry).
    - **Prompt**: `buildCreateQuestionPrompt({ decision, question, answer, qaHistory, currentPhase, introductionQuestionCount, currentProjectQuestionCount, discussedProjects, consecutiveIrrelevantCount, … })`. System template: by phase + decision (e.g. followup intro/project/technical, movenext intro/project/technical, retry with warning_message/warning_instruction, bad_answer_count). Human: `formatQASummary(qaHistory, useSummary, summary)` or for followup “Current Question: … Candidate's Answer: …” + context.
    - **API**: `createQuestion(systemMessage, humanMessage)` — same streaming POST as kickoff. Chunks → `onChunk(chunk)` → same path as step 6–7: useInterview state + `addTtsChunk(chunk)` → Piper sentence queue → synthesis → playback; pauseListening on TTS start, resumeListening on TTS stop.
    - **Output**: Full question text returned; session saved.
15. **Feedback (background)** — not awaited: `createFeedback()`:
    - **Increment**: introductionQuestionCount or projectQuestionCount or technicalQuestionCount + currentProjectQuestionCount (by currentPhase).
    - **Prompt**: `buildCreateFeedbackPrompt({ jobTitle, knowledgePoints, qaHistory, summary, currentPhase, discussedProjects, introductionQuestionCount, currentProjectQuestionCount })`. System: per-phase (intro: stay intro if <2 questions, else project; project: feedback + summary + nextPhase project|technical; technical: feedback, summary, nextPhase, currentProjectComplete, projectsMentioned). Human: `formatQASummary(qaHistory, useSummary, summary)`.
    - **API**: `createFeedback(systemMessage, humanMessage)`. POST same Lambda, non-stream, `response_format: { type: 'json_object' }`, `temperature: 0.3`. Parse JSON from content → `{ feedback, summary, nextPhase?, currentProjectComplete?, projectsMentioned? }`.
    - **Session update**: Append feedback to feedbackHistory; set session.summary; set currentPhase from nextPhase; if currentProjectComplete, advance currentProjectIndex, reset currentProjectQuestionCount; if projectsMentioned, update discussedProjects; optional syncManager.syncFeedbackItem; saveSession().
16. **useInterview after processAnswer**: If `result.decision.feedback` is set (e.g. goodbye on end), calls `onFeedback(result.decision.feedback)` → Interview page: `addTtsChunk(feedback)`, `finishTtsStreaming()` so user hears the message. If `result.decision === 'end'`: set completed, append feedback message to messages, then `manageInterviewState('end')` (step 18). If `result.nextQuestion` contains "【Interview ended", handleTimeUp() (same end path).

### 14.4 End of interview

17. **Decision 'end'** (or time up / explicit “end the call”): User may hear goodbye via onFeedback → addTtsChunk + finishTtsStreaming; onStopSpeaking can set pendingSessionRef and navigate to results after TTS (Interview page).
18. **manageInterviewState('end')** → **endAndGenerateSummary()**:
    - **Session**: status `'completed'`, endTime set.
    - **Prompt**: `buildSummarizePrompt({ jobTitle, jobDescription, knowledgePoints, qaHistory, interviewTime, language })`. System: “world-class software technology expert”, job description, knowledge points, duration, language; output JSON only (summary, conclusion, topStrengths, improvementAreas; exact structure in prompt). Human: full `formatQAHistory(qaHistory)`.
    - **API**: `summarizeInterview(systemMessage, humanMessage)`. POST same Lambda, non-stream, `response_format: { type: 'json_object' }`, `temperature: 0.5`. Parse JSON (strip metadata/code blocks if needed); return summary, score, conclusion, topStrengths, improvementAreas; on parse error return safe defaults.
    - **Session**: Set session.result (summary, score, conclusion, totalQuestions, correctAnswers, elapsedTime, topStrengths, improvementAreas). resultGenerationStatus.setGenerating(sessionId); then setComplete(sessionId). saveSession() → localStorage + syncManager.syncSession (critical: status completed, result set).
19. **useInterview**: saveInterviewResult(sessionId, result) (update session in storage, sync, cleanupSyncedSessions). onComplete(session) → Interview page: store session in sessionStorage, set pendingSessionRef if TTS enabled; when TTS finishes goodbye, onStopSpeaking navigates to `/results` (or timeout 5s). Results page loads by sessionId and shows session.result.
