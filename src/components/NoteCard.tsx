/**
 * NoteCard — the modern, compact, theme-aware note card for the Notes page.
 * Mirrors ProjectCard's design language (theme tint, radius, shadow, hover,
 * staggered entrance) so Notes and Projects feel like one app.
 *
 * Built for scanning, not reading: title + category pill + a 3-line clamped
 * preview + edited/created metadata. The whole card opens the editor; the pin
 * toggle and delete live inline in the header (like ProjectCard's controls).
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Animated, Easing } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import type { Note } from "@src/models/note";
import { effectiveNoteCategories, resolveNoteCategory, noteCategoryColor } from "@src/models/noteCategory";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { noteEditedLabel, noteCreatedLabel } from "@src/lib/noteFormat";
import { t } from "@src/i18n";
import { C, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import OwnerBadge from "./OwnerBadge";

/** Web-only theme-tinted hover shadow (native uses elevation via SHADOW.md). */
function webShadow(theme: string) {
  return Platform.OS === "web" ? ({ boxShadow: `0 10px 24px ${theme}33` } as any) : null;
}

interface Props {
  note: Note;
  /** Position in its list — drives the staggered entrance animation. */
  index?: number;
  onPress: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export default function NoteCard({ note, index = 0, onPress, onDelete, onTogglePin }: Props) {
  const theme = useThemeColor();
  const categories = useFamilyStore((s) => effectiveNoteCategories(s.customizations));
  const cat = resolveNoteCategory(note.category, categories);
  const catColor = cat ? noteCategoryColor(cat) : "";

  // Entrance: gentle fade + rise on mount (replays each visit via remount key).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index, 6) * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        testID={"note-card-" + (note.title || "")}
        onPress={onPress}
        style={({ pressed, hovered }: any) => [
          styles.card,
          { backgroundColor: theme + "0F", borderColor: theme + "26" },
          hovered && [styles.cardHover, { borderColor: theme + "59" }, webShadow(theme)],
          pressed && { transform: [{ scale: 0.985 }] },
        ]}
      >
        {/* ── Header: pin toggle · title · delete ── */}
        <View style={styles.header}>
          <IconButton
            icon={note.pinned ? "pin" : "pin-outline"}
            size={18}
            testID={"note-pin-" + (note.title || "")}
            accessibilityLabel={"note-pin-" + (note.title || "")}
            iconColor={note.pinned ? theme : C.textMuted}
            style={styles.pinBtn}
            onPress={onTogglePin}
          />
          <Text style={styles.title} numberOfLines={1}>
            {note.title || t("home.note")}
          </Text>
          <IconButton
            icon="trash-can-outline"
            size={16}
            testID={"note-delete-" + (note.title || "")}
            iconColor={C.textMuted}
            style={styles.miniBtn}
            onPress={onDelete}
          />
        </View>

        {/* ── Category pill ── */}
        {cat && (
          <View style={[styles.catPill, { backgroundColor: catColor + "1F" }]}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <Text style={[styles.catLabel, { color: catColor }]}>{cat.name}</Text>
          </View>
        )}

        {/* ── Content preview (recognition, not reading) ── */}
        {note.body ? (
          <Text style={styles.preview} numberOfLines={3}>
            {note.body}
          </Text>
        ) : null}

        {/* ── Footer: edited · created · owner · open affordance ── */}
        <View style={styles.footer}>
          <Text style={styles.edited} numberOfLines={1}>
            {noteEditedLabel(note.updatedAt)}
          </Text>
          <Text style={styles.created} numberOfLines={1}>
            {noteCreatedLabel(note.createdAt)}
          </Text>
          <View style={styles.spacer} />
          <OwnerBadge kidId={note.kidId} ownerMemberId={note.ownerMemberId} />
          <Ionicons name="chevron-back" size={18} color={theme} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", transition: "all 0.18s ease" } as any) : {}),
  },
  cardHover: {
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },

  header: { flexDirection: RTL_ROW, alignItems: "center", gap: 2 },
  pinBtn: { margin: 0, width: 30, height: 30 },
  miniBtn: { margin: 0, width: 28, height: 28 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },

  catPill: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },
  catEmoji: { fontSize: 12 },
  catLabel: { fontSize: 11, fontWeight: "800", writingDirection: "rtl" },

  preview: {
    fontSize: 13,
    lineHeight: 18,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.xs,
  },

  footer: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: S.sm },
  edited: { fontSize: 12, fontWeight: "700", color: C.textSecondary, writingDirection: "rtl" },
  created: { fontSize: 11, color: C.textMuted, writingDirection: "rtl" },
  spacer: { flex: 1 },
});
