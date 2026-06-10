import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.role_changed"
  | "user.status_changed"
  | "user.password_reset"
  | "member.deleted"
  | "relationship.created"
  | "relationship.deleted"
  | "relationship.divorced"
  | "relationship.restored"
  | "data_maintenance.repair_events_missing_links"
  | "data_maintenance.soft_delete_empty_families"
  | "data_maintenance.soft_delete_duplicate_events"
  | "data_maintenance.repair_broken_person_events"
  | "gedcom.parse_staging"
  | "gedcom.commit_staging_session"
  | "family_model.repair"
  | "account.preferences_updated"
  | "event.created"
  | "event.updated"
  | "event.deleted"
  | "event.marriage_saved"
  | "event.divorce_saved"
  | "permission.denied";

export type AuditEntityType =
  | "user"
  | "person"
  | "relationship"
  | "family"
  | "event"
  | "gedcom_session"
  | "data_maintenance"
  | "account"
  | "system";

export type AuditSeverity = "info" | "warning" | "danger";

export type AuditLogInput = {
  action?: AuditAction | string | null;

  // camelCase: dùng trong code mới
  entityType?: AuditEntityType | string | null;
  entityId?: string | null;
  entityLabel?: string | null;

  // snake_case: chấp nhận để tương thích nếu caller truyền trực tiếp theo DB field
  entity_type?: AuditEntityType | string | null;
  entity_id?: string | null;
  entity_label?: string | null;

  severity?: AuditSeverity | null;
  metadata?: Record<string, unknown> | null;

  // Cho các trường hợp chạy bằng service role/RPC mà không có cookie user
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
};

export type AuditLogRecord = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  severity: AuditSeverity;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function normalizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return {};

  return JSON.parse(
    JSON.stringify(metadata, (_key, value) => {
      if (typeof value === "bigint") return value.toString();

      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }

      return value;
    }),
  ) as Record<string, unknown>;
}

function normalizeSeverity(severity: AuditSeverity | null | undefined): AuditSeverity {
  if (severity === "warning" || severity === "danger" || severity === "info") {
    return severity;
  }

  return "info";
}


function isUuid(value: string | null | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Ghi audit log.
 *
 * Nguyên tắc quan trọng:
 * - Audit log là phụ trợ, không được làm hỏng nghiệp vụ chính.
 * - Nếu caller truyền thiếu action/entityType thì tự fallback.
 * - Nếu insert audit thất bại thì chỉ console.error và return { ok: false }, không throw.
 */
export async function recordAuditLog(input: AuditLogInput) {
  try {
    const supabase = await getSupabase();
    const [user, profile] = await Promise.all([getUser(), getProfile()]);

    const actorUserId = input.actorUserId ?? input.actor_user_id ?? user?.id ?? null;
    const action = input.action || "unknown";
    const entityType = input.entityType || input.entity_type || "system";
    const entityId = input.entityId ?? input.entity_id ?? null;
    const metadata = normalizeMetadata(input.metadata);

    const payload = {
      // Các cột legacy còn tồn tại trong một số DB cũ.
      // Vẫn truyền đủ để tránh lỗi NOT NULL khi audit_logs từng được tạo bởi trigger generic.
      table_name: String(entityType),
      record_id: isUuid(entityId) ? entityId : crypto.randomUUID(),
      changed_by: actorUserId,
      old_data: null,
      new_data: metadata,
      source: "app",
      changed_at: new Date().toISOString(),

      actor_user_id: actorUserId,
      actor_email: input.actorEmail ?? input.actor_email ?? user?.email ?? null,
      actor_role: input.actorRole ?? input.actor_role ?? profile?.role ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: input.entityLabel ?? input.entity_label ?? null,
      severity: normalizeSeverity(input.severity),
      metadata,
    };

    const { error } = await supabase.from("audit_logs").insert(payload);

    if (error) {
      console.error("Failed to record audit log:", {
        error,
        payload,
      });

      return { ok: false as const, error: error.message };
    }

    return { ok: true as const };
  } catch (error) {
    console.error("Failed to record audit log:", error);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown audit log error",
    };
  }
}

export async function getAuditLogs(input?: {
  action?: string | null;
  entityType?: string | null;
  actorUserId?: string | null;
  severity?: AuditSeverity | null;
  limit?: number;
}) {
  const profile = await getProfile();

  if (profile?.role !== "admin") {
    return {
      error: "Bạn không có quyền xem nhật ký hệ thống.",
      logs: [] as AuditLogRecord[],
    };
  }

  const supabase = await getSupabase();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 200);

  if (input?.action) query = query.eq("action", input.action);
  if (input?.entityType) query = query.eq("entity_type", input.entityType);
  if (input?.actorUserId) query = query.eq("actor_user_id", input.actorUserId);
  if (input?.severity) query = query.eq("severity", input.severity);

  const { data, error } = await query;

  if (error) {
    return { error: error.message, logs: [] as AuditLogRecord[] };
  }

  return { logs: (data ?? []) as AuditLogRecord[], error: null };
}