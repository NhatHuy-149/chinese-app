// Request/response contracts shared by the Netlify functions and the client (type-only on the client).
import { z } from 'zod';

export const ERROR_TAGS = [
  'lượng từ', 'trật tự từ', '了/过', 'từ nối', 'dùng từ', 'thanh điệu', 'số và ngày tháng', 'khác',
] as const;

export const LIMITS = { sentence: 300, speech: 600, summary: 600, known: 400 };

export const SentenceResult = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  meaning: z.string().min(1),
  is_correct: z.boolean(),
  corrections: z.array(z.object({ original: z.string(), fixed: z.string(), reason: z.string() })),
  error_tags: z.array(z.enum(ERROR_TAGS)),
  alternative: z.object({ hanzi: z.string(), pinyin: z.string(), meaning: z.string() }).nullable(),
});
export type SentenceResult = z.infer<typeof SentenceResult>;

export const CheckRequest = z.object({
  text: z.string().trim().min(1).max(LIMITS.sentence),
  words: z.array(z.string().max(20)).max(5).optional(),
  focusTag: z.enum(ERROR_TAGS).optional(),
});

export const SpeechRequest = z.object({
  text: z.string().trim().min(1).max(LIMITS.speech),
  prompt: z.string().max(200).optional(),
});

export const Passage = z.object({
  title: z.string(),
  sentences: z.array(z.object({ zh: z.string(), py: z.string(), vi: z.string() })).min(2).max(8),
  key_points: z.array(z.string()).min(2).max(4),
});
export type Passage = z.infer<typeof Passage>;

export const ListeningRequest = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    level: z.enum(['A1', 'A2', 'B1']),
    topic: z.string().max(60),
    known: z.array(z.string().max(10)).max(LIMITS.known),
  }),
  z.object({
    action: z.literal('grade'),
    passageZh: z.string().max(800),
    keyPoints: z.array(z.string().max(200)).min(1).max(4),
    summary: z.string().trim().min(1).max(LIMITS.summary),
  }),
]);

export const GradeResult = z.object({
  score: z.number().int().min(0).max(100),
  caught: z.array(z.number().int().min(0)),
  missed: z.array(z.number().int().min(0)),
  feedback: z.string(),
});
export type GradeResult = z.infer<typeof GradeResult>;
