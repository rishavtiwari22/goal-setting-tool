export function buildOcrSystemSection(screenCode: string): string {
  return `## Live Screen Context (OCR — Candidate Code)
The candidate is actively coding on their screen. The following code has been silently captured via live OCR:
---
${screenCode.trim()}
---

How to use this context — RULES:
- NEVER ask the candidate to write, type, or create code. They are already coding — your job is to ask about what they have built and why.
- Ask the candidate to walk you through or explain parts of their visible code. Example: "I can see you are working on something — can you walk me through your approach here?"
- When code is visible, actively use it to shape your questions. At least every 2-3 turns, ask a question inspired by a pattern, decision, or structure in the code.
- Bridge JD skills with the visible code. Pick a JD skill and probe it through what the candidate actually built. Example: JD wants async expertise and code shows Promises — ask: "Walk me through how you decided on your approach for handling asynchronous operations here."
- If the code reveals a potential issue (inefficient pattern, missing guard), probe it naturally. Example: "Tell me more about how you are handling X here — what happens if Y occurs?"
- Continue to ask JD-relevant questions that are NOT about the code as well — cover behavioral, design, and domain skills alongside code-driven questions.
- DO NOT read out or quote the code verbatim. Refer to it indirectly: "your approach to handling errors" not "the try-catch on line 5".
- DO NOT give feedback or commentary on the code quality.`;
}
export function buildOcrUserSection(screenCode: string): string {
  return `## Code Currently Visible on Candidate Screen (OCR)
${screenCode.trim()}

The candidate is actively coding. Use this code to drive your next question — pick a pattern, decision, or structure from the code and ask about the reasoning behind it. Connect it to a JD skill. Do NOT ask them to write code.`;
}
