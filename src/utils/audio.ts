import { SessionPhase } from '../types/schedule';

/**
 * Plays a distinct, clean acoustic chime via Web Audio API.
 * Teaching-ending alerts play an ascending dual chime (C5 -> G5).
 * Break-ending alerts play a crisp three-note cadence (E5 -> G5 -> C6).
 */
export function playAlertChime(phase: SessionPhase): void {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = phase === 'teaching' ? [523.25, 783.99] : [659.25, 783.99, 1046.5];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.16;
      const duration = 0.42;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Ignore browser audio restriction errors gracefully
  }
}
