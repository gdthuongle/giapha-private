"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import type { Person } from "@/types";
import PersonSelector from "@/components/PersonSelector";
import { useUser } from "@/components/UserProvider";
import {
  ROOT_PREFERENCE_KINDS,
  getRootPreferenceAccountKey,
  readAllRootPreferences,
  writeAllRootPreferences,
  type RootPreferenceKind,
  type RootPreferences,
} from "@/utils/preferences/rootPreferences";

type AccountSettingsPanelProps = {
  persons: Person[];
};

function getDisplayName(person: Person): string {
  return person.full_name || person.id;
}

function createEmptyPreferences(): RootPreferences {
  return {
    tree: null,
    dualAncestry: null,
    inLaw: null,
    mindmap: null,
    bubble: null,
    stats: null,
  };
}

export default function AccountSettingsPanel({ persons }: AccountSettingsPanelProps) {
  const { user } = useUser();
  const accountKey = getRootPreferenceAccountKey({
    userId: user?.id,
    email: user?.email,
  });

  const sortedPersons = useMemo(() => {
    return [...persons].sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), "vi"),
    );
  }, [persons]);

  const validPersonIds = useMemo(() => {
    return new Set(sortedPersons.map((person) => person.id));
  }, [sortedPersons]);

  const [preferences, setPreferences] = useState<RootPreferences>(() =>
    createEmptyPreferences(),
  );
  const [loaded, setLoaded] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = readAllRootPreferences(accountKey);
    const normalized: RootPreferences = createEmptyPreferences();

    for (const item of ROOT_PREFERENCE_KINDS) {
      const value = stored[item.kind];
      normalized[item.kind] = value && validPersonIds.has(value) ? value : null;
    }

    setPreferences(normalized);
    setLoaded(true);
  }, [accountKey, validPersonIds]);

  const setPreference = (kind: RootPreferenceKind, personId: string | null) => {
    setPreferences((current) => ({
      ...current,
      [kind]: personId,
    }));
    setSavedMessage(null);
  };

  const savePreferences = () => {
    writeAllRootPreferences(accountKey, preferences);
    setSavedMessage("Đã lưu cài đặt gốc mặc định cho tài khoản này trên trình duyệt hiện tại.");
    window.setTimeout(() => setSavedMessage(null), 4500);
  };

  const resetPreferences = () => {
    const empty = createEmptyPreferences();
    setPreferences(empty);
    writeAllRootPreferences(accountKey, empty);
    setSavedMessage("Đã xoá các gốc mặc định đã lưu trên trình duyệt hiện tại.");
    window.setTimeout(() => setSavedMessage(null), 4500);
  };

  if (persons.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
        Chưa có dữ liệu thành viên để thiết lập người gốc mặc định.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
        <p className="font-semibold">Cài đặt này lưu theo từng tài khoản trên trình duyệt đang dùng.</p>
        <p className="mt-1 text-amber-800/80">
          Khi mở Cây gia phả, Mindmap, Bong bóng, Nội / Ngoại, Sui gia hoặc Thống kê,
          hệ thống sẽ ưu tiên người gốc trong URL trước, sau đó mới dùng gốc mặc định đã lưu ở đây.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Người gốc mặc định</h2>
            <p className="mt-1 text-sm text-stone-500">
              Chọn sẵn người gốc cho từng nhóm màn để thành viên không phải chọn lại mỗi lần xem.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetPreferences}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              <RotateCcw className="size-4" />
              Xoá cài đặt
            </button>
            <button
              type="button"
              onClick={savePreferences}
              disabled={!loaded}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
            >
              <Save className="size-4" />
              Lưu cài đặt
            </button>
          </div>
        </div>

        {savedMessage ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-4" />
            {savedMessage}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {ROOT_PREFERENCE_KINDS.map((item) => (
            <div
              key={item.kind}
              className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4"
            >
              <PersonSelector
                persons={sortedPersons}
                selectedId={preferences[item.kind]}
                onSelect={(id) => setPreference(item.kind, id)}
                label={item.label}
                placeholder="Chưa chọn người gốc"
                className="w-full"
              />
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
