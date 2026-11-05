// Small file helpers shared by the data build scripts.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const path = (...parts: string[]) => join(ROOT, ...parts);

export function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path(rel), 'utf8')) as T;
}

/** Writes pretty JSON (or compact when `compact` is true), creating folders as needed. */
export function writeJson(rel: string, data: unknown, compact = false): void {
  const p = path(rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, compact ? 0 : 2) + '\n', 'utf8');
}

export function writeText(rel: string, text: string): void {
  const p = path(rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text, 'utf8');
}

export const exists = (rel: string) => existsSync(path(rel));
export const readText = (rel: string) => readFileSync(path(rel), 'utf8');
