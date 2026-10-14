/**
 * Celebration Sound Effects Generator (Web Audio API)
 * Synthesizes crisp firecracker crackles, fanfare chord, and subtle applause shimmer
 * Works seamlessly across Safari, iOS, Chrome, Firefox, and Android with 0 external network requests.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Warm up AudioContext on first user interaction so it's ready when quiz answer is clicked
if (typeof window !== 'undefined') {
  const warmUp = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('pointerdown', warmUp);
    window.removeEventListener('touchstart', warmUp);
    window.removeEventListener('click', warmUp);
  };
  window.addEventListener('pointerdown', warmUp, { once: true, passive: true });
  window.addEventListener('touchstart', warmUp, { once: true, passive: true });
  window.addEventListener('click', warmUp, { once: true, passive: true });
}

function playSoundDirectly(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.connect(ctx.destination);

    // -------------------------------------------------------------
    // Part 1: Firecracker Crackles & Pops (3-4 rapid miniature bursts)
    // -------------------------------------------------------------
    const burstOffsets = [0.0, 0.08, 0.16, 0.25, 0.35];

    burstOffsets.forEach((offset, idx) => {
      const burstTime = now + offset;
      // White noise buffer for firecracker pop
      const bufferSize = Math.floor(ctx.sampleRate * 0.06); // 60ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Bandpass filter to make it sound like crisp paper/firecracker pop
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800 + idx * 400, burstTime);
      filter.Q.setValueAtTime(2.5, burstTime);

      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.9, burstTime);
      popGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.055);

      noiseSource.connect(filter);
      filter.connect(popGain);
      popGain.connect(masterGain);

      noiseSource.start(burstTime);
      noiseSource.stop(burstTime + 0.06);

      // Low thump underneath each firecracker pop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 - idx * 25, burstTime);
      osc.frequency.exponentialRampToValueAtTime(50, burstTime + 0.04);

      oscGain.gain.setValueAtTime(0.6, burstTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.04);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(burstTime);
      osc.stop(burstTime + 0.05);
    });

    // -------------------------------------------------------------
    // Part 2: Triumphant Chime Fanfare (C5, E5, G5, C6)
    // -------------------------------------------------------------
    const notes = [
      { freq: 523.25, time: 0.05, duration: 0.35, gain: 0.25 }, // C5
      { freq: 659.25, time: 0.14, duration: 0.35, gain: 0.3 },  // E5
      { freq: 783.99, time: 0.22, duration: 0.45, gain: 0.35 }, // G5
      { freq: 1046.5, time: 0.32, duration: 0.65, gain: 0.45 }, // C6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gainNode.gain.setValueAtTime(0.001, now + note.time);
      gainNode.gain.linearRampToValueAtTime(note.gain, now + note.time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration + 0.05);
    });

    // -------------------------------------------------------------
    // Part 3: Soft Cheering / Applause Shimmer (0.8s)
    // -------------------------------------------------------------
    const applauseDur = 0.9;
    const applauseBufSize = Math.floor(ctx.sampleRate * applauseDur);
    const applauseBuf = ctx.createBuffer(1, applauseBufSize, ctx.sampleRate);
    const appData = applauseBuf.getChannelData(0);
    for (let i = 0; i < applauseBufSize; i++) {
      // Clapping impulses + random shimmer
      const envelope = Math.sin((i / applauseBufSize) * Math.PI);
      const isClap = Math.random() < 0.02 ? 1.5 : 0.4;
      appData[i] = (Math.random() * 2 - 1) * envelope * isClap;
    }

    const applauseSource = ctx.createBufferSource();
    applauseSource.buffer = applauseBuf;

    const appFilter = ctx.createBiquadFilter();
    appFilter.type = 'bandpass';
    appFilter.frequency.setValueAtTime(1400, now + 0.1);
    appFilter.Q.setValueAtTime(1.2, now + 0.1);

    const appGain = ctx.createGain();
    appGain.gain.setValueAtTime(0.001, now + 0.1);
    appGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    appGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + applauseDur);

    applauseSource.connect(appFilter);
    appFilter.connect(appGain);
    appGain.connect(masterGain);

    applauseSource.start(now + 0.1);
    applauseSource.stop(now + 0.1 + applauseDur + 0.05);
  } catch (err) {
    console.warn('Could not play celebration sound:', err);
  }
}

/**
 * Plays a realistic celebration sound effect:
 * 1. Rapid firecracker burst pops (crackles)
 * 2. Bright harmonious celebratory fanfare chimes (C5 - E5 - G5 - C6)
 * 3. Warm applause shimmer tail
 */
export function playCelebrationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playSoundDirectly(ctx);
      }).catch(() => {
        playSoundDirectly(ctx);
      });
    } else {
      playSoundDirectly(ctx);
    }
  } catch (err) {
    console.warn('Could not trigger celebration sound:', err);
  }
}

