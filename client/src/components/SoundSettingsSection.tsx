import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { Volume2 } from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { soundThemes } from "@/lib/sounds";
import {
  readSoundSettings,
  saveSoundSettings,
  subscribeSoundSettings,
  type SoundSettings,
} from "@/lib/soundPreferences";

export default function SoundSettingsSection() {
  const { t } = useAppLanguage();
  const [settings, setSettings] = useState<SoundSettings>(() => readSoundSettings());
  const volumePercent = Math.round(settings.volume * 100);
  const volumeRangeStyle = {
    "--sound-volume-percent": `${volumePercent}%`,
  } as CSSProperties;

  useEffect(() => {
    return subscribeSoundSettings(setSettings);
  }, []);

  const updateSettings = (nextSettings: SoundSettings) => {
    setSettings(saveSoundSettings(nextSettings));
  };

  const toggleSound = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const nextEnabled = !settings.enabled;

    if (!nextEnabled) {
      soundThemes.clearChime.play("toggleOff");
    }

    updateSettings({ ...settings, enabled: nextEnabled });

    if (nextEnabled) {
      soundThemes.clearChime.play("toggleOn");
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section__head" style={{ marginBottom: settings.enabled ? undefined : 0 }}>
        <div className="settings-section__title">
          <Volume2 className="settings-section__icon" size={18} strokeWidth={3} />
          <span>{t("Sound", "音效")}</span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          className="inline-flex items-center gap-2 rounded-full text-xs font-black text-[var(--ac-text)] transition"
          onClick={toggleSound}
        >
          <span>{settings.enabled ? t("On", "开启") : t("Off", "关闭")}</span>
          <span
            className={`relative block h-6 w-11 rounded-full border-2 transition ${
              settings.enabled
                ? "border-[rgb(255,213,87)] bg-[rgb(255,213,87)]"
                : "border-[#c4b89e] bg-[#f2ead7]"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 block size-4 rounded-full bg-white shadow-[0_2px_0_rgba(61,52,40,.18)] transition ${
                settings.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>

      {settings.enabled ? (
        <div className="settings-grid">
          <label className="settings-field sound-settings-volume-field" htmlFor="sound-volume">
            <span className="flex items-center justify-between gap-3">
              <span>{t("Volume", "音量")}</span>
              <span aria-live="polite">{volumePercent}%</span>
            </span>

            <input
              id="sound-volume"
              type="range"
              min={0}
              max={100}
              value={volumePercent}
              aria-label={t("Sound effect volume", "音效音量")}
              className="sound-volume-range h-11 w-full cursor-pointer"
              style={volumeRangeStyle}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  enabled: true,
                  volume: Number(event.currentTarget.value) / 100,
                })
              }
            />
          </label>
        </div>
      ) : null}

      <style>{`
        .sound-settings-volume-field {
          box-sizing: border-box;
          border: 2px solid rgba(196, 184, 158, 0.78);
          border-radius: 6px;
          padding: 12px 12px 4px;
        }

        .sound-volume-range {
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          border: 0;
          box-shadow: none;
          outline: none;
          padding: 0;
        }

        .sound-volume-range:focus,
        .sound-volume-range:focus-visible {
          border: 0;
          box-shadow: none;
          outline: none;
        }

        .sound-volume-range::-webkit-slider-runnable-track {
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            rgb(255, 213, 87) 0 var(--sound-volume-percent),
            #31445a var(--sound-volume-percent) 100%
          );
          box-shadow: none;
        }

        .sound-volume-range::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          margin-top: -5px;
          border: 0;
          border-radius: 999px;
          background: rgb(255, 213, 87);
          box-shadow: none;
        }

        .sound-volume-range::-moz-range-track {
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: #31445a;
          box-shadow: none;
        }

        .sound-volume-range::-moz-range-progress {
          height: 6px;
          border: 0;
          border-radius: 999px;
          background: rgb(255, 213, 87);
          box-shadow: none;
        }

        .sound-volume-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border: 0;
          border-radius: 999px;
          background: rgb(255, 213, 87);
          box-shadow: none;
        }
      `}</style>
    </section>
  );
}
