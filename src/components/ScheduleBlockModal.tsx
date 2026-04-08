/**
 * ScheduleBlockModal — Add / edit a schedule block (recurring or one-time).
 * Premium styled modal with sectioned layout.
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { BLOCK_TYPES } from "@src/models/schedule";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, blockTypeLabel } from "@src/i18n";
import { MS, SEGMENT_THEME, SEGMENT_COLORS } from "@src/ui/modalStyles";
import ModalWrapper from "./ModalWrapper";
import WheelTimePicker from "./WheelTimePicker";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const timeRegex = /^\d{1,2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const REMINDER_PRESETS = [
  { minutes: 5, label: "5 דק׳" },
  { minutes: 15, label: "15 דק׳" },
  { minutes: 30, label: "30 דק׳" },
  { minutes: 60, label: "שעה" },
  { minutes: 1440, label: "יום" },
];

const schema = z
  .object({
    title: z.string().min(1, t("blockModal.titleRequired")),
    type: z.enum(["school", "hobby", "other"]),
    isRecurring: z.boolean(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    date: z.string().optional(),
    startTime: z
      .string()
      .regex(timeRegex, t("blockModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("blockModal.invalidTime")),
    endTime: z
      .string()
      .regex(timeRegex, t("blockModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("blockModal.invalidTime")),
    location: z.string().optional(),
  })
  .refine(
    (d) => {
      const s = hhmmToMinutes(d.startTime);
      const e = hhmmToMinutes(d.endTime);
      return !isNaN(s) && !isNaN(e) && e > s;
    },
    { message: t("blockModal.endAfterStart"), path: ["endTime"] },
  )
  .refine(
    (d) => {
      if (d.isRecurring) return true;
      if (!d.date || !dateRegex.test(d.date)) return false;
      const [y, m, day] = d.date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, day);
      return (
        dateObj.getFullYear() === y &&
        dateObj.getMonth() === m - 1 &&
        dateObj.getDate() === day
      );
    },
    { message: t("blockModal.invalidDate"), path: ["date"] },
  );

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editBlock?: ScheduleBlock | null;
  defaultDaysOfWeek?: number[];
  defaultDate?: string;
  onSubmit: (data: {
    title: string;
    type: BlockType;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => void;
  onDelete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduleBlockModal({
  visible,
  onDismiss,
  editBlock,
  defaultDaysOfWeek = [1],
  defaultDate,
  onSubmit,
  onDelete,
}: Props) {
  const kids = useFamilyStore((s) => s.kids);
  const editKid = editBlock ? kids.find((k) => k.id === editBlock.kidId) : undefined;
  const [selectedReminders, setSelectedReminders] = useState<number[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "other",
      isRecurring: true,
      daysOfWeek: defaultDaysOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
    },
  });

  useEffect(() => {
    if (visible && editBlock) {
      reset({
        title: editBlock.title,
        type: editBlock.type,
        isRecurring: editBlock.isRecurring,
        daysOfWeek: editBlock.daysOfWeek,
        date: editBlock.date ?? toYMD(new Date()),
        startTime: minutesToHHMM(editBlock.startMinutes),
        endTime: minutesToHHMM(editBlock.endMinutes),
        location: editBlock.location ?? "",
      });
      setSelectedReminders(editBlock.reminders ?? []);
    } else if (visible) {
      reset({
        title: "",
        type: "other",
        isRecurring: true,
        daysOfWeek: defaultDaysOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
      setSelectedReminders([]);
    }
  }, [visible, editBlock, defaultDaysOfWeek, defaultDate, reset]);

  const selectedType = watch("type");
  const selectedDays = watch("daysOfWeek");
  const isRecurring = watch("isRecurring");

  const doSubmit = (data: FormData) => {
    const daysOfWeek = data.isRecurring
      ? data.daysOfWeek
      : [dayOfWeekFromYMD(data.date!)];

    onSubmit({
      title: data.title.trim(),
      type: data.type,
      daysOfWeek,
      startMinutes: hhmmToMinutes(data.startTime),
      endMinutes: hhmmToMinutes(data.endTime),
      location: data.location?.trim() || undefined,
      isRecurring: data.isRecurring,
      date: data.isRecurring ? undefined : data.date,
      reminders: selectedReminders.length > 0 ? selectedReminders : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      {/* ── Header ── */}
      <View style={MS.headerBar}>
        <View style={MS.headerIconWrap}>
          <Text style={MS.headerIcon}>📅</Text>
        </View>
        <Text style={MS.heading}>
          {editBlock ? t("blockModal.editTitle") : t("blockModal.addTitle")}
        </Text>
      </View>

      {editKid && (
        <View style={MS.kidBadge}>
          <Text style={{ fontSize: 18 }}>{editKid.emoji}</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: editKid.color }}>{editKid.name}</Text>
        </View>
      )}

      {/* ── Title & Type section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>✏️</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.titleLabel")}</Text>
        </View>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder={t("blockModal.titleLabel")}
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={MS.input}
              contentStyle={MS.inputContent}
              error={!!errors.title}
            />
          )}
        />
        {errors.title && <Text style={MS.error}>{errors.title.message}</Text>}

        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>🏷️</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.type")}</Text>
        </View>
        <View style={MS.chipRow}>
          {BLOCK_TYPES.map((bt) => {
            const sel = selectedType === bt.value;
            return (
              <Button
                key={bt.value}
                mode={sel ? "contained" : "outlined"}
                compact
                onPress={() => setValue("type", bt.value)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
                buttonColor={sel ? C.selectBg : undefined}
                textColor={sel ? C.selectText : C.textSecondary}
              >
                {blockTypeLabel(bt.value)}
              </Button>
            );
          })}
        </View>
      </View>

      {/* ── Schedule section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>{isRecurring ? "🔄" : "1️⃣"}</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.schedule")}</Text>
        </View>
        <SegmentedButtons
          value={isRecurring ? "recurring" : "oneTime"}
          onValueChange={(v) => setValue("isRecurring", v === "recurring")}
          buttons={[
            { value: "recurring", label: t("blockModal.recurring"), ...SEGMENT_COLORS },
            { value: "oneTime", label: t("blockModal.oneTime"), ...SEGMENT_COLORS },
          ]}
          style={MS.segmented}
          theme={SEGMENT_THEME}
        />

        {isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionIcon}>📆</Text>
              <Text style={MS.sectionLabel}>{t("blockModal.day")}</Text>
            </View>
            <View style={MS.chipRow}>
              {Array.from({ length: 7 }, (_, idx) => {
                const sel = selectedDays.includes(idx);
                return (
                  <Button
                    key={idx}
                    mode={sel ? "contained" : "outlined"}
                    compact
                    onPress={() => {
                      const cur = selectedDays;
                      if (cur.includes(idx)) {
                        if (cur.length > 1) setValue("daysOfWeek", cur.filter((d) => d !== idx));
                      } else {
                        setValue("daysOfWeek", [...cur, idx]);
                      }
                    }}
                    style={MS.chip}
                    labelStyle={MS.chipLabel}
                    buttonColor={sel ? C.selectBg : undefined}
                    textColor={sel ? C.selectText : C.textSecondary}
                  >
                    {dayNameShort(idx)}
                  </Button>
                );
              })}
            </View>
          </>
        )}

        {!isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionIcon}>📆</Text>
              <Text style={MS.sectionLabel}>{t("blockModal.date")}</Text>
            </View>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  mode="outlined"
                  style={MS.input}
                  contentStyle={MS.inputContent}
                  placeholder="2026-03-15"
                  error={!!errors.date}
                />
              )}
            />
            {errors.date && <Text style={MS.error}>{errors.date.message}</Text>}
          </>
        )}
      </View>

      {/* ── Time section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>⏰</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.startTime")}</Text>
        </View>
        <View style={MS.timeRow}>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("blockModal.startTime")}</Text>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <WheelTimePicker value={value} onChange={onChange} />
              )}
            />
          </View>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("blockModal.endTime")}</Text>
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange, value } }) => (
                <WheelTimePicker value={value} onChange={onChange} />
              )}
            />
          </View>
        </View>
        {errors.endTime && <Text style={MS.error}>{errors.endTime.message}</Text>}
      </View>

      {/* ── Location section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>📍</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.location")}</Text>
        </View>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder={t("blockModal.location")}
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={[MS.input, { marginBottom: 0 }]}
              contentStyle={MS.inputContent}
            />
          )}
        />
      </View>

      {/* ── Reminders section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>🔔</Text>
          <Text style={MS.sectionLabel}>{t("eventModal.reminders")}</Text>
        </View>
        <View style={MS.chipRow}>
          {REMINDER_PRESETS.map(({ minutes, label }) => {
            const selected = selectedReminders.includes(minutes);
            return (
              <Button
                key={minutes}
                mode={selected ? "contained" : "outlined"}
                compact
                onPress={() => {
                  if (selected) {
                    setSelectedReminders((prev) =>
                      prev.filter((m) => m !== minutes),
                    );
                  } else if (selectedReminders.length < 3) {
                    setSelectedReminders((prev) => [...prev, minutes]);
                  }
                }}
                style={MS.chip}
                labelStyle={MS.chipLabel}
                buttonColor={selected ? C.selectBg : undefined}
                textColor={selected ? C.selectText : C.textSecondary}
              >
                {label}
              </Button>
            );
          })}
        </View>
      </View>

      {/* ── Delete ── */}
      {editBlock && onDelete && (
        <Button
          mode="outlined"
          onPress={() => {
            onDelete();
            onDismiss();
          }}
          textColor={C.red}
          icon="delete-outline"
          style={{ borderColor: C.red + "44", borderRadius: 12, marginTop: S.md }}
          contentStyle={{ flexDirection: RTL_ROW }}
        >
          {t("eventModal.delete")}
        </Button>
      )}

      {/* ── Actions ── */}
      <View style={MS.actions}>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={MS.cancelBtn}
          labelStyle={MS.cancelLabel}
        >
          {t("cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(doSubmit)}
          style={MS.saveBtn}
          labelStyle={MS.saveBtnLabel}
        >
          {editBlock ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
