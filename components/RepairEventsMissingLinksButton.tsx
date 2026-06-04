"use client";

import { useState, useTransition } from "react";
import { repairEventsMissingPersonLinks } from "@/app/actions/data-maintenance";
import { Link2, Loader2 } from "lucide-react";

export default function RepairEventsMissingLinksButton({
  count,
}: {
  count: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    const confirmed = window.confirm(
      `Repair ${count} events thiếu person_events link? Thao tác này sẽ insert person_events còn thiếu vào DB.`,
    );

    if (!confirmed) return;

    setMessage(null);

    startTransition(async () => {
      const result = await repairEventsMissingPersonLinks();

      if (result.ok) {
        setMessage(JSON.stringify(result.result, null, 2));
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold">Repair missing person_events links</h2>
          <p className="mt-1 text-sm">
            Tạo link còn thiếu cho birth/death events đã có legacy_person_id.
            Dùng ON CONFLICT DO NOTHING để tránh trùng.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending || count === 0}
          onClick={run}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Repair {count} links
        </button>
      </div>

      {message ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-stone-900 px-3 py-2 text-xs text-white">
          {message}
        </pre>
      ) : null}
    </div>
  );
}
