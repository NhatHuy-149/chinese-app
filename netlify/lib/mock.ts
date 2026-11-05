// Canned responses so the UI can be developed and tested without any API key or cost.
import type { GradeResult, Passage, SentenceResult } from './schemas.ts';

export function mockSentence(text: string): SentenceResult {
  return {
    hanzi: '我昨天买了一本书。',
    pinyin: 'Wǒ zuótiān mǎi le yì běn shū.',
    meaning: 'Hôm qua tôi đã mua một quyển sách.',
    is_correct: false,
    corrections: [
      { original: text.slice(0, 12) || '一个书', fixed: '一本书', reason: '[Thử nghiệm] Sách dùng lượng từ 本, không dùng 个.' },
    ],
    error_tags: ['lượng từ'],
    alternative: null,
  };
}

export function mockPassage(): Passage {
  return {
    title: '[Thử nghiệm] Cuối tuần của Tiểu Minh',
    sentences: [
      { zh: '小明周末不上班。', py: 'Xiǎo Míng zhōumò bú shàngbān.', vi: 'Cuối tuần Tiểu Minh không đi làm.' },
      { zh: '他早上去公园跑步。', py: 'Tā zǎoshang qù gōngyuán pǎobù.', vi: 'Buổi sáng anh ấy đi công viên chạy bộ.' },
      { zh: '下午他和朋友一起看电影。', py: 'Xiàwǔ tā hé péngyou yìqǐ kàn diànyǐng.', vi: 'Buổi chiều anh ấy cùng bạn xem phim.' },
    ],
    key_points: ['Cuối tuần Tiểu Minh không đi làm.', 'Buổi sáng anh ấy chạy bộ ở công viên.', 'Buổi chiều anh ấy xem phim với bạn.'],
  };
}

export function mockGrade(keyPoints: string[]): GradeResult {
  const caught = keyPoints.map((_, i) => i).filter(i => i % 2 === 0);
  const missed = keyPoints.map((_, i) => i).filter(i => i % 2 === 1);
  return { score: Math.round((100 * caught.length) / keyPoints.length), caught, missed, feedback: '[Thử nghiệm] Bạn bắt được ý chính đầu tiên, còn thiếu một ý.' };
}
