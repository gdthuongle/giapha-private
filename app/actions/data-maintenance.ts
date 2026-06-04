"use server";

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

  revalidatePath("/dashboard/data-maintenance/events-missing-links");
  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard/data-quality");

  return {
    ok: true as const,
    result: data,
  };
}
