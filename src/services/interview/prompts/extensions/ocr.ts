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
    return `## Screen Share Status
The candidate has the option to share their screen, but they are NOT currently sharing.
You have already asked them ONCE to share their screen and they declined or ignored. You are allowed ONE more attempt — but only at the right moment.
- WHEN to make the second (final) ask: ONLY when the candidate is talking about a specific project of theirs and you genuinely need to see the actual code from that project to ask a meaningful technical question. Do NOT ask again for general/conceptual code questions.
- HOW to ask the second time: be firmer and clearly explain that this is a technical interview and seeing their actual project code helps you ask better, more relevant questions. Example: "Since this is a technical interview and I'd like to dig deeper into the project you mentioned, could you share your screen so I can see the actual code? It will help me ask more meaningful questions about your work."
- After this second ask, append [REQUEST_SCREEN_SHARE] at the END of your message (it will be stripped before TTS).
- After this second attempt, regardless of outcome, NEVER ask again.
- For all other questions, continue normally without asking for screen share.`;
  }

  return `## Screen Share Status
The candidate has the option to share their screen, but they are NOT currently sharing.
- For most questions, continue with regular JD-based questions.
- WHEN to ask for screen share: ONLY when the candidate is describing a specific project of theirs (something they have built or worked on), and you want to see the ACTUAL CODE from that project to ask deeper, more grounded questions. Do NOT ask for screen share to discuss general concepts, hypothetical code, or things the candidate is not currently talking about.
- HOW to ask: politely connect the request to the specific project they mentioned. Example: "That sounds like an interesting project — would you mind sharing your screen so I can take a look at the code? It will help me ask more specific questions about how you built it."
- At the END of that same message, append the special control token [REQUEST_SCREEN_SHARE] (do not say it out loud, the system will strip it).
- Then STOP — wait for them to actually share before asking your code question.
- You may ask for screen share UP TO TWO TIMES total in the entire session. If they decline both times, never ask again.
- Do NOT emit the token if you are happy with non-code questions for the current topic.`;
}
