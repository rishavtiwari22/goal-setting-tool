export function buildOcrSystemSection(screenCode: string): string {
  return `## Live Screen Context (OCR — Candidate Code)
The candidate is actively coding on their screen. The following code has been silently captured via live OCR:
---
${screenCode.trim()}
---

How to use this context — RULES:
- CRITICAL: When code is visible, you MUST actively use it to shape your questions. At least every 2-3 turns, ask a question directly inspired by a pattern, decision, or structure visible in the code.
- Bridge JD skills with the visible code. Pick a JD skill and ask about it through the lens of what the candidate actually built. Example: JD wants async expertise and the code shows Promises — ask: "Walk me through how you decided on your approach for handling asynchronous operations in this part of your solution."
- When the candidate explains something, connect it to what you see in their code. Ask about choices, trade-offs, or consequences. Example: "You mentioned X — given how you structured Y in your solution, what made you choose that approach over alternatives?"
- If the code reveals a potential issue (inefficient pattern, missing guard, wrong abstraction), probe it naturally without accusing. Example: "Tell me more about how you are handling X here — what happens if Y occurs?"
- DO NOT read out, quote, or describe the code verbatim to the candidate. Refer to it indirectly: "your approach to handling errors" not "the try-catch on line 5".
- DO NOT ask them to write or present code — this is a voice interview.
- DO NOT give feedback or commentary on the code quality.`;
}

export function buildOcrUserSection(screenCode: string): string {
  return `## Code Currently Visible on Candidate Screen (OCR)
${screenCode.trim()}

The candidate is actively coding. Use this code to drive your next question — pick a pattern, decision, or structure from the code and ask about the reasoning behind it. Connect it to a JD skill. Do NOT ask them to write code.`;
}
