// Text-to-speech with the browser's Chinese voice (quality depends on the device).
let voice: SpeechSynthesisVoice | null = null;

export const TTS_OK = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!TTS_OK) return null;
  const voices = speechSynthesis.getVoices();
  return voices.find(v => /zh[-_]CN/i.test(v.lang)) ?? voices.find(v => /^zh/i.test(v.lang)) ?? null;
}

if (TTS_OK) speechSynthesis.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });

export function hasChineseVoice(): boolean {
  voice ??= pickVoice();
  return !!voice;
}

/** Speaks Chinese text; resolves when finished (or immediately if TTS is unavailable). */
export function speak(text: string, rate = 1): Promise<void> {
  if (!TTS_OK) return Promise.resolve();
  voice ??= pickVoice();
  speechSynthesis.cancel();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export const stopSpeaking = () => { if (TTS_OK) speechSynthesis.cancel(); };
