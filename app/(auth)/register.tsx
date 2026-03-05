import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

  const handleRegister = async () => {
    setError("");
    if (username.length < 3 || password.length < 4) return;

    setLoading(true);
    try {
      await register({ username, password });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "USERNAME_TAKEN") setError(t("auth.usernameTaken"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text variant="headlineLarge" style={styles.title}>
            {t("auth.registerTitle")}
          </Text>

          <TextInput
            mode="outlined"
            placeholder={t("auth.username")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
            contentStyle={styles.inputContent}
            right={<TextInput.Icon icon="account" />}
          />
          <HelperText type="error" visible={usernameError} style={styles.helper}>
            {t("auth.usernameMin")}
          </HelperText>

          <TextInput
            mode="outlined"
            placeholder={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            contentStyle={styles.inputContent}
            right={<TextInput.Icon icon="lock" />}
          />
          <HelperText type="error" visible={passwordError} style={styles.helper}>
            {t("auth.passwordMin")}
          </HelperText>

          {error ? (
            <HelperText type="error" visible style={styles.helper}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || username.length < 3 || password.length < 4}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {t("auth.register")}
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace("/(auth)/login")}
            style={styles.link}
          >
            {t("auth.hasAccount")}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  title: {
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 32,
  },
  input: { backgroundColor: "#FFFFFF", textAlign: "right", writingDirection: "rtl", marginBottom: 2 },
  inputContent: { textAlign: "right" },
  helper: { textAlign: "right" },
  btn: { borderRadius: 12, marginTop: 8 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 16, fontWeight: "700" },
  link: { marginTop: 16 },
});
