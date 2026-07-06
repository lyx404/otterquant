import { setSoundVolume } from "@/lib/sounds";

export type SoundSettings = {
  enabled: boolean;
  volume: number;
};

const SOUND_SETTINGS_KEY = "otterquant_sound_settings";
const SOUND_SETTINGS_EVENT = "otterquant:sound-settings";
const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.28,
};

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) return DEFAULT_SOUND_SETTINGS.volume;
  return Math.min(1, Math.max(0, volume));
}

function normalizeSoundSettings(settings: Partial<SoundSettings> | null | undefined): SoundSettings {
  return {
    enabled: settings?.enabled ?? DEFAULT_SOUND_SETTINGS.enabled,
    volume: clampVolume(settings?.volume ?? DEFAULT_SOUND_SETTINGS.volume),
  };
}

export function readSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULT_SOUND_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SOUND_SETTINGS_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    return normalizeSoundSettings(JSON.parse(raw) as Partial<SoundSettings>);
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function applySoundSettings(settings: SoundSettings) {
  const normalized = normalizeSoundSettings(settings);
  setSoundVolume(normalized.enabled ? normalized.volume : 0);
  return normalized;
}

export function saveSoundSettings(settings: SoundSettings) {
  const normalized = applySoundSettings(settings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent<SoundSettings>(SOUND_SETTINGS_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function subscribeSoundSettings(onChange: (settings: SoundSettings) => void) {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<SoundSettings>).detail;
    onChange(normalizeSoundSettings(detail));
  };

  window.addEventListener(SOUND_SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SOUND_SETTINGS_EVENT, listener);
}
