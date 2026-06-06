"use server";

import { recordAuditLog } from "@/services/audit/auditLog.service";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/utils/supabase/queries";

export async function repairEventsMissingPersonLinks() {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc(
    "repair_events_missing_person_links",
  );

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await recordAuditLog({
    action: "data_maintenance.repair_events_missing_links",
    entityType: "data_maintenance",
    entityId: "events_missing_links",
    severity: "warning",
    metadata: { result: data },
  });

  revalidatePath("/dashboard/data-maintenance/events-missing-links");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/data-quality");

  return {
    ok: true as const,
    result: data,
  };
}
export async function softDeleteEmptyFamilies() {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc("soft_delete_empty_families");

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await recordAuditLog({
    action: "data_maintenance.soft_delete_empty_families",
    entityType: "data_maintenance",
    entityId: "empty_families",
    severity: "warning",
    metadata: { result: data },
  });

  revalidatePath("/dashboard/data-maintenance");
  revalidatePath("/dashboard/data-maintenance/empty-families");
  revalidatePath("/dashboard/data-quality");
  revalidatePath("/dashboard/stats");

  return {
    ok: true as const,
    result: data,
  };
}
export async function softDeleteDuplicateBirthDeathEvents() {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc(
    "soft_delete_duplicate_birth_death_events",
  );

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  await recordAuditLog({
    action: "data_maintenance.soft_delete_duplicate_events",
    entityType: "data_maintenance",
    entityId: "duplicate_birth_death_events",
    severity: "warning",
    metadata: { result: data },
  });

  revalidatePath("/dashboard/data-maintenance");
  revalidatePath("/dashboard/data-maintenance/duplicate-events");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/data-quality");
  revalidatePath("/dashboard/stats");

  return {
    ok: true as const,
    result: data,
  };
}
