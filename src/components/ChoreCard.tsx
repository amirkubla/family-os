/**
 * ChoreCard — compact, theme-aware chore card matching the Projects/Notes
 * visual language. Optimised for fast completion: a big leading check circle,
 * title + priority on top; assignee · due · repeat · overflow on the bottom.
 *
 * Tint + accents derive from the family theme (useThemeColor). Overdue chores
 * get a red accent; completed chores fade. Entrance + completion animate.
 */

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Platform, Animated, Easing } from "react-native";
import { Text, IconButton, Menu } from "react-native-paper";

import type { Chore } from "@src/models/chore";
import { isChoreOverdue } from "@src/models/chore";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  describeChoreDue,
  dueToneColor,
  repeatRuleLabel,
  priorityMeta,
} from "@src/lib/choreDisplay";
import { t } from "@src/i18n";
import { C, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  chore: Chore;
  index?: number;
  onPress: () => void;
  onToggleDone: () => void;
  onToggleToday: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ChoreCard({
  chore,
  index = 0,
  onPress,
  onToggleDone,
  onToggleToday,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const theme = useThemeColor();
  const overdue = isChoreOverdue(chore);
  const due = chore.dueDate != null ? describeChoreDue(chore.dueDate) : null;
  const repeat = repeatRuleLabel(chore);
  const prio = priorityMeta(chore.priority);
  const canReorder = !!(onMoveUp || onMoveDown);
  const [menuOpen, setMenuOpen] = useState(false);

  const member = useFamilyStore((s) =>
    chore.assignedToMemberId ? s.familyMembers.find((m) => m.id === chore.assignedToMemberId) : undefined,
  );
  const kid = useFamilyStore((s) => (chore.kidId ? s.kids.find((k) => k.id === chore.kidId) : undefined));
  const assigneeName = kid?.name ?? member?.name ?? chore.assignedTo;
  const assigneeEmoji = kid?.emoji ?? member?.avatarEmoji ?? "👤";
  const assigneeColor = kid?.color ?? member?.color ?? theme;

  // Entrance (staggered) + completion fade.
  const enter = useRef(new Animated.Value(0)).current;
  const doneAnim = useRef(new Animated.Value(chore.done ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index, 6) * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  useEffect(() => {
    Animated.timing(doneAnim, {
      toValue: chore.done ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [doneAnim, chore.done]);

  const cardOpacity = Animated.multiply(
    enter,
    doneAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }),
  );

  // Surface tint: overdue → red wash; else theme wash.
  const bg = overdue && !chore.done ? C.red + "0D" : theme + "0F";
  const border = overdue && !chore.done ? C.red + "55" : theme + "26";

  return (
    <Animated.View
      style={{
        opacity: cardOpacity,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        testID={"chore-card-" + chore.title}
        onPress={onPress}
        style={({ pressed, hovered }: any) => [
          styles.card,
          { backgroundColor: bg, borderColor: border },
          hovered && [styles.cardHover, { borderColor: overdue ? C.red + "80" : theme + "59" }],
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
      >
        {/* ── Top: check · title · priority ── */}
        <View style={styles.topRow}>
          <Pressable
            testID={"chore-check-" + chore.title}
            hitSlop={8}
            onPress={onToggleDone}
            style={[
              styles.check,
              { borderColor: chore.done ? theme : theme + "80" },
              chore.done && { backgroundColor: theme },
            ]}
          >
            {chore.done ? <Text style={styles.checkMark}>✓</Text> : null}
          </Pressable>

          <Text
            style={[styles.title, chore.done && styles.titleDone]}
            numberOfLines={1}
          >
            {chore.title}
          </Text>

          {prio && (
            <View style={[styles.prioPill, { backgroundColor: prio.color + "1F" }]}>
              <View style={[styles.prioDot, { backgroundColor: prio.color }]} />
              <Text style={[styles.prioText, { color: prio.color }]}>{prio.label}</Text>
            </View>
          )}
        </View>

        {/* ── Bottom: assignee · due · repeat · overflow ── */}
        <View style={styles.bottomRow}>
          {assigneeName ? (
            <View style={styles.assignee}>
              <View style={[styles.avatar, { backgroundColor: assigneeColor + "22", borderColor: assigneeColor }]}>
                <Text style={styles.avatarEmoji}>{assigneeEmoji}</Text>
              </View>
              <Text style={styles.assigneeName} numberOfLines={1}>{assigneeName}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {due && !chore.done && (
            <View style={[styles.metaPill, { backgroundColor: dueToneColor(due.tone) + "18" }]}>
              <Text style={[styles.metaPillText, { color: dueToneColor(due.tone) }]}>{due.text}</Text>
            </View>
          )}
          {chore.done && (
            <Text style={styles.completedText}>{t("chore.completed")}</Text>
          )}
          {repeat && (
            <View style={[styles.metaPill, { backgroundColor: theme + "14" }]}>
              <Text style={[styles.metaPillText, { color: theme }]}>↻ {repeat}</Text>
            </View>
          )}

          {chore.selectedForToday && (
            <Text style={styles.todayStar}>☀️</Text>
          )}

          {canReorder && (
            <>
              <IconButton icon="chevron-up" size={15} disabled={isFirst} iconColor={C.textMuted} style={styles.miniBtn} onPress={onMoveUp} />
              <IconButton icon="chevron-down" size={15} disabled={isLast} iconColor={C.textMuted} style={styles.miniBtn} onPress={onMoveDown} />
            </>
          )}

          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <IconButton
                testID={"chore-menu-" + chore.title}
                icon="dots-horizontal"
                size={16}
                iconColor={C.textMuted}
                style={styles.miniBtn}
                onPress={() => setMenuOpen(true)}
              />
            }
          >
            <Menu.Item onPress={() => { setMenuOpen(false); onPress(); }} title={t("edit")} leadingIcon="pencil-outline" />
            <Menu.Item
              onPress={() => { setMenuOpen(false); onToggleToday(); }}
              title={chore.selectedForToday ? t("chore.removeFromToday") : t("chore.addToToday")}
              leadingIcon="white-balance-sunny"
            />
            <Menu.Item
              testID={"chore-delete-" + chore.title}
              onPress={() => { setMenuOpen(false); onDelete(); }}
              title={t("delete")}
              leadingIcon="trash-can-outline"
            />
          </Menu>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.md,
    marginBottom: S.sm,
    gap: S.xs,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", transition: "all 0.18s ease" } as any) : {}),
  },
  cardHover: { transform: [{ translateY: -2 }], ...SHADOW.md },

  topRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 14, color: "#fff", fontWeight: "800", lineHeight: 16 },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  titleDone: { textDecorationLine: "line-through", color: C.textMuted, fontWeight: "400" },

  prioPill: { flexDirection: RTL_ROW, alignItems: "center", gap: 4, paddingHorizontal: S.sm, paddingVertical: 2, borderRadius: 999 },
  prioDot: { width: 7, height: 7, borderRadius: 4 },
  prioText: { fontSize: 11, fontWeight: "700" },

  bottomRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: 2 },
  assignee: { flexDirection: RTL_ROW, alignItems: "center", gap: 5, flexShrink: 1 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 11 },
  assigneeName: { fontSize: 12, fontWeight: "600", color: C.textSecondary, writingDirection: "rtl" },

  metaPill: { paddingHorizontal: S.sm, paddingVertical: 2, borderRadius: 999 },
  metaPillText: { fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
  completedText: { fontSize: 11, fontWeight: "600", color: C.textMuted, writingDirection: "rtl" },
  todayStar: { fontSize: 12 },

  miniBtn: { margin: 0, width: 26, height: 26 },
});
