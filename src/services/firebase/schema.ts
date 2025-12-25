import { getFirestoreInstance } from './config';
import type { Firestore } from 'firebase/firestore';

export async function normalizeEmailForId(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
}

export function getUserCollectionPath(emailId: string): string {
  return `users/${emailId}`;
}

export function getSessionsCollectionPath(emailId: string): string {
  return `users/${emailId}/sessions`;
}

export function getSessionDocumentPath(emailId: string, sessionId: string): string {
  return `users/${emailId}/sessions/${sessionId}`;
}

export function getQAItemsCollectionPath(emailId: string, sessionId: string): string {
  return `users/${emailId}/sessions/${sessionId}/qaItems`;
}

export function getQAItemDocumentPath(emailId: string, sessionId: string, qaId: string): string {
  return `users/${emailId}/sessions/${sessionId}/qaItems/${qaId}`;
}

export function getFeedbackCollectionPath(emailId: string, sessionId: string): string {
  return `users/${emailId}/sessions/${sessionId}/feedback`;
}

export function getFeedbackDocumentPath(emailId: string, sessionId: string, feedbackId: string): string {
  return `users/${emailId}/sessions/${sessionId}/feedback/${feedbackId}`;
}

export async function getFirestoreDb(): Promise<Firestore | null> {
  return await getFirestoreInstance();
}

