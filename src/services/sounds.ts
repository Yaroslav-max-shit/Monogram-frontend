const AUDIO_CACHE = new Map<string, HTMLAudioElement>();

const DEFAULT_SOUNDS: Record<string, string> = {
  message: '/assets/sounds/message.wav',
  group: '/assets/sounds/group.wav',
  call: '/assets/sounds/call.wav',
  notification: '/assets/sounds/notification.wav',
};

export function playSound(type: keyof typeof DEFAULT_SOUNDS) {
  let customSounds: Record<string, string> = {};
  try { customSounds = JSON.parse(localStorage.getItem('custom_sounds') || '{}'); } catch {}
  const src = customSounds[type] || DEFAULT_SOUNDS[type];
  let audio = AUDIO_CACHE.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.volume = 0.5;
    AUDIO_CACHE.set(src, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function setCustomSound(type: string, url: string) {
  let sounds: Record<string, string> = {};
  try { sounds = JSON.parse(localStorage.getItem('custom_sounds') || '{}'); } catch {}
  sounds[type] = url;
  localStorage.setItem('custom_sounds', JSON.stringify(sounds));
  AUDIO_CACHE.delete(url);
}

export function resetCustomSound(type: string) {
  let sounds: Record<string, string> = {};
  try { sounds = JSON.parse(localStorage.getItem('custom_sounds') || '{}'); } catch {}
  delete sounds[type];
  localStorage.setItem('custom_sounds', JSON.stringify(sounds));
}
