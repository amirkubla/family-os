/**
 * ScheduleBlockModal — Add / edit a schedule block (recurring or one-time).
 * Uses react-hook-form + zod for validation.
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { BLOCK_TYPES } from "@src/models/schedule";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, blockTypeLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";
import WheelTimePicker from "./WheelTimePicker";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const timeRegex = /^\d{1,2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    title: z.string().min(1, t("blockModal.titleRequired")),
    type: z.enum(["school", "hobby", "other"]),
    isRecurring: z.boolean(),
    dayOfWeek: z.number().int().min(0).max(6),
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
      // One-time event must have a valid date
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
  defaultDayOfWeek?: number;
  defaultDate?: string; // "YYYY-MM-DD" — pre-fill date for one-time events from calendar
  onSubmit: (data: {
    title: string;
    type: BlockType;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduleBlockModal({
  visible,
  onDismiss,
  editBlock,
  defaultDayOfWeek = 1,
  defaultDate,
  onSubmit,
}: Props) {
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
      dayOfWeek: defaultDayOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
    },
  });

  // Pre-fill when editing
  useEffect(() => {
    if (visible && editBlock) {
      reset({
        title: editBlock.title,
        type: editBlock.type,
        isRecurring: editBlock.isRecurring,
        dayOfWeek: editBlock.dayOfWeek,
        date: editBlock.date ?? toYMD(new Date()),
        startTime: minutesToHHMM(editBlock.startMinutes),
        endTime: minutesToHHMM(editBlock.endMinutes),
        location: editBlock.location ?? "",
      });
    } else if (visible) {
      reset({
        title: "",
        type: "other",
        isRecurring: true,
        dayOfWeek: defaultDayOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
    }
  }, [visible, editBlock, defaultDayOfWeek, defaultDate, reset]);

  const selectedType = watch("type");
  const selectedDay = watch("dayOfWeek");
  const isRecurring = watch("isRecurring");

  const doSubmit = (data: FormData) => {
    const dayOfWeek = data.isRecurring
      ? data.dayOfWeek
      : dayOfWeekFromYMD(data.date!);

    onSubmit({
      title: data.title.trim(),
      type: data.type,
      dayOfWeek,
      startMinutes: hhmmToMinutes(data.startTime),
      endMinutes: hhmmToMinutes(data.endTime),
      location: data.location?.trim() || undefined,
      isRecurring: data.isRecurring,
      date: data.isRecurring ? undefined : data.date,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text variant="titleLarge" style={styles.heading}>
        {editBlock ? t("blockModal.editTitle") : t("blockModal.addTitle")}
      </Text>

      {/* Title */}
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label={t("blockModal.titleLabel")}
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.rtlInput}
            error={!!errors.title}
          />
        )}
      />
      {errors.title && (
        <Text style={styles.error}>{errors.title.message}</Text>
      )}

      {/* Type */}
      <Text variant="labelLarge" style={styles.label}>
        {t("blockModal.type")}
      </Text>
      <View style={styles.chipRow}>
        {BLOCK_TYPES.map((bt) => (
          <Button
            key={bt.value}
            mode={selectedType === bt.value ? "contained" : "outlined"}
            compact
            onPress={() => setValue("type", bt.value)}
            style={styles.chip}
            labelStyle={styles.chipLabel}
          >
            {blockTypeLabel(bt.value)}
          </Button>
        ))}
      </View>

      {/* Recurring / One-time toggle */}
      <SegmentedButtons
        value={isRecurring ? "recurring" : "oneTime"}
        onValueChange={(v) => setValue("isRecurring", v === "recurring")}
        buttons={[
          { value: "recurring", label: t("blockModal.recurring") },
          { value: "oneTime", label: t("blockModal.oneTime") },
        ]}
        style={styles.segmented}
      />

      {/* Day of week — only for recurring */}
      {isRecurring && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t("blockModal.day")}
          </Text>
          <View style={styles.chipRow}>
            {Array.from({ length: 7 }, (_, idx) => (
              <Button
                key={idx}
                mode={selectedDay === idx ? "contained" : "outlined"}
                compact
                onPress={() => setValue("dayOfWeek", idx)}
                style={styles.chip}
                labelStyle={styles.chipLabel}
              >
                {dayNameShort(idx)}
              </Button>
            ))}
          </View>
        </>
      )}

      {/* Date picker — only for one-time events */}
      {!isRecurring && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t("blockModal.date")}
          </Text>
          <Controller
            control={control}
            name="date"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.rtlInput}
                placeholder="2026-03-15"
                error={!!errors.date}
              />
            )}
          />
          {errors.date && (
            <Text style={styles.error}>{errors.date.message}</Text>
          )}
        </>
      )}

      {/* Times */}
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text variant="labelLarge" style={styles.label}>
            {t("blockModal.endTime")}
          </Text>
          <Controller
            control={control}
            name="endTime"
            render={({ field: { onChange, value } }) => (
              <WheelTimePicker value={value} onChange={onChange} />
            )}
          />
        </View>
        <View style={styles.timeCol}>
          <Text variant="labelLarge" style={styles.label}>
            {t("blockModal.startTime")}
          </Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { onChange, value } }) => (
              <WheelTimePicker value={value} onChange={onChange} />
            )}
          />
        </View>
      </View>
      {errors.endTime && (
        <Text style={styles.error}>{errors.endTime.message}</Text>
      )}

      {/* Location */}
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label={t("blockModal.location")}
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.rtlInput}
          />
        )}
      />

      {/* Actions */}
      <View style={styles.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit(doSubmit)}>
          {editBlock ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 8 },
  rtlInput: { marginBottom: 8, textAlign: "right", writingDirection: "rtl" },
  label: { marginBottom: 6, marginTop: 4, color: "#6B6B8D", textAlign: "right" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: { borderRadius: 20 },
  chipLabel: { fontSize: 12 },
  segmented: { marginBottom: 10, marginTop: 4 },
  timeRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1 },
  error: { color: "#FF6B6B", fontSize: 12, marginBottom: 4, marginTop: -4 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
});
