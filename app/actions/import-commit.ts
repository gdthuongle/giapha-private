"use server";

import { recordAuditLog } from "@/services/audit/auditLog.service";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/utils/supabase/queries";
import { assertAdminAction } from "@/utils/permissions/assertPersonAccess";

type GedcomCommitRpcResult = {
  ok: boolean;
  sessionId: string;
  committed: {
    persons: number;
    personNames: number;
    families: number;
    familyParents: number;
    familyChildren: number;
    events: number;
    personEvents: number;
    stagingRecords: number;
  };
  errors: string[];
  warnings: string[];
};

function emptyCommitted(): GedcomCommitRpcResult["committed"] {
  return {
    persons: 0,
    personNames: 0,
    families: 0,
    familyParents: 0,
    familyChildren: 0,
    events: 0,
    personEvents: 0,
    stagingRecords: 0,
  };
}

export async function commitGedcomStagingSession(input: {
  sessionId: string;
}): Promise<GedcomCommitRpcResult> {
  const permission = await assertAdminAction("gedcom.commit_staging_session", "gedcom_session");
  if (!permission.ok) {
    return {
      ok: false,
      sessionId: input.sessionId,
      committed: emptyCommitted(),
      errors: [permission.error ?? "Chỉ quản trị viên mới được commit GEDCOM."],
      warnings: [],
    };
  }

  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc("commit_gedcom_staging_session", {
    p_session_id: input.sessionId,
  });

  revalidatePath(`/dashboard/import/${input.sessionId}`);
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/data-quality");
  revalidatePath("/dashboard/dual-ancestry");

  if (error) {
    return {
      ok: false,
      sessionId: input.sessionId,
      committed: emptyCommitted(),
      errors: [
        error.message,
        error.details,
        error.hint,
        error.code ? `code=${error.code}` : null,
      ].filter(Boolean) as string[],
      warnings: [],
    };
  }

  const result = data as GedcomCommitRpcResult;

  if (result?.ok) {
    await recordAuditLog({
      action: "gedcom.commit_staging_session",
      entityType: "gedcom_session",
      entityId: input.sessionId,
      severity: "warning",
      metadata: {
        committed: result.committed,
        warnings: result.warnings,
      },
    });
  }

  return {
    ok: Boolean(result?.ok),
    sessionId: result?.sessionId ?? input.sessionId,
    committed: result?.committed ?? emptyCommitted(),
    errors: Array.isArray(result?.errors) ? result.errors : [],
    warnings: Array.isArray(result?.warnings) ? result.warnings : [],
  };
}