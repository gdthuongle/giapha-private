"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/utils/supabase/queries";

export type StagingRecordStatus =
  | "pending"
  | "approved"
  | "skipped"
  | "rejected"
  | "committed";

export async function updateStagingRecordStatus(input: {
  sessionId: string;
  recordId: string;
  status: Exclude<StagingRecordStatus, "committed">;
}) {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("import_staging_records")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.recordId)
    .eq("session_id", input.sessionId)
    .neq("status", "committed");

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await updateSessionReviewStatus(input.sessionId);

  revalidatePath(`/dashboard/import/${input.sessionId}`);

  return {
    ok: true as const,
  };
}

export async function bulkApprovePendingRecords(input: {
  sessionId: string;
}) {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("import_staging_records")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", input.sessionId)
    .eq("status", "pending")
    .eq("action", "create");

  if (error) {
    return {
      ok: false as const,
      error: [
        error.message,
        error.details,
        error.hint,
        error.code ? `code=${error.code}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  }

  await updateSessionReviewStatus(input.sessionId);

  revalidatePath(`/dashboard/import/${input.sessionId}`);

  return {
    ok: true as const,
  };
}

export async function bulkSkipWarningAndErrorRecords(input: {
  sessionId: string;
}) {
  const supabase = await getSupabase();

  const { data, error: loadError } = await supabase
    .from("import_staging_records")
    .select("id, warnings, errors, action")
    .eq("session_id", input.sessionId)
    .neq("status", "committed");

  if (loadError) {
    return {
      ok: false as const,
      error: loadError.message,
    };
  }

  const idsToSkip = (data ?? [])
    .filter((record: any) => {
      const warnings = Array.isArray(record.warnings) ? record.warnings : [];
      const errors = Array.isArray(record.errors) ? record.errors : [];
      return (
        warnings.length > 0 ||
        errors.length > 0 ||
        record.action === "warning" ||
        record.action === "error" ||
        record.action === "skip"
      );
    })
    .map((record: any) => record.id);

  if (idsToSkip.length === 0) {
    return {
      ok: true as const,
    };
  }

  const { error } = await supabase
    .from("import_staging_records")
    .update({
      status: "skipped",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", input.sessionId)
    .in("id", idsToSkip)
    .neq("status", "committed");

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await updateSessionReviewStatus(input.sessionId);

  revalidatePath(`/dashboard/import/${input.sessionId}`);

  return {
    ok: true as const,
  };
}

export async function resetStagingSessionReview(input: {
  sessionId: string;
}) {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("import_staging_records")
    .update({
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", input.sessionId)
    .neq("status", "committed");

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await supabase
    .from("import_sessions")
    .update({
      status: "reviewing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId);

  revalidatePath(`/dashboard/import/${input.sessionId}`);

  return {
    ok: true as const,
  };
}

async function updateSessionReviewStatus(sessionId: string) {
  const supabase = await getSupabase();

  const { data: records } = await supabase
    .from("import_staging_records")
    .select("status")
    .eq("session_id", sessionId);

  const rows = records ?? [];
  const hasPending = rows.some((row: any) => row.status === "pending");
  const hasApproved = rows.some((row: any) => row.status === "approved");

  const nextStatus =
    rows.length === 0
      ? "parsed"
      : hasPending
        ? "reviewing"
        : hasApproved
          ? "ready_to_commit"
          : "reviewing";

  await supabase
    .from("import_sessions")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}
