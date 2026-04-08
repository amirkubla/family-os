/**
 * FamilyEventModal — Add / edit a family event (recurring or one-time).
 * Premium styled modal with sectioned layout.
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, assigneeTypeLabel } from "@src/i18n";
import { MS, SEGMENT_THEME, SEGMENT_COLORS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import ModalWrapper from "./ModalWrapper";
import WheelTimePicker from "./WheelTimePicker";
import DatePicker, { formatDateHe } from "./DatePicker";

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
    title: z.string().min(1, t("eventModal.titleRequired")),
    assigneeType: z.enum(["family", "member", "kid"]),
    assigneeId: z.string().optional(),
    isRecurring: z.boolean(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
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
      daysOfWeek: defaultDaysOfWeek,
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
        daysOfWeek: editEvent.daysOfWeek,
        date: editEvent.date ?? toYMD(new Date()),
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
        daysOfWeek: defaultDaysOfWeek,
        date: defaultDate ?? toYMD(new Date()),
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
  const assigneeId = watch("assigneeId");

  const doSubmit = (data: FormData) => {
    const daysOfWeek = data.isRecurring
      ? data.daysOfWeek
      : [dayOfWeekFromYMD(data.date!)];

    onSubmit({
      title: data.title.trim(),
      assigneeType: data.assigneeType as AssigneeType,
      assigneeId: data.assigneeType === "family" ? undefined : data.assigneeId,
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
          <Text style={MS.headerIcon}>🎉</Text>
        </View>
        <Text style={MS.heading}>
          {editEvent ? t("eventModal.editTitle") : t("eventModal.addTitle")}
        </Text>
      </View>

      {!editEvent && defaultDate && (
        <Text style={MS.subtitle}>{formatDateHe(defaultDate)}</Text>
      )}

      {/* ── Title & Assignee section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>✏️</Text>
          <Text style={MS.sectionLabel}>{t("eventModal.titleLabel")}</Text>
        </View>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
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
          <Text style={MS.sectionIcon}>👥</Text>
          <Text style={MS.sectionLabel}>{t("eventModal.assignee")}</Text>
        </View>
        <SegmentedButtons
          value={assigneeType}
          onValueChange={(v) => {
            setValue("assigneeType", v as "family" | "member" | "kid");
            setValue("assigneeId", undefined);
          }}
          buttons={[
            { value: "family", label: assigneeTypeLabel("family"), ...SEGMENT_COLORS },
            { value: "member", label: assigneeTypeLabel("member"), ...SEGMENT_COLORS },
            { value: "kid", label: assigneeTypeLabel("kid"), ...SEGMENT_COLORS },
          ]}
          style={MS.segmented}
          theme={SEGMENT_THEME}
        />

        {assigneeType === "member" && activeMembers.length > 0 && (
          <View style={MS.chipRow}>
            {activeMembers.map((member) => {
              const sel = assigneeId === member.id;
              const mc = member.color || C.selectText;
              return (
                <Button
                  key={member.id}
                  mode={sel ? "contained" : "outlined"}
                  compact
                  onPress={() => setValue("assigneeId", member.id)}
                  style={[MS.chip, sel && { borderColor: mc }]}
                  labelStyle={MS.chipLabel}
                  buttonColor={sel ? mc + "20" : undefined}
                  textColor={sel ? mc : C.textSecondary}
                >
                  {member.avatarEmoji ?? ""} {member.name}
                </Button>
              );
            })}
          </View>
        )}

        {assigneeType === "kid" && activeKids.length > 0 && (
          <View style={MS.chipRow}>
            {activeKids.map((kid) => {
              const sel = assigneeId === kid.id;
              return (
                <Button
                  key={kid.id}
                  mode={sel ? "contained" : "outlined"}
                  compact
                  onPress={() => setValue("assigneeId", kid.id)}
                  style={[MS.chip, sel && { borderColor: kid.color }]}
                  labelStyle={MS.chipLabel}
                  buttonColor={sel ? kid.color + "20" : undefined}
                  textColor={sel ? kid.color : C.textSecondary}
                >
                  {kid.emoji}{"  "}{kid.name}
                </Button>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Schedule section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>{isRecurring ? "🔄" : "1️⃣"}</Text>
          <Text style={MS.sectionLabel}>{t("eventModal.schedule")}</Text>
        </View>
        <SegmentedButtons
          value={isRecurring ? "recurring" : "oneTime"}
          onValueChange={(v) => setValue("isRecurring", v === "recurring")}
          buttons={[
            { value: "recurring", label: t("eventModal.recurring"), ...SEGMENT_COLORS },
            { value: "oneTime", label: t("eventModal.oneTime"), ...SEGMENT_COLORS },
          ]}
          style={MS.segmented}
          theme={SEGMENT_THEME}
        />

        {isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionIcon}>📆</Text>
              <Text style={MS.sectionLabel}>{t("eventModal.day")}</Text>
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
              <Text style={MS.sectionLabel}>{t("eventModal.date")}</Text>
            </View>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DatePicker value={value ?? toYMD(new Date())} onChange={onChange} />
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
          <Text style={MS.sectionLabel}>{t("eventModal.startTime")}</Text>
        </View>
        <View style={MS.timeRow}>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("eventModal.startTime")}</Text>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <WheelTimePicker value={value} onChange={onChange} />
              )}
            />
          </View>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("eventModal.endTime")}</Text>
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
          <Text style={MS.sectionLabel}>{t("eventModal.location")}</Text>
        </View>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <TextInput
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
                    setSelectedReminders((prev) => prev.filter((m) => m !== minutes));
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
          {editEvent ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
