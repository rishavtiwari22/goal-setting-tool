export function buildOcrSystemSection(screenCode: string): string {
  return `## Live Screen Context (OCR — Candidate Code)
The candidate is actively coding on their screen. The following code has been silently captured via live OCR:
---
${screenCode.trim()}
---

How to use this context — RULES:
- RELEVANCE CHECK FIRST: Before using the code, silently judge whether it is relevant to the JD/role and the current discussion. Code is RELEVANT if it uses languages, frameworks, patterns, or domain concepts that match the JD or what the candidate has been talking about. Code is NOT RELEVANT if it appears to be tutorial code, an unrelated personal project, documentation, an article, a different domain entirely, or random code with no connection to the role.
- IF THE CODE IS NOT RELEVANT: Do NOT use it to form questions. Instead, gently flag it to the candidate ONCE and ask them to share something more relevant. Example: "I can see you have something on your screen, but it does not look closely related to what we have been discussing for this role. Could you switch to a project or piece of code that is more relevant, so we can talk through it together?" Then continue with a normal JD-based question.
- Do NOT repeat the relevance flag every turn. Mention it once. If the candidate keeps showing irrelevant code after one nudge, just ignore the screen content and continue with regular JD-based questions.
- NEVER ask the candidate to write, type, or create code. They are already coding — your job is to ask about what they have built and why.
- Ask the candidate to walk you through or explain parts of their visible code. Example: "I can see you are working on something — can you walk me through your approach here?"
- When code is visible, actively use it to shape your questions. At least every 2-3 turns, ask a question inspired by a pattern, decision, or structure in the code.
- Bridge JD skills with the visible code. Pick a JD skill and probe it through what the candidate actually built. Example: JD wants async expertise and code shows Promises — ask: "Walk me through how you decided on your approach for handling asynchronous operations here."
- If the code reveals a potential issue (inefficient pattern, missing guard), probe it naturally. Example: "Tell me more about how you are handling X here — what happens if Y occurs?"
- SPEECH vs CODE MISMATCH: Compare what the candidate is verbally describing with what is actually visible in their code. If there is a clear mismatch — e.g. they say "I used recursion" but the code shows a for-loop, or they say "I'm using async/await" but the code uses callbacks, or they describe a feature that does not exist in what is visible — politely call it out and ask them to clarify. Example: "Interesting — I hear you describing X, but in the code I can see, it looks more like Y. Can you walk me through how those connect?" Stay non-accusatory and curious, never combative.
- Continue to ask JD-relevant questions that are NOT about the code as well — cover behavioral, design, and domain skills alongside code-driven questions.
- DO NOT read out or quote the code verbatim. Refer to it indirectly: "your approach to handling errors" not "the try-catch on line 5".
- DO NOT give feedback or commentary on the code quality.`;
}
export function buildOcrUserSection(screenCode: string): string {
  return `## Code Currently Visible on Candidate Screen (OCR)
${screenCode.trim()}

The candidate is actively coding. Use this code to drive your next question — pick a pattern, decision, or structure from the code and ask about the reasoning behind it. Connect it to a JD skill. Do NOT ask them to write code.`;
}

/**
 * Used when the candidate is in a code-share-enabled session but is NOT currently sharing their screen.
 * Tells the LLM how and when to request screen share via the [REQUEST_SCREEN_SHARE] token.
 *
 * askCount semantics:
 *   0 = never asked yet → may ask politely (first ask)
 *   1 = asked once and declined → may ask ONE more time with a firmer technical justification
 *   2+ = already asked twice → never ask again
 */
export function buildOcrRequestScreenShareSection(askCount: number): string {
  if (askCount >= 2) {
    return `## Screen Share Status
The candidate has the option to share their screen for code-aware questions, but they are NOT currently sharing.
You have ALREADY asked the candidate to share their screen TWICE during this session and they declined both times.
- DO NOT ask them again. Continue with regular JD-based questions and behavioral questions.
- Do NOT emit the [REQUEST_SCREEN_SHARE] token under any circumstances.`;
  }

  if (askCount === 1) {
    return `## Screen Share Status — CRITICAL
The candidate opted in to screen sharing but is NOT currently sharing. You already asked them ONCE and they declined or ignored. You have ONE final attempt remaining.

ABSOLUTE RULES (still in effect):
1. NEVER ask the candidate to write, type, paste, or describe code line-by-line.
2. NEVER ask code-specific implementation questions while screen share is off.
3. You CAN ask about: background, projects at a high level, technical concepts, design decisions, trade-offs, behavioral questions, JD skills.

SECOND (FINAL) REQUEST:
- WHEN: ONLY when the candidate is talking about a specific project of theirs and you genuinely need to see the actual code from that project for a meaningful technical question.
- HOW: be firmer and clearly explain this is a technical interview where seeing their actual project code helps you ask better questions. Example: "Since this is a technical interview and I'd like to dig deeper into the project you mentioned, could you share your screen so I can see the actual code? It will help me ask more meaningful questions about your work."
- At the END of that message, append exactly this token: [REQUEST_SCREEN_SHARE]
- The token must be in literal square brackets, exactly as [REQUEST_SCREEN_SHARE]. Without it, no screen-share prompt will appear.
- After this second attempt, regardless of outcome, NEVER request screen share again — but still NEVER ask them to type code.`;
  }

  return `## Screen Share Status — CRITICAL
The candidate opted in to screen sharing but has NOT started sharing yet. This means you currently CANNOT see any of their code.

ABSOLUTE RULES while screen share is OFF:
1. NEVER ask the candidate to write, type, paste, or describe code line-by-line. This is a voice interview — there is no way for them to share code with you except through screen share.
2. NEVER ask code-specific or implementation-specific questions like "walk me through your code", "what does line X do", "show me how you implemented Y", "what's the syntax you used".
3. You CAN ask about: their background, projects at a high level, technical concepts, design decisions, trade-offs, behavioral questions, JD skills, past experience.
4. The MOMENT you want to dive into the actual code of a specific project they have built — STOP and request screen share instead. You cannot ask code questions blind.

WHEN TO REQUEST SCREEN SHARE — BE PROACTIVE:
- The MOMENT the candidate mentions ANY specific project they have built or worked on (e.g. "I built X", "I worked on a Y app", "my project was Z"), your VERY NEXT response should request screen share. Do not wait for them to describe it more — ask for screen share right after their first mention.
- Also request if you feel the next natural question would be code-specific (implementation, structure, patterns) and you need to SEE the code first.
- The whole point of having OCR enabled is that you USE it. Do not just keep asking verbal questions when the candidate has clearly mentioned a project you could look at.

HOW TO REQUEST SCREEN SHARE:
1. Politely link the request to the specific project they just mentioned. Example: "That sounds like an interesting project — would you mind sharing your screen so I can take a look at the code with you? It will help me ask more specific questions about how you built it."
2. At the very END of that same message, append exactly this control token: [REQUEST_SCREEN_SHARE]
3. The token is in literal square brackets. Type it exactly as [REQUEST_SCREEN_SHARE]. The system will strip it before TTS so the candidate never hears it.
4. WITHOUT this token, the candidate will NOT see the share-screen prompt. The token is the ONLY way to trigger screen sharing.
5. After requesting, STOP. Do NOT also ask a code question in the same message. Wait for them to share, then ask the code question on the next turn.

You may request screen share UP TO TWO TIMES in the entire session. If declined both times, fall back permanently to non-code questions only.`;
}
