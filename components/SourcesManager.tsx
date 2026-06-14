"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  softDeleteSource,
  updateSource,
  type SourceType,
} from "@/app/actions/sources";
import { createClient } from "@/utils/supabase/client";
import { ExternalLink, Search, X } from "lucide-react";

type SourceRow = {
  id: string;
  title: string;
  source_type: SourceType;
  author: string | null;
  repository: string | null;
  url: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SourceUsage = {
  personCount: number;
  eventCount: number;
};

const SOURCE_TYPES: Array<{ value: SourceType; label: string }> = [
  { value: "document", label: "Tài liệu" },
  { value: "photo", label: "Hình ảnh" },
  { value: "oral_history", label: "Lời kể" },
  { value: "book", label: "Sách" },
  { value: "website", label: "Website" },
  { value: "archive", label: "Lưu trữ" },
  { value: "other", label: "Khác" },
];

function sourceTypeLabel(value: SourceType) {
  return SOURCE_TYPES.find((item) => item.value === value)?.label ?? "Khác";
}

function SourcesManager() {
  const supabase = useMemo(() => createClient(), []);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [usageBySourceId, setUsageBySourceId] = useState<Record<string, SourceUsage>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<SourceRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSourceType, setEditSourceType] = useState<SourceType>("other");
  const [editAuthor, setEditAuthor] = useState("");
  const [editRepository, setEditRepository] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editNote, setEditNote] = useState("");

  const filteredSources = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return sources;

    return sources.filter((source) =>
      [
        source.title,
        source.source_type,
        source.author,
        source.repository,
        source.url,
        source.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, sources]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const { data: sourceRows, error: sourcesError } = await supabase
      .from("sources")
      .select("id, title, source_type, author, repository, url, note, created_at, updated_at")
      .is("deleted_at", null)
      .order("title", { ascending: true });

    if (sourcesError) {
      setError(sourcesError.message);
      setLoading(false);
      return;
    }

    const { data: personLinks, error: personLinksError } = await supabase
      .from("person_source_links")
      .select("source_id")
      .is("deleted_at", null);

    if (personLinksError) {
      setError(personLinksError.message);
      setLoading(false);
      return;
    }

    const { data: eventLinks, error: eventLinksError } = await supabase
      .from("event_source_links")
      .select("source_id")
      .is("deleted_at", null);

    if (eventLinksError) {
      setError(eventLinksError.message);
      setLoading(false);
      return;
    }

    const usage: Record<string, SourceUsage> = {};

    for (const row of personLinks ?? []) {
      if (!row.source_id) continue;
      usage[row.source_id] ??= { personCount: 0, eventCount: 0 };
      usage[row.source_id].personCount += 1;
    }

    for (const row of eventLinks ?? []) {
      if (!row.source_id) continue;
      usage[row.source_id] ??= { personCount: 0, eventCount: 0 };
      usage[row.source_id].eventCount += 1;
    }

    setSources((sourceRows ?? []) as SourceRow[]);
    setUsageBySourceId(usage);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (source: SourceRow) => {
    setError(null);
    setEditing(source);
    setEditTitle(source.title ?? "");
    setEditSourceType(source.source_type ?? "other");
    setEditAuthor(source.author ?? "");
    setEditRepository(source.repository ?? "");
    setEditUrl(source.url ?? "");
    setEditNote(source.note ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditTitle("");
    setEditSourceType("other");
    setEditAuthor("");
    setEditRepository("");
    setEditUrl("");
    setEditNote("");
  };

  const handleUpdate = () => {
    if (!editing) return;

    setError(null);

    startTransition(async () => {
      const result = await updateSource({
        sourceId: editing.id,
        title: editTitle,
        sourceType: editSourceType,
        author: editAuthor,
        repository: editRepository,
        url: editUrl,
        note: editNote,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      cancelEdit();
      await loadData();
    });
  };

  const handleDelete = (source: SourceRow) => {
    const usage = usageBySourceId[source.id] ?? { personCount: 0, eventCount: 0 };

    if (
      !window.confirm(
        `Xóa nguồn "${source.title}" khỏi toàn bộ hệ thống?\n\nNguồn này đang gắn với ${usage.personCount} người và ${usage.eventCount} sự kiện.`,
      )
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await softDeleteSource(source.id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (editing?.id === source.id) {
        cancelEdit();
      }

      await loadData();
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên nguồn, tác giả, nơi lưu, URL..."
            className="w-full rounded-xl border border-stone-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {editing ? (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Sửa nguồn</h2>
              <p className="mt-1 text-sm text-stone-500">
                Thay đổi ở đây sẽ áp dụng cho mọi người và mọi sự kiện đang dùng nguồn này.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full p-2 text-stone-500 transition hover:bg-white hover:text-stone-900"
              title="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Tên nguồn</span>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Loại nguồn</span>
              <select
                value={editSourceType}
                onChange={(event) => setEditSourceType(event.target.value as SourceType)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              >
                {SOURCE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Người cung cấp / tác giả</span>
              <input
                value={editAuthor}
                onChange={(event) => setEditAuthor(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Nơi lưu / kho lưu trữ</span>
              <input
                value={editRepository}
                onChange={(event) => setEditRepository(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">URL</span>
              <input
                value={editUrl}
                onChange={(event) => setEditUrl(event.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Ghi chú</span>
              <textarea
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isPending || !editTitle.trim()}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(editing)}
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xóa nguồn
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">
            Danh sách nguồn
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {loading
              ? "Đang tải..."
              : `${filteredSources.length} / ${sources.length} nguồn`}
          </p>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-stone-500">Đang tải nguồn...</p>
        ) : filteredSources.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Không có nguồn phù hợp.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredSources.map((source) => {
              const usage = usageBySourceId[source.id] ?? {
                personCount: 0,
                eventCount: 0,
              };

              return (
                <article key={source.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-stone-900">{source.title}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {sourceTypeLabel(source.source_type)}
                        {source.author ? ` · ${source.author}` : ""}
                        {source.repository ? ` · ${source.repository}` : ""}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-600">
                          {usage.personCount} người
                        </span>
                        <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-600">
                          {usage.eventCount} sự kiện
                        </span>
                      </div>

                      {source.note ? (
                        <p className="mt-2 text-sm text-stone-600">{source.note}</p>
                      ) : null}

                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          Mở liên kết
                          <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(source)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(source)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Xóa nguồn
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default SourcesManager;
