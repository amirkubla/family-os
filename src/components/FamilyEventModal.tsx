/**
 * FamilyEventModal — Add / edit a family event (recurring or one-time).
 * Premium styled modal with sectioned layout.
 */

import React, { useEffect, useState, useRef } from "react";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";
import SegmentedPills from "@src/components/SegmentedPills";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, assigneeTypeLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import ModalWrapper from "./ModalWrapper";
import SelectChip from "./SelectChip";
import DateTimeField from "./DateTimeField";
import { formatDateHe } from "./DatePicker";

const timeRegex = /^\d{1,2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const REMINDER_PRESETS = [
  { minutes: 5, label: "5 דק׳" },
  { minutes: 15, label: "15 דק׳" },
  { minutes: 30, label: "30 דק׳" },
  { minutes: 60, label: "שעה" },
  { minutes: 360, label: "6 שעות" },
  { minutes: 720, label: "12 שעות" },
  { minutes: 1440, label: "יום" },
];

const schema = z
  .object({
    title: z.string().min(1, t("eventModal.titleRequired")),
    assigneeType: z.enum(["family", "member", "kid"]),
    assigneeId: z.string().optional(),
    isRecurring: z.boolean(),
    allDay: z.boolean(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    date: z.string().optional(),
    endDate: z.string().optional(),
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
      if (d.allDay) return true; // all-day ignores the time range
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
  )
  .refine(
    // Multi-day end date must not precede the start date.
    (d) => d.isRecurring || !d.endDate || !d.date || d.endDate >= d.date,
    { message: t("eventModal.endDateBeforeStart"), path: ["endDate"] },
  );

type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editEvent?: FamilyEvent | null;
  defaultDaysOfWeek?: number[];
  defaultDate?: string;
  defaultStartTime?: string; // HH:MM — pre-fill from slot click
  defaultEndTime?: string;   // HH:MM — pre-fill from slot click
  onSubmit: (data: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    endDate?: string;
    allDay?: boolean;
    reminders?: number[];
  }) => void;
  onDelete?: () => void;
}

export default function FamilyEventModal({
  visible,
  onDismiss,
  editEvent,
  defaultDaysOfWeek = [1],
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onSubmit,
  onDelete,
}: Props) {
  const theme = useThemeColor();
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const activeMembers = familyMembers.filter((m) => m.isActive);
  const activeKids = kids.filter((k) => k.isActive);

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
      assigneeType: "family",
      assigneeId: undefined,
      isRecurring: true,
      allDay: false,
      daysOfWeek: defaultDaysOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      endDate: undefined,
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
        allDay: editEvent.allDay ?? false,
        daysOfWeek: editEvent.daysOfWeek,
        date: editEvent.date ?? toYMD(new Date()),
        endDate: editEvent.endDate,
        startTime: minutesToHHMM(editEvent.startMinutes),
        endTime: minutesToHHMM(editEvent.endMinutes),
        location: editEvent.location ?? "",
      });
      setSelectedReminders(editEvent.reminders ?? []);
    } else if (visible) {
      const hasSlotTime = !!defaultStartTime;
      reset({
        title: "",
        assigneeType: "family",
        assigneeId: undefined,
        isRecurring: hasSlotTime ? false : true,
        allDay: false,
        daysOfWeek: defaultDaysOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        endDate: undefined,
        startTime: defaultStartTime ?? "09:00",
        endTime: defaultEndTime ?? "10:00",
        location: "",
      });
      setSelectedReminders([]);
    }
  }, [visible, editEvent, defaultDaysOfWeek, defaultDate, defaultStartTime, defaultEndTime, reset]);

  const assigneeType = watch("assigneeType");
  const selectedDays = watch("daysOfWeek");
  const isRecurring = watch("isRecurring");
  const allDay = watch("allDay");
  const startDate = watch("date");
  const assigneeId = watch("assigneeId");

  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
  // Ref for synchronous re-entrancy check; state for visual disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (visible) {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [visible]);

  const doSubmit = (data: FormData) => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    submittingRef.current = true;
    setSubmitting(true);
    const daysOfWeek = data.isRecurring
      ? data.daysOfWeek
      : [dayOfWeekFromYMD(data.date!)];

    // Multi-day end date only when it's a one-time event and is after the start.
    const endDate =
      !data.isRecurring && data.endDate && data.date && data.endDate > data.date
        ? data.endDate
        : undefined;

    onSubmit({
      title: data.title.trim(),
      assigneeType: data.assigneeType as AssigneeType,
      assigneeId: data.assigneeType === "family" ? undefined : data.assigneeId,
      daysOfWeek,
      // All-day events span the whole day (0–1439, the max minute-of-day) and
      // ignore the pickers; the UI shows "כל היום" off the allDay flag.
      startMinutes: data.allDay ? 0 : hhmmToMinutes(data.startTime),
      endMinutes: data.allDay ? 1439 : hhmmToMinutes(data.endTime),
      location: data.location?.trim() || undefined,
      isRecurring: data.isRecurring,
      date: data.isRecurring ? undefined : data.date,
      endDate,
      allDay: data.allDay,
      reminders: selectedReminders.length > 0 ? selectedReminders : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="calendar-outline"
      title={editEvent ? t("eventModal.editTitle") : t("eventModal.addTitle")}
      subtitle={!editEvent && defaultDate ? formatDateHe(defaultDate) : undefined}
      onSave={handleSubmit(doSubmit)}
      saveDisabled={submitting}
      saveLoading={submitting}
    >
      {/* ── Title & Assignee section ── */}
      <View style={MS.section}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <ModalTextInput
              placeholder={t("eventModal.titleLabel")}
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
          <Text style={MS.sectionLabel}>{t("eventModal.assignee")}</Text>
          <Text style={MS.sectionIcon}>👥</Text>
        </View>
        <View style={MS.segmented}>
          <SegmentedPills
            value={assigneeType}
            onChange={(v) => {
              setValue("assigneeType", v as "family" | "member" | "kid");
              setValue("assigneeId", undefined);
            }}
            options={[
              { value: "family", label: assigneeTypeLabel("family") },
              { value: "member", label: assigneeTypeLabel("member") },
              { value: "kid", label: assigneeTypeLabel("kid") },
            ]}
          />
        </View>

        {assigneeType === "member" && activeMembers.length > 0 && (
          <View style={MS.chipRow}>
            {activeMembers.map((member) => (
              <SelectChip
                key={member.id}
                label={member.name}
                emoji={member.avatarEmoji ?? "👤"}
                color={member.color || theme}
                selected={assigneeId === member.id}
                onPress={() => setValue("assigneeId", member.id)}
              />
            ))}
          </View>
        )}

        {assigneeType === "kid" && activeKids.length > 0 && (
          <View style={MS.chipRow}>
            {activeKids.map((kid) => (
              <SelectChip
                key={kid.id}
                label={kid.name}
                emoji={kid.emoji ?? "👶"}
                color={kid.color || theme}
                selected={assigneeId === kid.id}
                onPress={() => setValue("assigneeId", kid.id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Schedule section ── */}
      <View style={MS.section}>
        <View style={MS.segmented}>
          <SegmentedPills
            value={isRecurring ? "recurring" : "oneTime"}
            onChange={(v) => setValue("isRecurring", v === "recurring")}
            options={[
              { value: "recurring", label: t("eventModal.recurring") },
              { value: "oneTime", label: t("eventModal.oneTime") },
            ]}
          />
        </View>

        {isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("eventModal.day")}</Text>
              <Text style={MS.sectionIcon}>📆</Text>
            </View>
            <View style={[MS.chipRow, { gap: S.xs, flexWrap: "nowrap" }]}>
              {Array.from({ length: 7 }, (_, idx) => {
                const sel = selectedDays.includes(idx);
                return (
                  <Button
                    key={idx}
                    mode={sel ? "contained" : "outlined"}
                    compact
                    onPress={() => {
                      // Allow deselecting freely — including the last day.
                      // The Zod `daysOfWeek.min(1)` rule catches "no days at
                      // all" on save, with the message rendered below. The
                      // previous `cur.length > 1` guard made the button look
                      // broken when it was the only selected day (QA Pass 2
                      // BUG-N14 — silently unresponsive).
                      const cur = selectedDays;
                      if (cur.includes(idx)) {
                        setValue("daysOfWeek", cur.filter((d) => d !== idx), { shouldValidate: true });
                      } else {
                        setValue("daysOfWeek", [...cur, idx], { shouldValidate: true });
                      }
                    }}
                    style={[MS.chip, { flex: 1, minWidth: 0 }]}
                    labelStyle={MS.chipLabel}
                    buttonColor={sel ? theme + "20" : undefined}
                    textColor={sel ? theme : C.textSecondary}
                  >
                    {dayNameShort(idx)}
                  </Button>
                );
              })}
            </View>
            {errors.daysOfWeek && (
              <Text style={[MS.error, { marginTop: 4 }]}>
                {t("eventModal.daysOfWeekRequired")}
              </Text>
            )}
          </>
        )}

        {!isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("eventModal.date")}</Text>
              <Text style={MS.sectionIcon}>📆</Text>
            </View>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DateTimeField
                  mode="date"
                  value={value ?? toYMD(new Date())}
                  onChange={onChange}
                  title={t("eventModal.date")}
                  error={!!errors.date}
                />
              )}
            />
            {errors.date && <Text style={MS.error}>{errors.date.message}</Text>}

            {/* Optional multi-day end date — leave equal to the start for a
                single-day event; pick a later date to span a range. */}
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("eventModal.endDate")}</Text>
              <Text style={MS.sectionIcon}>📆</Text>
            </View>
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange, value } }) => (
                <DateTimeField
                  mode="date"
                  value={value || startDate || toYMD(new Date())}
                  onChange={onChange}
                  title={t("eventModal.endDate")}
                />
              )}
            />
            {errors.endDate && <Text style={MS.error}>{errors.endDate.message}</Text>}
          </>
        )}
      </View>

      {/* ── Time section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionLabel}>{t("eventModal.time")}</Text>
          <Text style={MS.sectionIcon}>⏰</Text>
        </View>
        <View style={MS.segmented}>
          <SegmentedPills
            value={allDay ? "allDay" : "timed"}
            onChange={(v) => setValue("allDay", v === "allDay")}
            options={[
              { value: "timed", label: t("eventModal.timed") },
              { value: "allDay", label: t("eventModal.allDay") },
            ]}
          />
        </View>
        {!allDay && (
          <>
            <View style={MS.timeRow}>
              <View style={MS.timeCol}>
                <Text style={MS.timeLabel}>{t("eventModal.startTime")}</Text>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field: { onChange, value } }) => (
                    <DateTimeField mode="time" value={value} onChange={onChange} title={t("eventModal.startTime")} />
                  )}
                />
              </View>
              <View style={MS.timeCol}>
                <Text style={MS.timeLabel}>{t("eventModal.endTime")}</Text>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field: { onChange, value } }) => (
                    <DateTimeField mode="time" value={value} onChange={onChange} title={t("eventModal.endTime")} error={!!errors.endTime} />
                  )}
                />
              </View>
            </View>
            {errors.endTime && <Text style={MS.error}>{errors.endTime.message}</Text>}
          </>
        )}
      </View>

      {/* ── Location section ── */}
      <View style={MS.section}>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <ModalTextInput
              placeholder={t("eventModal.location")}
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
          <Text style={MS.sectionLabel}>{t("eventModal.reminders")}</Text>
          <Text style={MS.sectionIcon}>🔔</Text>
        </View>
        <View style={MS.chipRow}>
          {REMINDER_PRESETS.map(({ minutes, label }) => {
            const selected = selectedReminders.includes(minutes);
            // Disable unselected presets once cap is hit, so the user gets
            // visual feedback that the click would be a no-op (BUG-N13 —
            // previously the 4th click was silently swallowed).
            const capReached = !selected && selectedReminders.length >= 3;
            return (
              <Button
                key={minutes}
                mode={selected ? "contained" : "outlined"}
                compact
                disabled={capReached}
                onPress={() => {
                  if (selected) {
                    setSelectedReminders((prev) => prev.filter((m) => m !== minutes));
                  } else if (selectedReminders.length < 3) {
                    setSelectedReminders((prev) => [...prev, minutes]);
                  }
                }}
                style={MS.chip}
                labelStyle={MS.chipLabel}
                buttonColor={selected ? theme + "20" : undefined}
                textColor={selected ? theme : C.textSecondary}
              >
                {label}
              </Button>
            );
          })}
        </View>
        {selectedReminders.length >= 3 && (
          <Text
            style={{
              color: C.textMuted,
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {t("eventModal.reminderMax3")}
          </Text>
        )}
      </View>

      {/* ── Delete ── */}
      {editEvent && onDelete && (
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
    </ModalWrapper>
  );
}
