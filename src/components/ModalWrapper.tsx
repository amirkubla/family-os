import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { C, R, S, SHADOW } from "@src/ui/tokens";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}

export default function ModalWrapper({ visible, onDismiss, children }: Props) {
  if (!visible) return null;

  return (
    <View
      style={[
        styles.overlay,
        Platform.OS === "web" && ({ position: "fixed" } as any),
      ]}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.center}
        pointerEvents="box-none"
      >
        <View style={styles.container}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.45)",
  },
  center: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
    flex: 1,
    pointerEvents: "box-none",
  },
  container: {
    backgroundColor: "#FFFFFF",
    width: "92%",
    maxWidth: 460,
    maxHeight: "85%",
    padding: S.lg + 4,
    borderRadius: R.xl,
    ...SHADOW.lg,
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
});
