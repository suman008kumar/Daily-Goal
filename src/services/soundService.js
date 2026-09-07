// src/services/soundService.js

const SOUND_PATHS = {
  warning: "/sounds/warning.mp3",
  sleepy: "/sounds/sleepy.mp3",
  phone: "/sounds/phone.mp3",
  distraction: "/sounds/distraction.mp3",
  break: "/sounds/break.mp3",
  sessionComplete: "/sounds/session-complete.mp3",
};

const audioCache = new Map();

let sharedAudioContext = null;
let audioUnlocked = false;

const toneMap = {
  warning: [520, 0.12],
  sleepy: [260, 0.2],
  phone: [720, 0.1],
  distraction: [430, 0.1],
  break: [620, 0.12],
  sessionComplete: [880, 0.14],
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const clampVolume = (volume) => {
  const value = Number(volume);

  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
};

const getAudio = (key) => {
  const path = SOUND_PATHS[key];

  if (!path) {
    console.warn(`[SoundService] Unknown sound key: ${key}`);
    return null;
  }

  if (!audioCache.has(key)) {
    const audio = new Audio();

    audio.src = path;
    audio.preload = "auto";
    audio.playsInline = true;

    audio.addEventListener("error", () => {
      console.error(
        `[SoundService] Failed to load "${key}" from ${path}`,
        audio.error
      );
    });

    audioCache.set(key, audio);
  }

  return audioCache.get(key);
};

/* -------------------------------------------------------------------------- */
/* Audio Context                                                               */
/* -------------------------------------------------------------------------- */

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContext =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }

  return sharedAudioContext;
};

/* -------------------------------------------------------------------------- */
/* Unlock Browser Audio                                                        */
/* -------------------------------------------------------------------------- */

const unlockAudio = async () => {
  try {
    const ctx = getAudioContext();

    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }

    /*
     * Some browsers need an actual audio operation during
     * a user gesture before allowing future audio.
     */
    if (ctx && ctx.state === "running") {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.gain.setValueAtTime(0.00001, ctx.currentTime);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.01);
    }

    audioUnlocked = true;

    return true;
  } catch (error) {
    console.warn("[SoundService] Audio unlock failed:", error);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* Fallback Tone                                                               */
/* -------------------------------------------------------------------------- */

const playFallbackTone = async (key, volume = 1) => {
  try {
    const ctx = getAudioContext();

    if (!ctx) {
      return false;
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (ctx.state !== "running") {
      return false;
    }

    const [frequency, duration] =
      toneMap[key] || [560, 0.1];

    const safeVolume = clampVolume(volume);

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      frequency,
      ctx.currentTime
    );

    const peakVolume = Math.max(
      0.02,
      Math.min(0.16, safeVolume * 0.12)
    );

    gain.gain.setValueAtTime(
      0.0001,
      ctx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      peakVolume,
      ctx.currentTime + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);

    oscillator.stop(
      ctx.currentTime + duration + 0.03
    );

    return true;
  } catch (error) {
    console.warn(
      `[SoundService] Fallback tone failed for "${key}"`,
      error
    );

    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* Play MP3                                                                    */
/* -------------------------------------------------------------------------- */

const playMP3 = async (key, volume = 1) => {
  const audio = getAudio(key);

  if (!audio) {
    return false;
  }

  try {
    const safeVolume = clampVolume(volume);

    audio.pause();

    try {
      audio.currentTime = 0;
    } catch {
      // Ignore reset errors.
    }

    audio.volume = safeVolume;

    /*
     * Important:
     * load() ensures the browser starts resolving the
     * /sounds/*.mp3 resource.
     */
    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load();
    }

    await audio.play();

    return true;
  } catch (error) {
    console.warn(
      `[SoundService] MP3 playback failed: ${key}`,
      error
    );

    return false;
  }
};

/* -------------------------------------------------------------------------- */
/* Main Sound Function                                                         */
/* -------------------------------------------------------------------------- */

const playSound = async (key, volume = 1) => {
  if (typeof window === "undefined") {
    return false;
  }

  if (!SOUND_PATHS[key]) {
    console.warn(
      `[SoundService] Sound "${key}" does not exist`
    );

    return false;
  }

  /*
   * Try to resume Web Audio first.
   */
  try {
    const ctx = getAudioContext();

    if (ctx?.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    // MP3 can still work even if Web Audio cannot resume.
  }

  /*
   * 1. Try actual MP3.
   */
  const mp3Played = await playMP3(key, volume);

  if (mp3Played) {
    return true;
  }

  /*
   * 2. If MP3 fails, use generated tone.
   */
  const fallbackPlayed = await playFallbackTone(
    key,
    volume
  );

  if (fallbackPlayed) {
    return true;
  }

  console.error(
    `[SoundService] Unable to play sound: ${key}`
  );

  return false;
};

/* -------------------------------------------------------------------------- */
/* Preload                                                                     */
/* -------------------------------------------------------------------------- */

const preload = () => {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(SOUND_PATHS).forEach((key) => {
    const audio = getAudio(key);

    if (!audio) {
      return;
    }

    try {
      audio.load();
    } catch (error) {
      console.warn(
        `[SoundService] Preload failed: ${key}`,
        error
      );
    }
  });
};

/* -------------------------------------------------------------------------- */
/* Stop                                                                       */
/* -------------------------------------------------------------------------- */

const stopAll = () => {
  audioCache.forEach((audio) => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Ignore cleanup errors.
    }
  });
};

/* -------------------------------------------------------------------------- */
/* Volume                                                                      */
/* -------------------------------------------------------------------------- */

const setVolume = (volume) => {
  const safeVolume = clampVolume(volume);

  audioCache.forEach((audio) => {
    try {
      audio.volume = safeVolume;
    } catch {
      // Ignore volume errors.
    }
  });
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

export const soundService = {
  playWarning: (volume = 1) =>
    playSound("warning", volume),

  playSleepy: (volume = 1) =>
    playSound("sleepy", volume),

  playPhone: (volume = 1) =>
    playSound("phone", volume),

  playDistraction: (volume = 1) =>
    playSound("distraction", volume),

  playBreak: (volume = 1) =>
    playSound("break", volume),

  playSessionComplete: (volume = 1) =>
    playSound("sessionComplete", volume),

  unlock: async () => {
    return unlockAudio();
  },

  preload,

  setVolume,

  stopAll,

  isUnlocked: () => audioUnlocked,

  getPaths: () => ({
    ...SOUND_PATHS,
  }),
};

export default soundService;