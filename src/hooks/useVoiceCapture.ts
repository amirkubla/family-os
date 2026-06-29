/**
 * useVoiceCapture — the shared record → stop → result state machine.
 *
 * Wraps a per-entity voice hook (useGroceryVoice, useEventVoice, …) and returns
 * { status, onMic }. onMic toggles recording: idle → record; recording → stop +
 * upload (with an optional context) + hand the parsed result to onResult.
 * Mic-permission + error toasts are handled here so screens don't repeat them.
 */

import { Alert } from "react-native";

import { t } from "@src/i18n";
import type { VoiceStatus } from "./useVoiceRecorder";

interface VoiceHook<T, C> {
  status: VoiceStatus;
  start: () => Promise<boolean>;
  stopAndTranscribe: (context?: C) => Promise<T | null>;
}

export function useVoiceCapture<T, C = void>(
  voiceHook: () => VoiceHook<T, C>,
  opts: { getContext?: () => C; onResult: (result: T) => void },
): { status: VoiceStatus; onMic: () => Promise<void> } {
  const { status, start, stopAndTranscribe } = voiceHook();

  const onMic = async () => {
    try {
      if (status === "recording") {
        const result = await stopAndTranscribe(opts.getContext?.());
        if (result) opts.onResult(result);
      } else if (status === "idle") {
        const ok = await start();
        if (!ok) Alert.alert(t("voice.micDenied"));
      }
    } catch {
      Alert.alert(t("voice.error"));
    }
  };

  return { status, onMic };
}
