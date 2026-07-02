// ============================================
// Sahas Attendance — Audio Feedback (Web Audio API)
// ============================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a short beep tone using the Web Audio API.
 * No audio file dependencies — generates tones from oscillator nodes.
 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Smooth fade-out to avoid click artifacts
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Silently fail if audio is not available (e.g., no user interaction yet)
  }
}

/** Success beep: bright 800Hz tone for 150ms */
export function playSuccess() {
  playTone(800, 150, 'sine');
}

/** Error beep: low 300Hz tone for 300ms */
export function playError() {
  playTone(300, 300, 'square');
}

/** Duplicate warning: mid 500Hz tone for 200ms */
export function playWarning() {
  playTone(500, 200, 'triangle');
}
