"use client";

import { useState, useTransition } from "react";
import { softDeleteEmptyFamilies } from "@/app/actions/data-maintenance";
import { Loader2, Trash2 } from "lucide-react";

export default function SoftDeleteEmptyFamiliesButton({
  count,
}: {
  count: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    const confirmed = window.confirm(
      `Soft-delete ${count} empty families? Thao tác này chỉ set deleted_at, không hard delete.`,
    );

    if (!confirmed) return;

    setMessage(null);

    startTransition(async () => {
      const result = await softDeleteEmptyFamilies();

      if (result.ok) {
        setMessage(JSON.stringify(result.result, null, 2));
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold">Soft-delete empty families</h2>
          <p className="mt-1 text-sm">
            Chỉ áp dụng cho families active không có cha/mẹ và không có con.
            Không hard delete dữ liệu.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending || count === 0}
          onClick={run}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Soft-delete {count} families
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
