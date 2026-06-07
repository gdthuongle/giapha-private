import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/modal/MemberDetailModal";
import { MemberListProvider } from "@/context/MemberListContext";
import {
  buildVisiblePersonSetForProfile,
  filterPersonEventsForVisiblePersons,
} from "@/utils/permissions/applyPersonVisibility";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { CalendarDays, Cake, Heart, Skull, Star } from "lucide-react";

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
  [key: string]: unknown;
};

type UpcomingEvent = {
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  daysUntil: number;
  type: string;
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
        "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, avatar_url",
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
  const upcomingEvents = buildUpcomingEvents({
    persons,
    events: eventFilter.events,
    personEvents: eventFilter.personEvents,
    customEvents,
  });

  return (
    <MemberListProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ, kỷ niệm ngày cưới và các sự kiện gia đình
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
          <UpcomingEventsSection events={upcomingEvents} />
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-stone-800">Tất cả sự kiện</h2>
              <p className="text-sm text-stone-500">
                Danh sách sinh nhật, ngày giỗ âm lịch và sự kiện tùy chỉnh hiện có.
              </p>
            </div>
            <EventsList persons={persons} customEvents={customEvents} />
          </section>
        </main>
      </div>

      <MemberDetailModal />
    </MemberListProvider>
  );
}

function UpcomingEventsSection({ events }: { events: UpcomingEvent[] }) {
  const today = events.filter((event) => event.daysUntil === 0);
  const next7 = events.filter((event) => event.daysUntil > 0 && event.daysUntil <= 7);
  const next30 = events.filter((event) => event.daysUntil > 7 && event.daysUntil <= 30);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <CalendarDays className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-800">Sắp tới</h2>
          <p className="text-sm text-stone-500">
            Nhóm sự kiện hôm nay, 7 ngày tới và 30 ngày tới.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingBucket title="Hôm nay" events={today} emptyText="Hôm nay chưa có sự kiện." />
        <UpcomingBucket title="7 ngày tới" events={next7} emptyText="7 ngày tới chưa có sự kiện." />
        <UpcomingBucket title="30 ngày tới" events={next30} emptyText="30 ngày tới chưa có sự kiện." />
      </div>
    </section>
  );
}

function UpcomingBucket({
  title,
  events,
  emptyText,
}: {
  title: string;
  events: UpcomingEvent[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4">
      <h3 className="mb-3 text-sm font-bold text-stone-800">{title}</h3>
      {events.length === 0 ? (
        <p className="text-sm text-stone-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 8).map((event) => {
            const Icon = getUpcomingIcon(event.type);
            return (
              <div key={event.id} className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200/70">
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">{event.title}</p>
                    <p className="text-xs text-stone-500">{event.subtitle}</p>
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      {event.dateLabel} · {event.daysUntil === 0 ? "Hôm nay" : `Còn ${event.daysUntil} ngày`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildUpcomingEvents(input: {
  persons: EventPerson[];
  events: PermissionEvent[];
  personEvents: PermissionPersonEvent[];
  customEvents: CustomEvent[];
}) {
  const personById = new Map(input.persons.map((person) => [person.id, person]));
  const personIdsByEventId = new Map<string, string[]>();

  for (const personEvent of input.personEvents) {
    if (!personById.has(personEvent.person_id)) continue;
    personIdsByEventId.set(personEvent.event_id, [
      ...(personIdsByEventId.get(personEvent.event_id) ?? []),
      personEvent.person_id,
    ]);
  }

  const items: UpcomingEvent[] = [];

  for (const person of input.persons) {
    const birthday = buildAnnualOccurrence({
      id: `legacy-birth:${person.id}`,
      type: "birth",
      title: `Sinh nhật ${person.full_name}`,
      subtitle: person.is_deceased ? "Ngày sinh" : "Sinh nhật",
      month: person.birth_month,
      day: person.birth_day,
    });
    if (birthday) items.push(birthday);

    const deathAnniversary = buildAnnualOccurrence({
      id: `legacy-death:${person.id}`,
      type: "death",
      title: `Ngày giỗ ${person.full_name}`,
      subtitle: "Theo ngày mất dương lịch",
      month: person.death_month,
      day: person.death_day,
    });
    if (deathAnniversary) items.push(deathAnniversary);
  }

  for (const event of input.events) {
    if (!event.start_date) continue;
    if (!isUpcomingEventType(event.type ?? "")) continue;

    const linkedPeople = (personIdsByEventId.get(event.id) ?? [])
      .map((id) => personById.get(id)?.full_name)
      .filter(Boolean) as string[];

    const occurrence = buildAnnualOccurrence({
      id: `event:${event.id}`,
      type: event.type ?? "custom",
      title: event.title || getEventTitle(event.type ?? "custom", linkedPeople),
      subtitle: linkedPeople.length > 0 ? linkedPeople.join(" · ") : getEventTypeLabel(event.type ?? "custom"),
      month: Number(event.start_date.slice(5, 7)),
      day: Number(event.start_date.slice(8, 10)),
    });

    if (occurrence) items.push(occurrence);
  }

  for (const event of input.customEvents) {
    const occurrence = buildAnnualOccurrence({
      id: `custom:${event.id}`,
      type: "custom",
      title: event.name,
      subtitle: event.location || event.content || "Sự kiện tùy chỉnh",
      month: Number(event.event_date.slice(5, 7)),
      day: Number(event.event_date.slice(8, 10)),
    });

    if (occurrence) items.push(occurrence);
  }

  return dedupeUpcomingEvents(items)
    .filter((event) => event.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.title.localeCompare(b.title, "vi"));
}

function buildAnnualOccurrence(input: {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  month: number | null | undefined;
  day: number | null | undefined;
}): UpcomingEvent | null {
  if (!input.month || !input.day) return null;
  if (input.month < 1 || input.month > 12 || input.day < 1 || input.day > 31) return null;

  const today = startOfToday();
  const year = today.getUTCFullYear();
  let next = new Date(Date.UTC(year, input.month - 1, input.day));

  if (next.getTime() < today.getTime()) {
    next = new Date(Date.UTC(year + 1, input.month - 1, input.day));
  }

  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);

  return {
    id: input.id,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    daysUntil,
    dateLabel: `${String(input.day).padStart(2, "0")}-${String(input.month).padStart(2, "0")}`,
  };
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isUpcomingEventType(type: string) {
  return ["birth", "death", "marriage", "custom"].includes(type);
}

function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    birth: "Sinh nhật",
    death: "Ngày giỗ",
    marriage: "Kỷ niệm ngày cưới",
    custom: "Sự kiện",
  };

  return labels[type] ?? "Sự kiện";
}

function getEventTitle(type: string, people: string[]) {
  const suffix = people.length > 0 ? `: ${people.join(" & ")}` : "";
  return `${getEventTypeLabel(type)}${suffix}`;
}

function getUpcomingIcon(type: string) {
  if (type === "birth") return Cake;
  if (type === "death") return Skull;
  if (type === "marriage") return Heart;
  return Star;
}

function dedupeUpcomingEvents(events: UpcomingEvent[]) {
  const seen = new Set<string>();
  const out: UpcomingEvent[] = [];

  for (const event of events) {
    const key = `${event.type}:${event.title}:${event.dateLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }

  return out;
}
