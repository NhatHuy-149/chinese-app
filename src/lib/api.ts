// Client for the AI proxy (/api/*). Sends only the text being corrected, never the event log.
// In local development without Netlify functions (HTTP 404), answers come from the mock module.
import type { GradeResult, Passage, SentenceResult } from '../../netlify/lib/schemas';
import { getSettings } from './settings';
import { kvGet } from './storage';

export type { GradeResult, Passage, SentenceResult };

export class ApiError extends Error {}

async function post<T>(path: string, body: unknown): Promise<{ result: T; mock?: boolean }> {
  const settings = await getSettings();
  const mock = await kvGet<boolean>('mockAi', false);
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-passcode': settings.passcode, ...(mock ? { 'x-mock': '1' } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Không có mạng. Phần này cần mạng để AI sửa.');
  }
  if (res.status === 404 && import.meta.env.DEV) return devMock<T>(path, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Lỗi máy chủ (${res.status}).`);
  return data;
}

async function devMock<T>(path: string, body: any): Promise<{ result: T; mock: true }> {
  const m = await import('../../netlify/lib/mock');
  await new Promise(r => setTimeout(r, 500));
  if (path.endsWith('listening')) return { result: (body.action === 'generate' ? m.mockPassage() : m.mockGrade(body.keyPoints)) as T, mock: true };
  return { result: m.mockSentence(body.text) as T, mock: true };
}

export const checkSentence = (text: string, words?: string[], focusTag?: string) =>
  post<SentenceResult>('/api/check-sentence', { text, words, focusTag });

export const correctSpeech = (text: string, prompt?: string) =>
  post<SentenceResult>('/api/correct-speech', { text, prompt });

export const generatePassage = (level: 'A1' | 'A2' | 'B1', topic: string, known: string[]) =>
  post<Passage>('/api/listening', { action: 'generate', level, topic, known });

export const gradeSummary = (passageZh: string, keyPoints: string[], summary: string) =>
  post<GradeResult>('/api/listening', { action: 'grade', passageZh, keyPoints, summary });
