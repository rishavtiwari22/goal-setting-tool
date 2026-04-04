import { ENV } from '../../utils/env';
import type { InterviewSession } from '../../models/interview';

/**
 * Fire-and-forget: exports a completed interview session to Google Sheets
 * via a Google Apps Script web app endpoint.
 *
 * The Apps Script handles all spreadsheet operations (creating sheets, appending rows).
 * This function just POSTs the session data and returns — never blocks the UI.
 */
export async function exportSessionToGoogleSheets(session: InterviewSession): Promise<void> {
  const webhookUrl = ENV.GOOGLE_SHEETS_WEBHOOK_URL();
  if (!webhookUrl) return;
  if (!session.result || !session.qaHistory?.length) return;

  const payload = {
    email: session.userId || '',
    sessionId: session.sessionId,
    jobTitle: session.jobTitle || '',
    score: session.result.score ?? 0,
    mode: session.mode || 'practice',
    startTime: session.startTime || '',
    endTime: session.endTime || '',
    duration: session.result.elapsedTime || 0,
    totalQuestions: session.qaHistory.length,
    summary: session.result.summary || '',
    conclusion: session.result.conclusion || '',
    topStrengths: session.result.topStrengths || [],
    improvementAreas: session.result.improvementAreas || [],
    transcript: session.qaHistory.map(qa => ({
      question: qa.question || '',
      answer: qa.answer || '',
      timestamp: qa.timestamp || '',
    })),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain to avoid CORS preflight
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sheets export failed (${res.status}): ${text.slice(0, 200)}`);
    }

    console.log(`[Sheets Export] Session ${session.sessionId.substring(0, 8)} exported successfully`);
  } catch (err) {
    console.error('[Sheets Export] Failed:', err);
  }
}
