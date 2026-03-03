/**
 * ScheduleBlockModal — Add / edit a weekly schedule block.
 * Uses react-hook-form + zod for validation.
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { BLOCK_TYPES } from "@src/models/schedule";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { t, dayNameShort, blockTypeLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const timeRegex = /^\d{1,2}:\d{2}$/;

const schema = z
  .object({
    title: z.string().min(1, t("blockModal.titleRequired")),
    type: z.enum(["school", "hobby", "other"]),
    dayOfWeek: z.number().int().min(0).max(6),
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
  onSubmit: (data: {
    title: string;
    type: BlockType;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
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
      dayOfWeek: defaultDayOfWeek,
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
        dayOfWeek: editBlock.dayOfWeek,
        startTime: minutesToHHMM(editBlock.startMinutes),
        endTime: minutesToHHMM(editBlock.endMinutes),
        location: editBlock.location ?? "",
      });
    } else if (visible) {
      reset({
        title: "",
        type: "other",
        dayOfWeek: defaultDayOfWeek,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
    }
  }, [visible, editBlock, defaultDayOfWeek, reset]);

  const selectedType = watch("type");
  const selectedDay = watch("dayOfWeek");

  const doSubmit = (data: FormData) => {
    onSubmit({
      title: data.title.trim(),
      type: data.type,
      dayOfWeek: data.dayOfWeek,
      startMinutes: hhmmToMinutes(data.startTime),
      endMinutes: hhmmToMinutes(data.endTime),
      location: data.location?.trim() || undefined,
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

      {/* Day of week */}
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
              <TextInput
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.rtlInput}
                placeholder="10:00"
                error={!!errors.endTime}
              />
            )}
          />
          {errors.endTime && (
            <Text style={styles.error}>{errors.endTime.message}</Text>
          )}
        </View>
        <View style={styles.timeCol}>
          <Text variant="labelLarge" style={styles.label}>
            {t("blockModal.startTime")}
          </Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                mode="outlined"
                style={styles.rtlInput}
                placeholder="08:00"
                error={!!errors.startTime}
              />
            )}
          />
          {errors.startTime && (
            <Text style={styles.error}>{errors.startTime.message}</Text>
          )}
        </View>
      </View>

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
  rtlInput: { marginBottom: 8, textAlign: "right" },
  label: { marginBottom: 6, marginTop: 4, color: "#6B6B8D", textAlign: "right" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: { borderRadius: 20 },
  chipLabel: { fontSize: 12 },
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
