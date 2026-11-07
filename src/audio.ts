export type SoundWorld = 'garden' | 'ocean' | 'sky';

type Voice = {
  oscillators: OscillatorNode[];
  envelope: GainNode;
};

const NOTES = [60, 62, 64, 67, 69, 72, 74, 76, 79];
const MAX_VOICES = 8;
const MIN_NOTE_INTERVAL_MS = 65;

/** Offline, gesture-started sounds. No audio context is created until play(). */
export class SoundGarden {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private voices = new Set<Voice>();
  private volume = 0.4;
  private muted = false;
  private disposed = false;
  private lastNoteAt = -Infinity;

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(0.65, value));
    this.updateLevel();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateLevel();
  }

  play(seed: number, world: SoundWorld): void {
    if (this.disposed || this.muted || this.volume === 0) return;
    const timestamp = performance.now();
    if (timestamp - this.lastNoteAt < MIN_NOTE_INTERVAL_MS) return;

    const context = this.getContext();
    if (!context || !this.master || context.state === 'closed') return;
    // Calling resume synchronously from the keyboard/pointer handler preserves
    // the browser's user-gesture permission. Unsupported audio stays silent.
    if (context.state === 'suspended') void context.resume().catch(() => {});
    if (this.voices.size >= MAX_VOICES) return;
    this.lastNoteAt = timestamp;

    const index = (Number.isFinite(seed) ? seed >>> 0 : 0) % NOTES.length;
    const midi = NOTES[index] + (world === 'sky' ? 12 : 0);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const start = context.currentTime + 0.008;
    const duration = world === 'sky' ? 0.85 : world === 'ocean' ? 0.72 : 0.57;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.1, start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    envelope.gain.linearRampToValueAtTime(0, start + duration + 0.035);
    envelope.connect(this.master);

    const fundamental = context.createOscillator();
    fundamental.type = world === 'garden' ? 'triangle' : 'sine';
    fundamental.frequency.setValueAtTime(frequency, start);
    // A quiet overtone gives the short notes a little wooden/bell-like warmth.
    const overtone = context.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(frequency * (world === 'ocean' ? 1 : 2), start);
    if (world === 'ocean') overtone.detune.setValueAtTime(4, start);
    const overtoneLevel = context.createGain();
    overtoneLevel.gain.value = world === 'garden' ? 0.12 : 0.18;
    fundamental.connect(envelope);
    overtone.connect(overtoneLevel).connect(envelope);

    const voice: Voice = { oscillators: [fundamental, overtone], envelope };
    this.voices.add(voice);
    fundamental.onended = () => {
      fundamental.disconnect();
      overtone.disconnect();
      overtoneLevel.disconnect();
      envelope.disconnect();
      this.voices.delete(voice);
    };
    const end = start + duration + 0.045;
    for (const oscillator of voice.oscillators) {
      oscillator.start(start);
      oscillator.stop(end);
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const voice of this.voices) {
      voice.envelope.disconnect();
      for (const oscillator of voice.oscillators) {
        oscillator.onended = null;
        oscillator.stop();
        oscillator.disconnect();
      }
    }
    this.voices.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {});
    }
    this.context = null;
    this.master = null;
    this.compressor = null;
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -20;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.006;
      this.compressor.release.value = 0.18;
      this.master.connect(this.compressor).connect(this.context.destination);
      return this.context;
    } catch {
      if (this.context) void this.context.close().catch(() => {});
      this.context = null;
      this.master = null;
      this.compressor = null;
      return null;
    }
  }

  private updateLevel(): void {
    if (!this.master || !this.context || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.025);
  }
}
