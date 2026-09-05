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

const getAudio = (key) => {
  const path = SOUND_PATHS[key];
  if (!path) return null;
  if (!audioCache.has(key)) {
    const audio = new Audio(path);
    audio.preload = "auto";
    audioCache.set(key, audio);
  }
  return audioCache.get(key);
};

const toneMap = {
  warning: [520, 0.12],
  sleepy: [260, 0.2],
  phone: [720, 0.1],
  distraction: [430, 0.1],
  break: [620, 0.12],
  sessionComplete: [880, 0.14],
};

const playFallbackTone = (key, volume = 1) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    sharedAudioContext ||= new AudioContext();
    const ctx = sharedAudioContext;
    const [frequency, duration] = toneMap[key] || [560, 0.1];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, Math.min(0.16, volume * 0.12)), ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.02);
    return true;
  } catch {
    return false;
  }
};

const playSound = async (key, volume = 1) => {
  try {
    const audio = getAudio(key);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = Math.min(1, Math.max(0, Number(volume) || 0));
      await audio.play();
      return true;
    }
  } catch (error) {
    console.warn(`Unable to play sound: ${key}`, error);
  }
  return playFallbackTone(key, volume);
};

export const soundService = {
  playWarning: (volume = 1) => playSound("warning", volume),
  playSleepy: (volume = 1) => playSound("sleepy", volume),
  playPhone: (volume = 1) => playSound("phone", volume),
  playDistraction: (volume = 1) => playSound("distraction", volume),
  playBreak: (volume = 1) => playSound("break", volume),
  playSessionComplete: (volume = 1) => playSound("sessionComplete", volume),
  setVolume: (volume) => {
    const safe = Math.min(1, Math.max(0, Number(volume) || 0));
    audioCache.forEach((audio) => { audio.volume = safe; });
  },
  stopAll: () => audioCache.forEach((audio) => { audio.pause(); audio.currentTime = 0; }),
  preload: () => Object.keys(SOUND_PATHS).forEach(getAudio),
};

export default soundService;
