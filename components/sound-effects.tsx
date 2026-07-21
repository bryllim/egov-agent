"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { SensoryUIProvider, useSensoryUI } from "@/lib/provider";
import type { SoundRole } from "@/lib/sound-roles";

const SOUND_PREFERENCE_KEY = "egov-sound-effects";
const SOUND_PREFERENCE_EVENT = "egov-sound-effects-change";

function subscribeToSoundPreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_PREFERENCE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SOUND_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SOUND_PREFERENCE_EVENT, onStoreChange);
  };
}

function getSoundPreferenceSnapshot() {
  return localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off";
}

function getServerSoundPreferenceSnapshot() {
  return true;
}

type SoundEffectsContextValue = {
  soundEffectsEnabled: boolean;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  reducedMotion: boolean;
};

const SoundEffectsContext = createContext<SoundEffectsContextValue | null>(
  null
);

function roleForInteraction(element: HTMLElement): SoundRole | null {
  const explicit = element.dataset.sound;
  if (explicit === "none") return null;
  if (explicit) return explicit as SoundRole;

  if (
    element.matches('input[type="checkbox"], input[type="radio"]') ||
    ["checkbox", "radio", "switch"].includes(
      element.getAttribute("role") ?? ""
    )
  ) {
    return "interaction.toggle";
  }

  const expanded = element.getAttribute("aria-expanded");
  if (expanded === "true") return "overlay.collapse";
  if (expanded === "false") return "overlay.expand";

  const label = `${element.getAttribute("aria-label") ?? ""} ${
    element.getAttribute("title") ?? ""
  } ${element.textContent ?? ""}`.toLowerCase();

  if (/\b(back|previous|prev)\b/.test(label)) return "navigation.backward";
  if (/\bclose\b/.test(label)) return "overlay.close";
  if (element.tagName === "A") return "navigation.forward";
  if (
    element instanceof HTMLButtonElement &&
    (element.type === "submit" || /\b(save|submit|confirm|continue)\b/.test(label))
  ) {
    return "interaction.confirm";
  }

  return "interaction.tap";
}

function SoundEffectsBridge({
  children,
  soundEffectsEnabled,
}: {
  children: React.ReactNode;
  soundEffectsEnabled: boolean;
}) {
  const { playSound, reducedMotion } = useSensoryUI();
  const previousEnabled = useRef(soundEffectsEnabled);

  useEffect(() => {
    if (!previousEnabled.current && soundEffectsEnabled) {
      void playSound("interaction.toggle");
    }
    previousEnabled.current = soundEffectsEnabled;
  }, [playSound, soundEffectsEnabled]);

  useEffect(() => {
    const playInteraction = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const element = target.closest<HTMLElement>(
        "[data-sound], button, a[href], input[type='checkbox'], input[type='radio'], [role='button'], [role='switch'], [role='checkbox'], [role='radio']"
      );
      if (!element || element.getAttribute("aria-disabled") === "true") return;
      if (element instanceof HTMLButtonElement && element.disabled) return;

      const role = roleForInteraction(element);
      if (role) void playSound(role);
    };

    document.addEventListener("click", playInteraction, true);
    return () => document.removeEventListener("click", playInteraction, true);
  }, [playSound]);

  const setSoundEffectsEnabled = useCallback(
    (enabled: boolean) => {
      localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? "on" : "off");
      window.dispatchEvent(new Event(SOUND_PREFERENCE_EVENT));
    },
    []
  );

  const value = useMemo(
    () => ({
      soundEffectsEnabled,
      setSoundEffectsEnabled,
      reducedMotion,
    }),
    [reducedMotion, setSoundEffectsEnabled, soundEffectsEnabled]
  );

  return (
    <SoundEffectsContext.Provider value={value}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function SoundEffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const soundEffectsEnabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundPreferenceSnapshot,
    getServerSoundPreferenceSnapshot
  );
  const config = useMemo(
    () => ({
      enabled: soundEffectsEnabled,
      theme: "minimal" as const,
      volume: 1.92,
      categories: {
        interaction: true,
        overlay: true,
        navigation: true,
        notification: true,
        hero: false,
      },
    }),
    [soundEffectsEnabled]
  );

  return (
    <SensoryUIProvider config={config}>
      <SoundEffectsBridge soundEffectsEnabled={soundEffectsEnabled}>
        {children}
      </SoundEffectsBridge>
    </SensoryUIProvider>
  );
}

export function useSoundEffects() {
  const context = useContext(SoundEffectsContext);
  if (!context) {
    throw new Error(
      "useSoundEffects must be used inside <SoundEffectsProvider>"
    );
  }
  return context;
}
