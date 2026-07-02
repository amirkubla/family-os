/**
 * FamilyEventModal — Add / edit a family event (recurring or one-time).
 * Premium styled modal with sectioned layout.
 */

import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet } from "react-native";
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
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import ModalWrapper from "./ModalWrapper";
import SelectChip from "./SelectChip";
import DateTimeField from "./DateTimeField";
import NumberField from "./NumberField";
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
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    date: z.string(),
    endDate: z.string().optional(),
    repeatUnit: z.enum(["week", "month"]),
    repeatInterval: z.number().int().min(1).max(52),
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
    // The date anchor is always present (one-time day OR recurring anchor).
    (d) => {
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
    (d) => !d.endDate || !d.date || d.endDate >= d.date,
    { message: t("eventModal.endDateBeforeStart"), path: ["endDate"] },
  )
  .refine(
    // Weekly repeats need at least one weekday selected.
    (d) => !(d.isRecurring && d.repeatUnit === "week") || d.daysOfWeek.length > 0,
    { message: t("eventModal.daysOfWeekRequired"), path: ["daysOfWeek"] },
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
    repeatUnit?: "week" | "month";
    repeatInterval?: number;
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
      isRecurring: false,
      allDay: false,
      daysOfWeek: defaultDaysOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      endDate: undefined,
      repeatUnit: "week",
      repeatInterval: 1,
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
        repeatUnit: editEvent.repeatUnit ?? "week",
        repeatInterval: editEvent.repeatInterval ?? 1,
        startTime: minutesToHHMM(editEvent.startMinutes),
        endTime: minutesToHHMM(editEvent.endMinutes),
        location: editEvent.location ?? "",
      });
      setSelectedReminders(editEvent.reminders ?? []);
    } else if (visible) {
      reset({
        title: "",
        assigneeType: "family",
        assigneeId: undefined,
        isRecurring: false, // new events default to one-time (repeat off)
        allDay: false,
        daysOfWeek: defaultDaysOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        endDate: undefined,
        repeatUnit: "week",
        repeatInterval: 1,
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
  const repeatUnit = watch("repeatUnit");
  const repeatInterval = watch("repeatInterval");

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
    // Weekly repeats carry the selected weekdays; monthly + one-time derive a
    // single weekday from the anchor date (harmless, keeps the field populated).
    const weekly = data.isRecurring && data.repeatUnit === "week";
    const daysOfWeek = weekly ? data.daysOfWeek : [dayOfWeekFromYMD(data.date)];

    // Multi-day end date only when it's a one-time event and is after the start.
    const endDate =
      !data.isRecurring && data.endDate && data.endDate > data.date
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
      // The date is now always the anchor (one-time day OR recurrence anchor).
      date: data.date,
      endDate,
      repeatUnit: data.isRecurring ? data.repeatUnit : undefined,
      repeatInterval: data.isRecurring ? data.repeatInterval : undefined,
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

      {/* ── Schedule section ── date + time first, then an optional "repeat" ── */}
      <View style={MS.section}>
        {/* Start date — always shown (the calendar pill is self-evident). */}
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

        {/* Repeat on/off. */}
        <View style={[MS.segmented, { marginTop: S.sm }]}>
          <SegmentedPills
            value={isRecurring ? "recurring" : "oneTime"}
            onChange={(v) => {
              const on = v === "recurring";
              setValue("isRecurring", on);
              // Start each repeat fresh — don't carry a stale "every N".
              if (on) setValue("repeatInterval", 1);
            }}
            options={[
              { value: "oneTime", label: t("eventModal.oneTime") },
              { value: "recurring", label: t("eventModal.recurring") },
            ]}
          />
        </View>

        {isRecurring && (
          <>
            {/* Cadence unit + interval: "כל N שבועות/חודשים". */}
            <View style={[MS.segmented, { marginTop: S.sm }]}>
              <SegmentedPills
                value={repeatUnit}
                onChange={(v) => {
                  setValue("repeatUnit", v as "week" | "month");
                  // Reset the counter — "every 3 weeks" shouldn't become
                  // "every 3 months" just by switching the unit.
                  setValue("repeatInterval", 1);
                }}
                options={[
                  { value: "week", label: t("eventModal.unitWeeks") },
                  { value: "month", label: t("eventModal.unitMonths") },
                ]}
              />
            </View>
            <View style={styles.stepperRow}>
              <Text style={styles.stepperEvery}>{t("eventModal.repeatEvery")}</Text>
              <NumberField
                value={repeatInterval}
                onChange={(v) => setValue("repeatInterval", v)}
                min={1}
                max={repeatUnit === "week" ? 52 : 12}
                title={t("eventModal.repeatEvery")}
                testID="event-repeat-interval"
              />
              <Text style={styles.stepperUnit}>
                {repeatUnit === "week"
                  ? repeatInterval === 1 ? t("eventModal.unitWeek") : t("eventModal.unitWeeks")
                  : repeatInterval === 1 ? t("eventModal.unitMonth") : t("eventModal.unitMonths")}
              </Text>
            </View>

            {/* Weekly → which weekday(s) within each active cycle. */}
            {repeatUnit === "week" && (
              <>
                <View style={[MS.chipRow, { gap: S.xs, flexWrap: "nowrap", marginTop: S.sm }]}>
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

            {/* Monthly → keys off the anchor's day-of-month. */}
            {repeatUnit === "month" && startDate && (
              <Text style={styles.monthlyHint}>
                {t("eventModal.monthlyOnDay", { day: Number(startDate.split("-")[2]) })}
              </Text>
            )}
          </>
        )}

        {!isRecurring && (
          <>
            {/* Optional multi-day span for a one-time event. */}
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("eventModal.endDate")}</Text>
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

      {/* ── Time section (label omitted) ── */}
      <View style={MS.section}>
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
                style={[MS.chip, styles.reminderChip]}
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

const styles = StyleSheet.create({
  // "כל [−] N [+] שבועות/חודשים" interval stepper.
  stepperRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.xs,
    marginTop: S.sm,
  },
  stepperEvery: {
    fontSize: 14,
    color: C.textSecondary,
    writingDirection: "rtl",
  },
  stepperUnit: {
    fontSize: 14,
    color: C.textSecondary,
    writingDirection: "rtl",
  },
  // Uniform reminder chips — all as wide as the widest label ("12 שעות").
  reminderChip: {
    minWidth: 76,
  },
  monthlyHint: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
    textAlign: TEXT_RIGHT,
    marginTop: S.sm,
  },
});
