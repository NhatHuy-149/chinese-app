// Microphone recording + browser speech recognition (zh-CN).
// Recognition only tells whether the machine understood the learner; it does not grade tones.
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const RecognitionCtor: (new () => Recognition) | undefined =
  typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined;

export const RECOGNITION_OK = !!RecognitionCtor;
export const RECORDING_OK = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export type Take = { text: string; audioUrl: string | null; seconds: number; error?: string };

/** One recording session. Call start(), then stop() to get the transcript and audio. */
export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recognition: Recognition | null = null;
  private finalText = '';
  private interim = '';
  private startedAt = 0;
  private error = '';
  onText: (text: string) => void = () => {};

  async start(): Promise<void> {
    this.startedAt = Date.now();
    if (RECORDING_OK) {
      try {
        // Explicit voice settings; some phones default to aggressive gain that distorts speech.
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
        });
      } catch {
        throw new Error('Không dùng được micro. Hãy cho phép quyền micro cho trang này (cần https).');
      }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported?.(t));
      this.rec = new MediaRecorder(this.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 128_000 });
      this.rec.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
      this.rec.start();
    }
    if (RecognitionCtor) {
      const r = new RecognitionCtor();
      r.lang = 'zh-CN';
      r.continuous = true;
      r.interimResults = true;
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) this.finalText += res[0].transcript; else interim += res[0].transcript;
        }
        this.interim = interim;
        this.onText(this.finalText + interim);
      };
      r.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') this.error = recognitionError(e.error); };
      this.recognition = r;
      try { r.start(); } catch { /* already started */ }
    }
  }

  async stop(): Promise<Take> {
    const seconds = Math.round((Date.now() - this.startedAt) / 1000);
    const audio = new Promise<string | null>(resolve => {
      if (!this.rec || this.rec.state === 'inactive') return resolve(null);
      this.rec.onstop = () => resolve(this.chunks.length ? URL.createObjectURL(new Blob(this.chunks, { type: this.rec!.mimeType })) : null);
      this.rec.stop();
    });
    const text = new Promise<string>(resolve => {
      if (!this.recognition) return resolve('');
      const done = () => resolve(this.finalText + this.interim);
      this.recognition.onend = done;
      try { this.recognition.stop(); } catch { done(); }
      setTimeout(done, 2500); // some browsers never fire onend
    });
    const [audioUrl, t] = await Promise.all([audio, text]);
    this.stream?.getTracks().forEach(tr => tr.stop());
    return { text: t.trim(), audioUrl, seconds, error: this.error || undefined };
  }
}

function recognitionError(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Trình duyệt chặn nhận diện giọng nói.';
  if (code === 'network') return 'Nhận diện giọng nói cần mạng.';
  return `Lỗi nhận diện giọng nói (${code}).`;
}
