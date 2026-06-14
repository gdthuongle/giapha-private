"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/utils/supabase/queries";

export type SourceType =
  | "document"
  | "photo"
  | "oral_history"
  | "book"
  | "website"
  | "archive"
  | "other";

export type PersonSourceInput = {
  personId: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  repository?: string;
  url?: string;
  citationText?: string;
  note?: string;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createPersonSource(input: PersonSourceInput) {
  const supabase = await getSupabase();

  const personId = cleanText(input.personId);
  const title = cleanText(input.title);

  if (!personId) {
    return { ok: false as const, error: "Thiếu personId." };
  }

  if (!title) {
    return { ok: false as const, error: "Tên nguồn không được để trống." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false as const, error: userError.message };
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      title,
      source_type: input.sourceType || "other",
      author: cleanText(input.author),
      repository: cleanText(input.repository),
      url: cleanText(input.url),
      note: cleanText(input.note),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    return {
      ok: false as const,
      error: sourceError?.message ?? "Không tạo được source.",
    };
  }

  const { error: linkError } = await supabase.from("person_source_links").insert({
    person_id: personId,
    source_id: source.id,
    citation_text: cleanText(input.citationText),
    note: cleanText(input.note),
    created_by: user?.id ?? null,
  });

  if (linkError) {
    await supabase
      .from("sources")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", source.id);

    return { ok: false as const, error: linkError.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${personId}`);

  return { ok: true as const, sourceId: source.id };
}

export async function softDeletePersonSourceLink(linkId: string, personId: string) {
  const supabase = await getSupabase();

  const cleanLinkId = cleanText(linkId);
  const cleanPersonId = cleanText(personId);

  if (!cleanLinkId) {
    return { ok: false as const, error: "Thiếu linkId." };
  }

  const { error } = await supabase.rpc("soft_delete_source_link", {
    link_table: "person_source_links",
    link_id: cleanLinkId,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");
  if (cleanPersonId) {
    revalidatePath(`/dashboard/members/${cleanPersonId}`);
  }

  return { ok: true as const };
}

export type EventSourceInput = {
  eventId: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  repository?: string;
  url?: string;
  citationText?: string;
  note?: string;
};

export async function createEventSource(input: EventSourceInput) {
  const supabase = await getSupabase();

  const eventId = cleanText(input.eventId);
  const title = cleanText(input.title);

  if (!eventId) {
    return { ok: false as const, error: "Thiếu eventId." };
  }

  if (!title) {
    return { ok: false as const, error: "Tên nguồn không được để trống." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false as const, error: userError.message };
  }

  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      title,
      source_type: input.sourceType || "other",
      author: cleanText(input.author),
      repository: cleanText(input.repository),
      url: cleanText(input.url),
      note: cleanText(input.note),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    return {
      ok: false as const,
      error: sourceError?.message ?? "Không tạo được source.",
    };
  }

  const { error: linkError } = await supabase.from("event_source_links").insert({
    event_id: eventId,
    source_id: source.id,
    citation_text: cleanText(input.citationText),
    note: cleanText(input.note),
    created_by: user?.id ?? null,
  });

  if (linkError) {
    await supabase
      .from("sources")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", source.id);

    return { ok: false as const, error: linkError.message };
  }

  revalidatePath("/dashboard/members");

  return { ok: true as const, sourceId: source.id };
}

export async function softDeleteEventSourceLink(linkId: string) {
  const supabase = await getSupabase();

  const cleanLinkId = cleanText(linkId);

  if (!cleanLinkId) {
    return { ok: false as const, error: "Thiếu linkId." };
  }

  const { error } = await supabase.rpc("soft_delete_source_link", {
    link_table: "event_source_links",
    link_id: cleanLinkId,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");

  return { ok: true as const };
}

export type ExistingPersonSourceLinkInput = {
  personId: string;
  sourceId: string;
  citationText?: string;
  note?: string;
};

export async function linkExistingPersonSource(input: ExistingPersonSourceLinkInput) {
  const supabase = await getSupabase();

  const personId = cleanText(input.personId);
  const sourceId = cleanText(input.sourceId);

  if (!personId) {
    return { ok: false as const, error: "Thiếu personId." };
  }

  if (!sourceId) {
    return { ok: false as const, error: "Chưa chọn nguồn." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false as const, error: userError.message };
  }

  const { error } = await supabase.from("person_source_links").insert({
    person_id: personId,
    source_id: sourceId,
    citation_text: cleanText(input.citationText),
    note: cleanText(input.note),
    created_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Nguồn này đã được gắn cho người này." };
    }

    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${personId}`);

  return { ok: true as const };
}

export type UpdatePersonSourceLinkInput = {
  personId: string;
  linkId: string;
  sourceId: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  repository?: string;
  url?: string;
  sourceNote?: string;
  citationText?: string;
  linkNote?: string;
};

export async function updatePersonSourceLink(input: UpdatePersonSourceLinkInput) {
  const supabase = await getSupabase();

  const personId = cleanText(input.personId);
  const linkId = cleanText(input.linkId);
  const sourceId = cleanText(input.sourceId);
  const title = cleanText(input.title);

  if (!personId) {
    return { ok: false as const, error: "Thiếu personId." };
  }

  if (!linkId) {
    return { ok: false as const, error: "Thiếu linkId." };
  }

  if (!sourceId) {
    return { ok: false as const, error: "Thiếu sourceId." };
  }

  if (!title) {
    return { ok: false as const, error: "Tên nguồn không được để trống." };
  }

  const { error: sourceError } = await supabase
    .from("sources")
    .update({
      title,
      source_type: input.sourceType || "other",
      author: cleanText(input.author),
      repository: cleanText(input.repository),
      url: cleanText(input.url),
      note: cleanText(input.sourceNote),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (sourceError) {
    return { ok: false as const, error: sourceError.message };
  }

  const { error: linkError } = await supabase
    .from("person_source_links")
    .update({
      citation_text: cleanText(input.citationText),
      note: cleanText(input.linkNote),
    })
    .eq("id", linkId)
    .eq("person_id", personId)
    .eq("source_id", sourceId);

  if (linkError) {
    return { ok: false as const, error: linkError.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${personId}`);

  return { ok: true as const };
}

export async function softDeleteSource(sourceId: string) {
  const supabase = await getSupabase();

  const cleanSourceId = cleanText(sourceId);

  if (!cleanSourceId) {
    return { ok: false as const, error: "Thiếu sourceId." };
  }

  const { error } = await supabase.rpc("soft_delete_source_cascade", {
    input_source_id: cleanSourceId,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");

  return { ok: true as const };
}

export type ExistingEventSourceLinkInput = {
  eventId: string;
  sourceId: string;
  citationText?: string;
  note?: string;
};

export async function linkExistingEventSource(input: ExistingEventSourceLinkInput) {
  const supabase = await getSupabase();

  const eventId = cleanText(input.eventId);
  const sourceId = cleanText(input.sourceId);

  if (!eventId) {
    return { ok: false as const, error: "Thiếu eventId." };
  }

  if (!sourceId) {
    return { ok: false as const, error: "Chưa chọn nguồn." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { ok: false as const, error: userError.message };
  }

  const { error } = await supabase.from("event_source_links").insert({
    event_id: eventId,
    source_id: sourceId,
    citation_text: cleanText(input.citationText),
    note: cleanText(input.note),
    created_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Nguồn này đã được gắn cho sự kiện này." };
    }

    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");

  return { ok: true as const };
}

export type UpdateEventSourceLinkInput = {
  eventId: string;
  linkId: string;
  sourceId: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  repository?: string;
  url?: string;
  sourceNote?: string;
  citationText?: string;
  linkNote?: string;
};

export async function updateEventSourceLink(input: UpdateEventSourceLinkInput) {
  const supabase = await getSupabase();

  const eventId = cleanText(input.eventId);
  const linkId = cleanText(input.linkId);
  const sourceId = cleanText(input.sourceId);
  const title = cleanText(input.title);

  if (!eventId) {
    return { ok: false as const, error: "Thiếu eventId." };
  }

  if (!linkId) {
    return { ok: false as const, error: "Thiếu linkId." };
  }

  if (!sourceId) {
    return { ok: false as const, error: "Thiếu sourceId." };
  }

  if (!title) {
    return { ok: false as const, error: "Tên nguồn không được để trống." };
  }

  const { error: sourceError } = await supabase
    .from("sources")
    .update({
      title,
      source_type: input.sourceType || "other",
      author: cleanText(input.author),
      repository: cleanText(input.repository),
      url: cleanText(input.url),
      note: cleanText(input.sourceNote),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (sourceError) {
    return { ok: false as const, error: sourceError.message };
  }

  const { error: linkError } = await supabase
    .from("event_source_links")
    .update({
      citation_text: cleanText(input.citationText),
      note: cleanText(input.linkNote),
    })
    .eq("id", linkId)
    .eq("event_id", eventId)
    .eq("source_id", sourceId);

  if (linkError) {
    return { ok: false as const, error: linkError.message };
  }

  revalidatePath("/dashboard/members");

  return { ok: true as const };
}

export type UpdateSourceInput = {
  sourceId: string;
  title: string;
  sourceType: SourceType;
  author?: string;
  repository?: string;
  url?: string;
  note?: string;
};

export async function updateSource(input: UpdateSourceInput) {
  const supabase = await getSupabase();

  const sourceId = cleanText(input.sourceId);
  const title = cleanText(input.title);

  if (!sourceId) {
    return { ok: false as const, error: "Thiếu sourceId." };
  }

  if (!title) {
    return { ok: false as const, error: "Tên nguồn không được để trống." };
  }

  const { error } = await supabase
    .from("sources")
    .update({
      title,
      source_type: input.sourceType || "other",
      author: cleanText(input.author),
      repository: cleanText(input.repository),
      url: cleanText(input.url),
      note: cleanText(input.note),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/sources");

  return { ok: true as const };
}
