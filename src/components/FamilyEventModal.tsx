/**
 * FamilyEventModal — Add / edit a family event (recurring or one-time).
 * Supports assignee: family (all), member, or kid.
 * Uses react-hook-form + zod for validation.
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, assigneeTypeLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const timeRegex = /^\d{1,2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    title: z.string().min(1, t("eventModal.titleRequired")),
    assigneeType: z.enum(["family", "member", "kid"]),
    assigneeId: z.string().optional(),
    isRecurring: z.boolean(),
    dayOfWeek: z.number().int().min(0).max(6),
    date: z.string().optional(),
    startTime: z
      .string()
      .regex(timeRegex, t("eventModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("eventModal.invalidTime")),
    endTime: z
      .string()
      .regex(timeRegex, t("eventModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("eventModal.invalidTime")),
    location: z.string().optional(),
  })
  .refine(
    (d) => {
      const s = hhmmToMinutes(d.startTime);
      const e = hhmmToMinutes(d.endTime);
      return !isNaN(s) && !isNaN(e) && e > s;
    },
    { message: t("eventModal.endAfterStart"), path: ["endTime"] },
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
    { message: t("eventModal.invalidDate"), path: ["date"] },
  );

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editEvent?: FamilyEvent | null;
  defaultDayOfWeek?: number;
  defaultDate?: string;
  onSubmit: (data: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
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

export default function FamilyEventModal({
  visible,
  onDismiss,
  editEvent,
  defaultDayOfWeek = 1,
  defaultDate,
  onSubmit,
}: Props) {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const activeMembers = familyMembers.filter((m) => m.isActive);
  const activeKids = kids.filter((k) => k.isActive);

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
      assigneeType: "family",
      assigneeId: undefined,
      isRecurring: true,
      dayOfWeek: defaultDayOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
    },
  });

  useEffect(() => {
    if (visible && editEvent) {
      reset({
        title: editEvent.title,
        assigneeType: editEvent.assigneeType,
        assigneeId: editEvent.assigneeId,
        isRecurring: editEvent.isRecurring,
        dayOfWeek: editEvent.dayOfWeek,
        date: editEvent.date ?? toYMD(new Date()),
        startTime: minutesToHHMM(editEvent.startMinutes),
        endTime: minutesToHHMM(editEvent.endMinutes),
        location: editEvent.location ?? "",
      });
    } else if (visible) {
      reset({
        title: "",
        assigneeType: "family",
        assigneeId: undefined,
        isRecurring: true,
        dayOfWeek: defaultDayOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
    }
  }, [visible, editEvent, defaultDayOfWeek, defaultDate, reset]);

  const assigneeType = watch("assigneeType");
  const selectedDay = watch("dayOfWeek");
  const isRecurring = watch("isRecurring");
  const assigneeId = watch("assigneeId");

  const doSubmit = (data: FormData) => {
    const dayOfWeek = data.isRecurring
      ? data.dayOfWeek
      : dayOfWeekFromYMD(data.date!);

    onSubmit({
      title: data.title.trim(),
      assigneeType: data.assigneeType as AssigneeType,
      assigneeId:
        data.assigneeType === "family" ? undefined : data.assigneeId,
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
        {editEvent ? t("eventModal.editTitle") : t("eventModal.addTitle")}
      </Text>

      {/* Title */}
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label={t("eventModal.titleLabel")}
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

      {/* Assignee type */}
      <Text variant="labelLarge" style={styles.label}>
        {t("eventModal.assignee")}
      </Text>
      <SegmentedButtons
        value={assigneeType}
        onValueChange={(v) => {
          setValue("assigneeType", v as "family" | "member" | "kid");
          setValue("assigneeId", undefined);
        }}
        buttons={[
          { value: "family", label: assigneeTypeLabel("family") },
          { value: "member", label: assigneeTypeLabel("member") },
          { value: "kid", label: assigneeTypeLabel("kid") },
        ]}
        style={styles.segmented}
      />

      {/* Member picker */}
      {assigneeType === "member" && activeMembers.length > 0 && (
        <View style={styles.chipRow}>
          {activeMembers.map((member) => (
            <Button
              key={member.id}
              mode={assigneeId === member.id ? "contained" : "outlined"}
              compact
              onPress={() => setValue("assigneeId", member.id)}
              style={styles.chip}
              labelStyle={styles.chipLabel}
            >
              {member.avatarEmoji ?? ""} {member.name}
            </Button>
          ))}
        </View>
      )}

      {/* Kid picker */}
      {assigneeType === "kid" && activeKids.length > 0 && (
        <View style={styles.chipRow}>
          {activeKids.map((kid) => (
            <Button
              key={kid.id}
              mode={assigneeId === kid.id ? "contained" : "outlined"}
              compact
              onPress={() => setValue("assigneeId", kid.id)}
              style={styles.chip}
              labelStyle={styles.chipLabel}
            >
              {kid.emoji} {kid.name}
            </Button>
          ))}
        </View>
      )}

      {/* Recurring / One-time toggle */}
      <SegmentedButtons
        value={isRecurring ? "recurring" : "oneTime"}
        onValueChange={(v) => setValue("isRecurring", v === "recurring")}
        buttons={[
          { value: "recurring", label: t("eventModal.recurring") },
          { value: "oneTime", label: t("eventModal.oneTime") },
        ]}
        style={styles.segmented}
      />

      {/* Day of week — only for recurring */}
      {isRecurring && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t("eventModal.day")}
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
            {t("eventModal.date")}
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
            {t("eventModal.endTime")}
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
            {t("eventModal.startTime")}
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
            label={t("eventModal.location")}
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
          {editEvent ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  rtlInput: { marginBottom: 8, textAlign: "right" },
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
