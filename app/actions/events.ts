"use server";

import { recordAuditLog } from "@/services/audit/auditLog.service";
import { assertCanEditPerson } from "@/utils/permissions/assertPersonAccess";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

const ALLOWED_EVENT_TYPES = new Set([
  "birth",
  "death",
  "marriage",
  "divorce",
  "burial",
  "baptism",
  "confirmation",
  "ordination",
  "graduation",
  "occupation",
  "residence",
  "migration",
  "military",
  "award",
  "retirement",
  "custom",
]);

const ALLOWED_DATE_PRECISIONS = new Set([
  "day",
  "month",
  "year",
  "decade",
  "range",
  "text",
  "unknown",
]);

type EventDatePayload = {
  start_date: string | null;
  end_date: string | null;
  sort_date: string | null;
  date_precision: string;
  date_original_text: string | null;
};

function cleanText(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function normalizeEventType(value: FormDataEntryValue | null) {
  const type = value?.toString() || "custom";
  return ALLOWED_EVENT_TYPES.has(type) ? type : "custom";
}

function normalizeDatePrecision(value: FormDataEntryValue | null) {
  const precision = value?.toString() || "unknown";
  return ALLOWED_DATE_PRECISIONS.has(precision) ? precision : "unknown";
}

function isValidDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
  );
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIsoDay(raw: string) {
  const value = raw.trim();

  const ddmmyyyy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidDate(iso) ? iso : null;
  }

  const yyyymmdd = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const year = Number(yyyymmdd[1]);
    const month = Number(yyyymmdd[2]);
    const day = Number(yyyymmdd[3]);
    const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidDate(iso) ? iso : null;
  }

  return null;
}

function toIsoMonth(raw: string) {
  const value = raw.trim();

  const mmyyyy = value.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmyyyy) {
    const month = Number(mmyyyy[1]);
    const year = Number(mmyyyy[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  }

  const yyyymm = value.match(/^(\d{4})-(\d{1,2})$/);
  if (yyyymm) {
    const year = Number(yyyymm[1]);
    const month = Number(yyyymm[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  }

  return null;
}

function normalizePersonEventDate(input: {
  dateText: string | null;
  precision: string;
}): EventDatePayload {
  const raw = input.dateText?.trim() ?? "";
  const precision = ALLOWED_DATE_PRECISIONS.has(input.precision)
    ? input.precision
    : "unknown";

  if (!raw || precision === "unknown") {
    return {
      start_date: null,
      end_date: null,
      sort_date: null,
      date_precision: "unknown",
      date_original_text: raw || null,
    };
  }

  if (precision === "day") {
    const iso = toIsoDay(raw);
    if (!iso) {
      throw new Error("Ngày chính xác phải có dạng dd-mm-yyyy, ví dụ 21-07-2015.");
    }

    return {
      start_date: iso,
      end_date: iso,
      sort_date: iso,
      date_precision: "day",
      date_original_text: raw,
    };
  }

  if (precision === "month") {
    const parsed = toIsoMonth(raw);
    if (!parsed) {
      throw new Error("Ngày tháng/năm phải có dạng mm-yyyy, ví dụ 07-2015.");
    }

    const year = parsed.year;
    const month = parsed.month;
    const start = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
    const end = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
      lastDayOfMonth(year, month),
    ).padStart(2, "0")}`;

    return {
      start_date: start,
      end_date: end,
      sort_date: start,
      date_precision: "month",
      date_original_text: raw,
    };
  }

  if (precision === "year") {
    const match = raw.match(/^(\d{1,4})$/);
    if (!match) {
      throw new Error("Năm phải có dạng yyyy, ví dụ 2015.");
    }

    const year = String(Number(match[1])).padStart(4, "0");

    return {
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      sort_date: `${year}-01-01`,
      date_precision: "year",
      date_original_text: raw,
    };
  }

  return {
    start_date: null,
    end_date: null,
    sort_date: null,
    date_precision: precision,
    date_original_text: raw,
  };
}

async function assertCanManagePersonEvent(
  personId: string,
  action: string,
  eventId?: string | null,
) {
  const profile = await getProfile();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    await recordAuditLog({
      action: "permission.denied",
      entityType: "event",
      entityId: eventId ?? personId,
      severity: "warning",
      metadata: {
        requestedAction: action,
        personId,
        reason: "editor_or_admin_required",
      },
    });

    return {
      ok: false as const,
      error: "Chỉ Admin hoặc Editor mới có quyền thêm/sửa/xóa sự kiện.",
    };
  }

  const permission = await assertCanEditPerson(personId, {
    action,
    entityType: "event",
    entityId: eventId ?? null,
    metadata: { personId },
  });

  if (!permission.ok) {
    return {
      ok: false as const,
      error: permission.error ?? "Bạn không có quyền sửa sự kiện của người này.",
    };
  }

  return { ok: true as const, profile };
}

function normalizeNullableNumber(value: string | null, label: string) {
  if (!value) return null;

  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new Error(`${label} phải là số nguyên.`);
  }

  return number;
}

function buildEventPayload(formData: FormData) {
  const type = normalizeEventType(formData.get("type"));
  const title = cleanText(formData.get("title"));
  const description = cleanText(formData.get("description"));
  const placeText = cleanText(formData.get("place_text"));
  const precision = normalizeDatePrecision(formData.get("date_precision"));
  const dateText = cleanText(formData.get("date_text"));

  const lunarYearRaw = cleanText(formData.get("lunar_year"));
  const lunarMonthRaw = cleanText(formData.get("lunar_month"));
  const lunarDayRaw = cleanText(formData.get("lunar_day"));

  const datePayload = normalizePersonEventDate({ dateText, precision });

  const lunarYear = normalizeNullableNumber(lunarYearRaw, "Năm âm lịch");
  const lunarMonth = normalizeNullableNumber(lunarMonthRaw, "Tháng âm lịch");
  const lunarDay = normalizeNullableNumber(lunarDayRaw, "Ngày âm lịch");

  if (lunarMonth != null && (lunarMonth < 1 || lunarMonth > 12)) {
    throw new Error("Tháng âm lịch phải nằm trong khoảng 1-12.");
  }

  if (lunarDay != null && (lunarDay < 1 || lunarDay > 30)) {
    throw new Error("Ngày âm lịch phải nằm trong khoảng 1-30.");
  }

  return {
    type,
    title,
    description,
    place_text: placeText,
    start_date: datePayload.start_date,
    end_date: datePayload.end_date,
    sort_date: datePayload.sort_date,
    date_precision: datePayload.date_precision,
    date_modifier: datePayload.start_date ? "exact" : "unknown",
    canonical_calendar:
      lunarYearRaw || lunarMonthRaw || lunarDayRaw ? "lunar" : "gregorian",
    date_original_text: datePayload.date_original_text,
    lunar_year: lunarYear,
    lunar_month: lunarMonth,
    lunar_day: lunarDay,
    lunar_is_leap_month: formData.get("lunar_is_leap_month") === "true",
    legacy_source: "manual.person_event",
    migration_confidence: "manual",
  };
}

async function assertCanManageFamilyEvent(
  personAId: string,
  personBId: string,
  action: string,
  eventId?: string | null,
) {
  const first = await assertCanManagePersonEvent(personAId, action, eventId);
  if (!first.ok) return first;

  const second = await assertCanManagePersonEvent(personBId, action, eventId);
  if (!second.ok) return second;

  return { ok: true as const };
}

export async function createFamilyEvent(formData: FormData) {
  const personAId = cleanText(formData.get("person_a_id"));
  const personBId = cleanText(formData.get("person_b_id"));
  const familyId = cleanText(formData.get("family_id"));
  const eventType = normalizeEventType(formData.get("type"));

  if (!personAId || !personBId) {
    return { error: "Thiếu thông tin hai người liên quan đến sự kiện." };
  }

  if (eventType !== "marriage" && eventType !== "divorce") {
    return { error: "Sự kiện gia đình chỉ hỗ trợ kết hôn hoặc ly hôn." };
  }

  const permission = await assertCanManageFamilyEvent(
    personAId,
    personBId,
    `event.${eventType}.create`,
  );

  if (!permission.ok) return { error: permission.error };

  try {
    const supabase = await getSupabase();
    const eventPayload = {
      ...buildEventPayload(formData),
      type: eventType,
      family_id: familyId,
      legacy_source:
        eventType === "marriage"
          ? "manual.marriage_event"
          : "manual.divorce_event",
    };

    // Tránh tạo nhiều event cùng loại cho cùng family khi người dùng bấm lưu lặp.
    // Nếu có family_id, update event cùng family/type mới nhất thay vì tạo trùng.
    let existingEventId: string | null = null;

    if (familyId) {
      const { data: existing, error: existingError } = await supabase
        .from("events")
        .select("id")
        .eq("family_id", familyId)
        .eq("type", eventType)
        .is("deleted_at", null)
        .order("sort_date", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existingError) return { error: existingError.message };
      existingEventId = existing?.id ?? null;
    }

    let eventId = existingEventId;

    if (eventId) {
      const { error: updateError } = await supabase
        .from("events")
        .update(eventPayload)
        .eq("id", eventId)
        .is("deleted_at", null);

      if (updateError) return { error: updateError.message };
    } else {
      const { data: eventRow, error: eventError } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id")
        .single();

      if (eventError || !eventRow) {
        return { error: eventError?.message ?? "Không tạo được sự kiện gia đình." };
      }

      eventId = eventRow.id;
    }

    for (const personId of [personAId, personBId]) {
      const { data: existingLink, error: linkCheckError } = await supabase
        .from("person_events")
        .select("id")
        .eq("person_id", personId)
        .eq("event_id", eventId)
        .limit(1)
        .maybeSingle();

      if (linkCheckError) return { error: linkCheckError.message };

      if (!existingLink) {
        const { error: linkError } = await supabase.from("person_events").insert({
          person_id: personId,
          event_id: eventId,
          role: "principal",
        });

        if (linkError) return { error: linkError.message };
      }
    }

    await recordAuditLog({
      action: eventType === "marriage" ? "event.marriage_saved" : "event.divorce_saved",
      entityType: "event",
      entityId: eventId,
      entityLabel: eventPayload.title ?? eventPayload.type,
      metadata: {
        familyId,
        personAId,
        personBId,
        type: eventType,
      },
    });

    revalidatePath(`/dashboard/members/${personAId}`);
    revalidatePath(`/dashboard/members/${personBId}`);
    revalidatePath("/dashboard/events");

    return { success: true, eventId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không lưu được sự kiện gia đình.",
    };
  }
}

export async function createPersonEvent(formData: FormData) {
  const personId = cleanText(formData.get("person_id"));
  if (!personId) return { error: "Thiếu person_id." };

  const permission = await assertCanManagePersonEvent(personId, "event.create");
  if (!permission.ok) return { error: permission.error };

  try {
    const supabase = await getSupabase();
    const eventPayload = buildEventPayload(formData);

    const { data: eventRow, error: eventError } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("id")
      .single();

    if (eventError || !eventRow) {
      return { error: eventError?.message ?? "Không tạo được sự kiện." };
    }

    const { error: linkError } = await supabase.from("person_events").insert({
      person_id: personId,
      event_id: eventRow.id,
      role: eventPayload.type === "death" ? "deceased" : "principal",
    });

    if (linkError) {
      await supabase
        .from("events")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", eventRow.id);

      return { error: linkError.message };
    }

    await recordAuditLog({
      action: "event.created",
      entityType: "event",
      entityId: eventRow.id,
      entityLabel: eventPayload.title ?? eventPayload.type,
      metadata: { personId, type: eventPayload.type },
    });

    revalidatePath(`/dashboard/members/${personId}`);
    revalidatePath("/dashboard/events");

    return { success: true, eventId: eventRow.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không tạo được sự kiện.",
    };
  }
}

export async function updatePersonEvent(formData: FormData) {
  const personId = cleanText(formData.get("person_id"));
  const eventId = cleanText(formData.get("event_id"));

  if (!personId || !eventId) {
    return { error: "Thiếu person_id hoặc event_id." };
  }

  const permission = await assertCanManagePersonEvent(
    personId,
    "event.update",
    eventId,
  );

  if (!permission.ok) return { error: permission.error };

  try {
    const supabase = await getSupabase();

    const { data: link, error: linkError } = await supabase
      .from("person_events")
      .select("id")
      .eq("person_id", personId)
      .eq("event_id", eventId)
      .limit(1)
      .maybeSingle();

    if (linkError) return { error: linkError.message };
    if (!link) return { error: "Sự kiện này không thuộc thành viên đang chọn." };

    const eventPayload = buildEventPayload(formData);

    const { error: updateError } = await supabase
      .from("events")
      .update(eventPayload)
      .eq("id", eventId)
      .is("deleted_at", null);

    if (updateError) return { error: updateError.message };

    await recordAuditLog({
      action: "event.updated",
      entityType: "event",
      entityId: eventId,
      entityLabel: eventPayload.title ?? eventPayload.type,
      metadata: { personId, type: eventPayload.type },
    });

    revalidatePath(`/dashboard/members/${personId}`);
    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không cập nhật được sự kiện.",
    };
  }
}

export async function softDeletePersonEvent(input: {
  personId: string;
  eventId: string;
}) {
  const permission = await assertCanManagePersonEvent(
    input.personId,
    "event.delete",
    input.eventId,
  );

  if (!permission.ok) return { error: permission.error };

  try {
    const supabase = await getSupabase();

    const { data: link, error: linkError } = await supabase
      .from("person_events")
      .select("id")
      .eq("person_id", input.personId)
      .eq("event_id", input.eventId)
      .limit(1)
      .maybeSingle();

    if (linkError) return { error: linkError.message };
    if (!link) return { error: "Sự kiện này không thuộc thành viên đang chọn." };

    const { error } = await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", input.eventId)
      .is("deleted_at", null);

    if (error) return { error: error.message };

    await recordAuditLog({
      action: "event.deleted",
      entityType: "event",
      entityId: input.eventId,
      severity: "warning",
      metadata: { personId: input.personId },
    });

    revalidatePath(`/dashboard/members/${input.personId}`);
    revalidatePath("/dashboard/events");

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không xóa được sự kiện.",
    };
  }
}