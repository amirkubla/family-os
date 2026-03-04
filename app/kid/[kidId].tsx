/**
 * Kid Schedule screen — Calendar + Template views.
 *
 * Route: /kid/:kidId
 */

import React, { useState, useMemo, useLayoutEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
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

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<BlockType, string> = {
  school: "#6C63FF",
  hobby: "#FF6B6B",
  other: "#4ECDC4",
};

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
    <Pressable style={styles.blockRow} onPress={onEdit}>
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
  const kidColor = kid?.color ?? "#6C63FF";

  // Set header options once
  useLayoutEffect(() => {
    navigation.setOptions({
      title: kid ? `${kid.emoji} ${kid.name}` : t("kid.schedule"),
      headerTintColor: kidColor,
      headerBackTitle: t("tabs.today"),
    });
  }, [navigation, kid?.name, kid?.emoji, kidColor]);

  // Tab
  const [tab, setTab] = useState("calendar");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  // Shows both recurring blocks for this DOW and one-time events on this exact date
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
    // Recurring blocks: mark 60 days around today for days-of-week that have blocks
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
    // One-time events: mark their specific dates
    for (const b of oneTimeBlocks) {
      if (b.date) {
        marks[b.date] = { dotColor: kidColor };
      }
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
                        onDelete={() => deleteScheduleBlockRemote(b.id)}
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
                  <View style={styles.templateHeader}>
                    <Text variant="titleSmall" style={styles.templateDayName}>
                      {dayName(dow)}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={18}
                      onPress={() => openAdd(dow)}
                    />
                  </View>

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
                        onDelete={() => deleteScheduleBlockRemote(b.id)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 80 },

  accentBar: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  accentText: { fontSize: 18, fontWeight: "800", textAlign: "center" },

  tabs: { marginBottom: 16 },

  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 16 },

  sectionTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 8, textAlign: "right" },
  emptyText: { color: "#8E8BA8", marginBottom: 12, textAlign: "right" },

  // Block row
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEFF",
  },
  blockStripe: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginEnd: 10,
  },
  blockInfo: { flex: 1 },
  blockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  blockTitle: { fontWeight: "600", color: "#1A1A2E", textAlign: "right" },
  blockTime: { color: "#6B6B8D", marginTop: 2, textAlign: "right" },
  typeChip: { borderRadius: 10, height: 24, marginStart: 8, marginEnd: 4 },
  oneTimeBadge: {
    fontSize: 9,
    color: "#FFA726",
    backgroundColor: "#FFA72622",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "600",
  },

  // Template
  templateDay: {
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0DFF5",
    paddingBottom: 8,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templateDayName: { fontWeight: "700", color: "#1A1A2E", textAlign: "right" },

  fab: {
    position: "absolute",
    left: 20,
    bottom: 24,
    borderRadius: 16,
  },
});
