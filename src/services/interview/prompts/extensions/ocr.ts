export function buildOcrSystemSection(screenCode: string): string {
  return `## Live Screen Context (OCR — Candidate Code)
The candidate is actively coding on their screen. The following code has been silently captured via live OCR:
---
${screenCode.trim()}
---

How to use this context — STRICT RULES:
- Always anchor your question to a JD skill first. Then use the visible code as a lens to probe depth.
- When the candidate explains something that relates to the code on screen, ask a follow-up that probes choice, trade-off, or consequence. Example: "You mentioned X — given how you have structured Y in your solution, what made you choose that approach?"
- Generate questions that bridge JD requirements and the specific code pattern visible. Example: JD wants async expertise and the code shows Promises — ask about their async strategy and error-handling decisions.
- If the code reveals a potential red flag (inefficient pattern, missing guard, wrong abstraction), probe it naturally without accusing. Example: "Tell me more about how you are handling X here."
- DO NOT read out, quote, or describe the code to the candidate.
- DO NOT ask them to write or present code — this is a voice interview.
- DO NOT give feedback or commentary on the code quality.`;
}

export function buildOcrUserSection(screenCode: string): string {
  return `## Code Currently Visible on Candidate Screen (OCR)
${screenCode.trim()}

Use this code silently as context. Infer concepts, patterns, and trade-offs from it. Ask a JD-relevant question that probes the candidate's understanding of what they are building. Do NOT ask them to write, present, or read code aloud.`;
}
