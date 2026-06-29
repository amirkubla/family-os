/**
 * VoiceFab — the shared mic FAB for every voice-capture screen.
 *
 * Status-driven: microphone (idle) → red stop (recording) → spinner
 * (processing). Sits on the leading (bottom-left) side, 68px above the page's
 * "+" add FAB. Pair with useVoiceCapture for the press handler.
 */

import React from "react";
import { Platform } from "react-native";
import { FAB } from "react-native-paper";

import { C } from "@src/ui/tokens";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { t } from "@src/i18n";
import type { VoiceStatus } from "@src/hooks/useVoiceRecorder";

interface Props {
  status: VoiceStatus;
  onPress: () => void;
  /** Absolute bottom offset (already includes safe-area inset + the +68 gap). */
  bottom: number;
  testID?: string;
  /** Web sticky positioning (screens that scroll under a fixed FAB, e.g. budget). */
  webFixed?: boolean;
}

export default function VoiceFab({ status, onPress, bottom, testID, webFixed }: Props) {
  return (
    <FAB
      icon={status === "recording" ? "stop" : "microphone"}
      loading={status === "processing"}
      style={[
        { position: "absolute", ...FAB_LEFT, bottom, backgroundColor: C.teal },
        status === "recording" && { backgroundColor: C.red },
        webFixed && Platform.OS === "web" ? ({ position: "fixed" } as any) : null,
      ]}
      color="#FFF"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("voice.record")}
      testID={testID}
    />
  );
}
