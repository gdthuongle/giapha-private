import EventsList from "@/components/EventsList";
import AdminEventForm from "@/components/events/AdminEventForm";
import { CalendarDays, MapPin, Users2 } from "lucide-react";
import type { Person } from "@/types";
import MemberDetailModal from "@/components/modal/MemberDetailModal";
import { MemberListProvider } from "@/context/MemberListContext";
import {
  buildVisiblePersonSetForProfile,
  filterPersonEventsForVisiblePersons,
} from "@/utils/permissions/applyPersonVisibility";
import { getProfile, getSupabase } from "@/utils/supabase/queries";

export const metadata = {
  title: "Sự kiện gia phả",
};

type EventPerson = {
  id: string;
  full_name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  is_deceased: boolean;
  avatar_url?: string | null;
  gender?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_in_law?: boolean | null;
  birth_order?: number | null;
  generation?: number | null;
  other_names?: string | null;
};

type CustomEvent = {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
};

type PermissionRelationship = {
  id?: string;
  type?: string | null;
  person_a?: string | null;
  person_b?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
};

type PermissionFamily = {
  id: string;
  [key: string]: unknown;
};

type PermissionFamilyParent = {
  family_id: string;
  person_id: string;
  [key: string]: unknown;
};

type PermissionFamilyChild = {
  family_id: string;
  person_id: string;
  [key: string]: unknown;
};

type PermissionEvent = {
  id: string;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  place_text?: string | null;
  legacy_source?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort_date?: string | null;
  date_precision?: string | null;
  legacy_person_id?: string | null;
  family_id?: string | null;
  deleted_at?: string | null;
  lunar_year?: number | null;
  lunar_month?: number | null;
  lunar_day?: number | null;
  [key: string]: unknown;
};

type PermissionPersonEvent = {
  person_id: string;
  event_id: string;
  role?: string | null;
  [key: string]: unknown;
};

function PermissionEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-xl rounded-2xl border border-amber-200/70 bg-amber-50/80 p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-stone-800">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
      </div>
    </div>
  );
}

function isAdminManagedEvent(event: PermissionEvent) {
  const legacySource = String(event.legacy_source ?? "");
  return event.type === "wedding" || legacySource.startsWith("manual.admin_");
}

function formatEventDate(event: PermissionEvent) {
  const value = event.start_date || event.sort_date;
  if (!value) return "Chưa rõ ngày";

  if (event.date_precision === "year") return value.slice(0, 4);

  if (event.date_precision === "month") {
    const match = value.match(/^(\d{4})-(\d{2})/);
    return match ? `${match[2]}-${match[1]}` : value;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function getEventTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    wedding: "Đám cưới",
    custom: "Sự kiện chung",
    birth: "Sinh",
    death: "Mất",
    marriage: "Kết hôn",
    divorce: "Ly hôn",
  };

  return labels[type ?? ""] ?? type ?? "Sự kiện";
}

function buildPersonLookup(persons: EventPerson[]) {
  return new Map(persons.map((person) => [person.id, person.full_name]));
}

function getEventPersonNames(input: {
  eventId: string;
  personEvents: PermissionPersonEvent[];
  personById: Map<string, string>;
}) {
  return input.personEvents
    .filter((row) => row.event_id === input.eventId)
    .filter((row) => row.role !== "visibility_root")
    .map((row) => input.personById.get(row.person_id))
    .filter(Boolean) as string[];
}

function toPersonSelectorRows(persons: EventPerson[]) {
  return persons.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    gender: person.gender === "female" || person.gender === "male" ? person.gender : "other",
    birth_year: person.birth_year ?? null,
    birth_month: person.birth_month ?? null,
    birth_day: person.birth_day ?? null,
    death_year: person.death_year ?? null,
    death_month: person.death_month ?? null,
    death_day: person.death_day ?? null,
    avatar_url: person.avatar_url ?? null,
    note: person.note ?? null,
    created_at: person.created_at ?? "",
    updated_at: person.updated_at ?? "",
    death_lunar_year: person.death_lunar_year ?? null,
    death_lunar_month: person.death_lunar_month ?? null,
    death_lunar_day: person.death_lunar_day ?? null,
    is_deceased: person.is_deceased ?? false,
    is_in_law: person.is_in_law ?? false,
    birth_order: person.birth_order ?? null,
    generation: person.generation ?? null,
    other_names: person.other_names ?? null,
  })) as Person[];
}

export default async function EventsPage() {
  const supabase = await getSupabase();
  const profile = await getProfile();

  const [
    personsRes,
    customEventsRes,
    relationshipsRes,
    familiesRes,
    familyParentsRes,
    familyChildrenRes,
    eventsRes,
    personEventsRes,
  ] = await Promise.all([
    supabase
      .from("persons_active")
      .select(
        "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note, created_at, updated_at",
      ),
    supabase
      .from("custom_events")
      .select("id, name, content, event_date, location, created_by"),
    supabase.from("relationships_active").select("*"),
    supabase.from("families").select("*").is("deleted_at", null),
    supabase.from("family_parents").select("*"),
    supabase.from("family_children").select("*"),
    supabase.from("events").select("*").is("deleted_at", null),
    supabase.from("person_events").select("*"),
  ]);

  const allPersons = (personsRes.data ?? []) as EventPerson[];
  const allCustomEvents = (customEventsRes.data ?? []) as CustomEvent[];
  const allRelationships = (relationshipsRes.data ?? []) as PermissionRelationship[];
  const allFamilies = (familiesRes.data ?? []) as PermissionFamily[];
  const allFamilyParents = (familyParentsRes.data ?? []) as PermissionFamilyParent[];
  const allFamilyChildren = (familyChildrenRes.data ?? []) as PermissionFamilyChild[];
  const allEvents = (eventsRes.data ?? []) as PermissionEvent[];
  const allPersonEvents = (personEventsRes.data ?? []) as PermissionPersonEvent[];

  const permission = buildVisiblePersonSetForProfile({
    profile,
    persons: allPersons,
    relationships: allRelationships,
    families: allFamilies,
    familyParents: allFamilyParents,
    familyChildren: allFamilyChildren,
  });

  if (permission.isRestricted && !permission.viewerPersonId) {
    return (
      <PermissionEmptyState
        title="Tài khoản chưa được gắn với người trong gia phả"
        message="Vui lòng liên hệ quản trị viên để gắn tài khoản của bạn với một hồ sơ thành viên. Sau đó bạn sẽ xem được sự kiện thuộc nhánh được phép."
      />
    );
  }

  if (permission.isRestricted && permission.visiblePersonIds.size === 0) {
    return (
      <PermissionEmptyState
        title="Không có sự kiện được phép xem"
        message={
          permission.warnings[0] ||
          "Tài khoản của bạn chưa có phạm vi gia phả hợp lệ để hiển thị sự kiện."
        }
      />
    );
  }

  const visibleFamilyIds = permission.isRestricted
    ? new Set(
        allFamilies
          .filter((family) => {
            const parents = allFamilyParents.filter(
              (row) => row.family_id === family.id,
            );
            const children = allFamilyChildren.filter(
              (row) => row.family_id === family.id,
            );

            return (
              parents.some((row) =>
                permission.visiblePersonIds.has(row.person_id),
              ) ||
              children.some((row) =>
                permission.visiblePersonIds.has(row.person_id),
              )
            );
          })
          .map((family) => family.id),
      )
    : new Set(allFamilies.map((family) => family.id));

  const eventFilter = permission.isRestricted
    ? filterPersonEventsForVisiblePersons({
        events: allEvents,
        personEvents: allPersonEvents,
        visiblePersonIds: permission.visiblePersonIds,
        visibleFamilyIds,
      })
    : { events: allEvents, personEvents: allPersonEvents };

  const persons = permission.isRestricted
    ? allPersons.filter((person) => permission.visiblePersonIds.has(person.id))
    : allPersons;

  const customEvents = permission.isRestricted ? [] : allCustomEvents;
  const canCreateAdminEvent = profile?.role === "admin" || profile?.role === "editor";
  const personById = buildPersonLookup(allPersons);
  const adminManagedEvents = eventFilter.events
    .filter(isAdminManagedEvent)
    .sort((a, b) =>
      String(a.sort_date || a.start_date || "9999-99-99").localeCompare(
        String(b.sort_date || b.start_date || "9999-99-99"),
      ),
    );
  const selectorPersons = toPersonSelectorRows(persons);

  return (
    <MemberListProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ, kỷ niệm ngày cưới, đám cưới và các sự kiện gia đình
          </p>
          {permission.isRestricted ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-800">
              Bạn đang xem các sự kiện thuộc nhánh gia phả được phép. Sự kiện
              của người ngoài nhánh và sự kiện chung chưa gắn người sẽ không
              hiển thị.
            </p>
          ) : null}
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-8">
          <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4">
              {canCreateAdminEvent ? (
                <AdminEventForm persons={selectorPersons} />
              ) : (
                <div>
                  <h2 className="text-lg font-bold text-stone-800">Danh sách sự kiện</h2>
                  <p className="text-sm text-stone-500">
                    Sinh nhật, ngày giỗ, kỷ niệm ngày cưới và sự kiện gia đình. Mỗi sự kiện đã có thời gian đếm ngược ngay trên thẻ sự kiện.
                  </p>
                </div>
              )}
            </div>

            {adminManagedEvents.length > 0 ? (
              <div className="mb-6 space-y-3">
                {adminManagedEvents.map((event) => {
                  const names = getEventPersonNames({
                    eventId: event.id,
                    personEvents: eventFilter.personEvents,
                    personById,
                  });

                  return (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              {getEventTypeLabel(event.type)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
                              <CalendarDays className="size-3.5" />
                              {formatEventDate(event)}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-stone-900">
                            {event.title || getEventTypeLabel(event.type)}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-stone-500">
                            {event.place_text ? (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="size-3.5" />
                                {event.place_text}
                              </span>
                            ) : null}
                            {names.length > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Users2 className="size-3.5" />
                                {names.join(", ")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {event.description ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                          {String(event.description)}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}

            <EventsList persons={persons} customEvents={customEvents} />
          </section>
        </main>
      </div>

      <MemberDetailModal />
    </MemberListProvider>
  );
}
