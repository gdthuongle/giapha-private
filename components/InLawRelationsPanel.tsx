"use client";

import { useEffect, useMemo, useState } from "react";
import type { Person, Relationship } from "@/types";
import PersonSelector from "@/components/PersonSelector";
import LineagePersonCard from "@/components/LineagePersonCard";
import {
  buildInLawComparison,
  type InLawComparisonResult,
  type InLawPersonItem,
} from "@/utils/tree/lineageComparison";
import type {
  FamilyChildRow,
  FamilyParentRow,
  FamilyRow,
} from "@/services/statistics/globalStats.service";

interface InLawRelationsPanelProps {
  persons: Person[];
  relationships: Relationship[];
  families?: FamilyRow[];
  familyParents?: FamilyParentRow[];
  familyChildren?: FamilyChildRow[];
}

function getDisplayName(person: Person): string {
  return person.full_name || person.id;
}

function InLawCell({ items }: { items: InLawPersonItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs italic text-stone-400">Chưa có dữ liệu</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <LineagePersonCard
          key={`${item.person.id}-${item.side}-${item.branch}-${item.generation}`}
          person={item.person}
          relationLabel={item.relationLabel}
          addressHint={item.addressHint}
          compact={items.length > 2}
        />
      ))}
    </div>
  );
}

function SpousePicker({
  graph,
  selectedSpouseId,
  setSelectedSpouseId,
}: {
  graph: InLawComparisonResult;
  selectedSpouseId: string;
  setSelectedSpouseId: (id: string) => void;
}) {
  if (graph.spouses.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Người gốc chưa có vợ/chồng hiện hành nên chưa thể dựng bảng sui gia.
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-stone-700">Chọn vợ/chồng để so sui gia</span>
      <select
        value={selectedSpouseId}
        onChange={(event) => setSelectedSpouseId(event.target.value)}
        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-amber-400"
      >
        {graph.spouses.map((spouse) => (
          <option key={spouse.id} value={spouse.id}>
            {spouse.full_name}
            {spouse.birth_year ? ` (${spouse.birth_year})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function InLawRelationsPanel({
  persons,
  relationships,
  families = [],
  familyParents = [],
  familyChildren = [],
}: InLawRelationsPanelProps) {
  const sortedPersons = useMemo(() => {
    return [...persons].sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), "vi"),
    );
  }, [persons]);

  const [rootPersonId, setRootPersonId] = useState<string>(
    sortedPersons[0]?.id ?? "",
  );
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("");
  const [generationsUp, setGenerationsUp] = useState(3);
  const [generationsDown, setGenerationsDown] = useState(3);

  useEffect(() => {
    if (sortedPersons.length === 0) return;
    if (!rootPersonId || !sortedPersons.some((person) => person.id === rootPersonId)) {
      setRootPersonId(sortedPersons[0].id);
      setSelectedSpouseId("");
    }
  }, [rootPersonId, sortedPersons]);

  const graph = useMemo(() => {
    return buildInLawComparison({
      rootPersonId,
      spousePersonId: selectedSpouseId || null,
      generationsUp,
      generationsDown,
      persons,
      relationships,
      families,
      familyParents,
      familyChildren,
    });
  }, [rootPersonId, selectedSpouseId, generationsUp, generationsDown, persons, relationships, families, familyParents, familyChildren]);

  useEffect(() => {
    if (graph.spouses.length === 0) {
      if (selectedSpouseId) setSelectedSpouseId("");
      return;
    }

    if (!selectedSpouseId || !graph.spouses.some((spouse) => spouse.id === selectedSpouseId)) {
      setSelectedSpouseId(graph.spouses[0].id);
    }
  }, [graph.spouses, selectedSpouseId]);

  if (persons.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
        Chưa có dữ liệu thành viên.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr]">
          <PersonSelector
            persons={sortedPersons}
            selectedId={rootPersonId}
            onSelect={(id) => {
              if (id) {
                setRootPersonId(id);
                setSelectedSpouseId("");
              }
            }}
            label="Người gốc"
            placeholder="Tìm người gốc..."
            className="w-full"
          />

          <SpousePicker
            graph={graph}
            selectedSpouseId={selectedSpouseId}
            setSelectedSpouseId={setSelectedSpouseId}
          />

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-stone-700">Số đời trước</span>
            <select
              value={generationsUp}
              onChange={(event) => setGenerationsUp(Number(event.target.value))}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-amber-400"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} đời
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-stone-700">Số đời sau</span>
            <select
              value={generationsDown}
              onChange={(event) => setGenerationsDown(Number(event.target.value))}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none focus:border-amber-400"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} đời
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-4 text-sm text-stone-500">
          Bảng sui gia đặt nội/ngoại bên người gốc cạnh nội/ngoại bên vợ/chồng để so thế hệ và gợi ý cách xưng hô khi gặp họ hàng hai bên.
        </p>
      </div>

      {graph.warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Lưu ý dữ liệu</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {graph.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[1280px] w-full border-collapse text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="w-32 border-b border-stone-200 px-4 py-3">Đời</th>
              <th className="w-[18%] border-b border-stone-200 px-4 py-3 text-sky-800">Nội bên người gốc</th>
              <th className="w-[18%] border-b border-stone-200 px-4 py-3 text-rose-800">Ngoại bên người gốc</th>
              <th className="w-[20%] border-b border-stone-200 px-4 py-3 text-amber-800">Cặp vợ chồng / hậu duệ</th>
              <th className="w-[18%] border-b border-stone-200 px-4 py-3 text-sky-800">Nội bên vợ/chồng</th>
              <th className="w-[18%] border-b border-stone-200 px-4 py-3 text-rose-800">Ngoại bên vợ/chồng</th>
            </tr>
          </thead>
          <tbody>
            {graph.rows.map((row) => (
              <tr key={row.generation} className={row.generation === 0 ? "bg-amber-50/40" : "odd:bg-white even:bg-stone-50/40"}>
                <td className="align-top border-b border-stone-100 px-4 py-4 font-semibold text-stone-700">
                  {row.label}
                </td>
                <td className="align-top border-b border-stone-100 px-4 py-4">
                  <InLawCell items={row.rootPaternal} />
                </td>
                <td className="align-top border-b border-stone-100 px-4 py-4">
                  <InLawCell items={row.rootMaternal} />
                </td>
                <td className="align-top border-b border-stone-100 px-4 py-4">
                  <InLawCell items={row.couple} />
                </td>
                <td className="align-top border-b border-stone-100 px-4 py-4">
                  <InLawCell items={row.spousePaternal} />
                </td>
                <td className="align-top border-b border-stone-100 px-4 py-4">
                  <InLawCell items={row.spouseMaternal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
