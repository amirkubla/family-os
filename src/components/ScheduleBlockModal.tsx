/**
 * ScheduleBlockModal — Add / edit a schedule block (recurring or one-time).
 * Uses react-hook-form + zod for validation.
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { BLOCK_TYPES } from "@src/models/schedule";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, blockTypeLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
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
  defaultDate?: string;
  onSubmit: (data: {
    title: string;
    type: BlockType;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
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
      dayOfWeek: defaultDayOfWeek,
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
        dayOfWeek: editBlock.dayOfWeek,
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
        dayOfWeek: defaultDayOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
      setSelectedReminders([]);
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
      reminders: selectedReminders.length > 0 ? selectedReminders : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text variant="titleLarge" style={MS.heading}>
        {editBlock ? t("blockModal.editTitle") : t("blockModal.addTitle")}
      </Text>

      {/* Title */}
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
      {errors.title && (
        <Text style={MS.error}>{errors.title.message}</Text>
      )}

      {/* Type */}
      <Text variant="labelLarge" style={MS.label}>
        {t("blockModal.type")}
      </Text>
      <View style={MS.chipRow}>
        {BLOCK_TYPES.map((bt) => (
          <Button
            key={bt.value}
            mode={selectedType === bt.value ? "contained" : "outlined"}
            compact
            onPress={() => setValue("type", bt.value)}
            style={MS.chip}
            labelStyle={MS.chipLabel}
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
        style={MS.segmented}
      />

      {/* Day of week — only for recurring */}
      {isRecurring && (
        <>
          <Text variant="labelLarge" style={MS.label}>
            {t("blockModal.day")}
          </Text>
          <View style={MS.chipRow}>
            {Array.from({ length: 7 }, (_, idx) => (
              <Button
                key={idx}
                mode={selectedDay === idx ? "contained" : "outlined"}
                compact
                onPress={() => setValue("dayOfWeek", idx)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
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
          <Text variant="labelLarge" style={MS.label}>
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
                style={MS.input}
                contentStyle={MS.inputContent}
                placeholder="2026-03-15"
                error={!!errors.date}
              />
            )}
          />
          {errors.date && (
            <Text style={MS.error}>{errors.date.message}</Text>
          )}
        </>
      )}

      {/* Times */}
      <View style={MS.timeRow}>
        <View style={MS.timeCol}>
          <Text variant="labelLarge" style={MS.label}>
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
        <View style={MS.timeCol}>
          <Text variant="labelLarge" style={MS.label}>
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
      </View>
      {errors.endTime && (
        <Text style={MS.error}>{errors.endTime.message}</Text>
      )}

      {/* Location */}
      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <TextInput
            placeholder={t("blockModal.location")}
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={MS.input}
            contentStyle={MS.inputContent}
          />
        )}
      />

      {/* Reminders */}
      <Text variant="labelLarge" style={MS.label}>
        {t("eventModal.reminders")}
      </Text>
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
            >
              {label}
            </Button>
          );
        })}
      </View>

      {/* Actions */}
      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit(doSubmit)}>
          {editBlock ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
