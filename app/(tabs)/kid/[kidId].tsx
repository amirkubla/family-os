/**
 * Kid Schedule screen — Calendar + Template views.
 *
 * Route: /kid/:kidId
 */

import React, { useState, useMemo, useLayoutEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Text,
  Card,
  IconButton,
  Chip,
  SegmentedButtons,
  FAB,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  useKidBlocks,
  useKidBlocksForDate,
  useKidOneTimeBlocks,
} from "@src/store/scheduleSelectors";
import {
  addScheduleBlockRemote,
  updateScheduleBlockRemote,
  deleteScheduleBlockRemote,
} from "@src/lib/sync/remoteCrud";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { t, dayName, blockTypeLabel } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";
import { TYPE_COLORS } from "@src/ui/semanticColors";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function BlockRow({
  block,
  kidColor,
  onEdit,
  onDelete,
}: {
  block: ScheduleBlock;
  kidColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = block.color ?? kidColor;
  return (
    <Pressable
      style={({ hovered }: any) => [
        styles.blockRow,
        hovered && styles.blockRowHover,
      ]}
      onPress={onEdit}
    >
      <View style={[styles.blockStripe, { backgroundColor: color }]} />
      <View style={styles.blockInfo}>
        <View style={styles.blockTitleRow}>
          <Text variant="bodyMedium" style={styles.blockTitle}>
            {block.title}
          </Text>
          {!block.isRecurring && (
            <Text style={styles.oneTimeBadge}>{t("kid.oneTimeEvent")}</Text>
          )}
        </View>
        <Text variant="bodySmall" style={styles.blockTime}>
          {minutesToHHMM(block.startMinutes)} – {minutesToHHMM(block.endMinutes)}
          {block.location ? `  ·  ${block.location}` : ""}
        </Text>
      </View>
      <Chip
        compact
        textStyle={{ fontSize: 10, color: TYPE_COLORS[block.type] }}
        style={[
          styles.typeChip,
          { backgroundColor: TYPE_COLORS[block.type] + "22" },
        ]}
      >
        {blockTypeLabel(block.type)}
      </Chip>
      <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function KidScheduleScreen() {
  const { kidId } = useLocalSearchParams<{ kidId: string }>();
  const storeKids = useFamilyStore((s) => s.kids);

  const navigation = useNavigation();
  const kid = storeKids.find((k) => k.id === kidId);
  const kidColor = kid?.color ?? C.purple;

  // Set header options once
  useLayoutEffect(() => {
    navigation.setOptions({
      title: kid ? `${kid.emoji}\u2003\u2003${kid.name}` : t("kid.schedule"),
      headerTintColor: kidColor,
      headerBackTitle: t("tabs.today"),
    });
  }, [navigation, kid?.name, kid?.emoji, kidColor]);

  // Tab
  const [tab, setTab] = useState("calendar");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const dayBlocks = useKidBlocksForDate(kidId!, selectedDate, selectedDow);

  // Template — all recurring blocks grouped by day
  const allBlocks = useKidBlocks(kidId!);
  const blocksByDay = useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const b of allBlocks) {
      map[b.dayOfWeek]?.push(b);
    }
    return map;
  }, [allBlocks]);

  // One-time events for calendar dots
  const oneTimeBlocks = useKidOneTimeBlocks(kidId!);

  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [modalDay, setModalDay] = useState(1);

  const openAdd = (dayOfWeek?: number) => {
    setEditingBlock(null);
    setModalDay(dayOfWeek ?? (tab === "calendar" ? selectedDow : 1));
    setModalOpen(true);
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setModalDay(block.dayOfWeek);
    setModalOpen(true);
  };

  const handleSubmit = (data: {
    title: string;
    type: BlockType;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => {
    if (editingBlock) {
      updateScheduleBlockRemote(editingBlock.id, data);
    } else {
      addScheduleBlockRemote({ ...data, kidId: kidId! });
    }
  };

  // Build markedDates for calendar
  const markedDates = useMemo(() => {
    const marks: Record<string, { dotColor: string }> = {};
    const now = new Date();
    for (let offset = -30; offset <= 30; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ymd = toYMD(d);
      const dow = d.getDay();
      if (blocksByDay[dow]?.length > 0) {
        marks[ymd] = { dotColor: kidColor };
      }
    }
    for (const b of oneTimeBlocks) {
      if (b.date) marks[b.date] = { dotColor: kidColor };
    }
    return marks;
  }, [blocksByDay, oneTimeBlocks, kidColor]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header accent bar */}
          <View style={[styles.accentBar, { backgroundColor: kidColor + "22" }]}>
            <Text style={[styles.accentText, { color: kidColor }]}>
              {kid?.emoji} {t("kid.kidSchedule", { name: kid?.name ?? "" })}
            </Text>
          </View>

          {/* Tabs */}
          <SegmentedButtons
            value={tab}
            onValueChange={setTab}
            buttons={[
              { value: "calendar", label: t("kid.calendar") },
              { value: "template", label: t("kid.template") },
            ]}
            style={styles.tabs}
          />

          {/* --- Calendar View --- */}
          {tab === "calendar" && (
            <>
              <Card style={styles.card} mode="elevated">
                <Card.Content>
                  <MonthCalendar
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    markedDates={markedDates}
                    accentColor={kidColor}
                  />
                </Card.Content>
              </Card>

              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("kid.daySchedule", { day: dayName(selectedDow) })}
              </Text>

              {dayBlocks.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {t("kid.nothingScheduled", { day: dayName(selectedDow) })}
                </Text>
              ) : (
                <Card style={styles.card} mode="elevated">
                  <Card.Content>
                    {dayBlocks.map((b) => (
                      <BlockRow
                        key={b.id}
                        block={b}
                        kidColor={kidColor}
                        onEdit={() => openEdit(b)}
                        onDelete={() => requestDelete(() => deleteScheduleBlockRemote(b.id))}
                      />
                    ))}
                  </Card.Content>
                </Card>
              )}
            </>
          )}

          {/* --- Template View (recurring only) --- */}
          {tab === "template" && (
            <>
              {Array.from({ length: 7 }, (_, dow) => (
                <View key={dow} style={styles.templateDay}>
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.templateHeader,
                      hovered && styles.templateHeaderHover,
                    ]}
                    onPress={() => openAdd(dow)}
                  >
                    <Text variant="titleSmall" style={styles.templateDayName}>
                      {dayName(dow)}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={18}
                      pointerEvents="none"
                    />
                  </Pressable>

                  {blocksByDay[dow].length === 0 ? (
                    <Text variant="bodySmall" style={styles.emptyText}>
                      {t("kid.noBlocks")}
                    </Text>
                  ) : (
                    blocksByDay[dow].map((b) => (
                      <BlockRow
                        key={b.id}
                        block={b}
                        kidColor={kidColor}
                        onEdit={() => openEdit(b)}
                        onDelete={() => requestDelete(() => deleteScheduleBlockRemote(b.id))}
                      />
                    ))
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: kidColor }]}
          color="#FFF"
          onPress={() => openAdd()}
        />

        <ScheduleBlockModal
          visible={modalOpen}
          onDismiss={() => {
            setModalOpen(false);
            setEditingBlock(null);
          }}
          editBlock={editingBlock}
          defaultDayOfWeek={modalDay}
          defaultDate={tab === "calendar" ? selectedDate : undefined}
          onSubmit={handleSubmit}
        />
        <ConfirmDeleteModal
          visible={confirmVisible}
          onConfirm={confirmDelete}
          onDismiss={dismissConfirm}
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.xl, paddingBottom: 80 },

  accentBar: {
    borderRadius: R.md,
    padding: 14,
    marginBottom: S.lg,
    alignItems: "center",
  },
  accentText: { fontSize: 18, fontWeight: "800", textAlign: "center" },

  tabs: { marginBottom: S.lg },

  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },

  sectionTitle: { fontWeight: "700", color: C.textPrimary, marginBottom: S.sm, textAlign: "right" },
  emptyText: { color: C.textSecondary, marginBottom: S.md, textAlign: "right" },

  // Block row
  blockRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    borderRadius: 10,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  blockRowHover: {
    backgroundColor: C.hoverBg,
  },
  blockStripe: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginEnd: S.md,
    marginStart: S.xs,
  },
  blockInfo: { flex: 1 },
  blockTitleRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  blockTitle: { fontWeight: "600", color: C.textPrimary, textAlign: "right" },
  blockTime: { color: C.textSecondary, marginTop: 2, textAlign: "right" },
  typeChip: { borderRadius: 10, marginStart: S.sm, marginEnd: S.xs },
  oneTimeBadge: {
    fontSize: 9,
    color: C.amber,
    backgroundColor: C.amber + "22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.sm,
    overflow: "hidden",
    fontWeight: "600",
  },

  // Template
  templateDay: {
    marginBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingBottom: S.sm,
  },
  templateHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  templateHeaderHover: {
    backgroundColor: C.hoverBg,
  },
  templateDayName: { fontWeight: "700", color: C.textPrimary, textAlign: "right" },

  fab: {
    position: "absolute",
    left: S.xl,
    bottom: S.xl,
    borderRadius: R.lg,
  },
});
