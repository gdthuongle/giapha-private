"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RotateCcw, Save } from "lucide-react";
import type { Person } from "@/types";
import PersonSelector from "@/components/PersonSelector";
import { useUser } from "@/components/UserProvider";
import {
  ROOT_PREFERENCE_KINDS,
  createEmptyRootPreferences,
  getRootPreferenceAccountKey,
  hydrateRootPreferencesFromDb,
  readAllRootPreferences,
  writeAllRootPreferences,
  writeAllRootPreferencesToDb,
  type RootPreferenceKind,
  type RootPreferences,
} from "@/utils/preferences/rootPreferences";

type AccountSettingsPanelProps = {
  persons: Person[];
};

function getDisplayName(person: Person): string {
  return person.full_name || person.id;
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
    createEmptyRootPreferences(),
  );
  const [loaded, setLoaded] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPreferences() {
      setLoaded(false);

      const local = readAllRootPreferences(accountKey);
      const merged = user?.id
        ? await hydrateRootPreferencesFromDb({ userId: user.id, email: user.email })
        : local;

      if (ignore) return;

      const normalized: RootPreferences = createEmptyRootPreferences();
      for (const item of ROOT_PREFERENCE_KINDS) {
        const value = merged[item.kind];
        normalized[item.kind] = value && validPersonIds.has(value) ? value : null;
      }

      setPreferences(normalized);
      setLoaded(true);
    }

    loadPreferences();

    return () => {
      ignore = true;
    };
  }, [accountKey, user?.id, user?.email, validPersonIds]);

  const setPreference = (kind: RootPreferenceKind, personId: string | null) => {
    setPreferences((current) => ({
      ...current,
      [kind]: personId,
    }));
    setSavedMessage(null);
    setSaveWarning(null);
  };

  const savePreferences = async () => {
    writeAllRootPreferences(accountKey, preferences);

    const dbResult = await writeAllRootPreferencesToDb(user?.id, preferences);
    if (dbResult.ok) {
      setSavedMessage("Đã lưu cài đặt gốc mặc định vào tài khoản của bạn.");
      setSaveWarning(null);
    } else {
      setSavedMessage("Đã lưu tạm trên trình duyệt hiện tại.");
      setSaveWarning(
        dbResult.error
          ? `Chưa lưu được vào database: ${dbResult.error}`
          : "Chưa lưu được vào database.",
      );
    }

    window.setTimeout(() => {
      setSavedMessage(null);
      setSaveWarning(null);
    }, 6000);
  };

  const resetPreferences = async () => {
    const empty = createEmptyRootPreferences();
    setPreferences(empty);
    writeAllRootPreferences(accountKey, empty);

    const dbResult = await writeAllRootPreferencesToDb(user?.id, empty);
    if (dbResult.ok) {
      setSavedMessage("Đã xoá các gốc mặc định trong tài khoản của bạn.");
      setSaveWarning(null);
    } else {
      setSavedMessage("Đã xoá cài đặt tạm trên trình duyệt hiện tại.");
      setSaveWarning(
        dbResult.error
          ? `Chưa xoá được trong database: ${dbResult.error}`
          : "Chưa xoá được trong database.",
      );
    }

    window.setTimeout(() => {
      setSavedMessage(null);
      setSaveWarning(null);
    }, 6000);
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
        <p className="font-semibold">Cài đặt này lưu theo tài khoản.</p>
        <p className="mt-1 text-amber-800/80">
          Admin có thể chọn gốc sơ đồ mặc định khi tạo người dùng. Sau khi đăng nhập,
          mỗi thành viên có thể tự đổi gốc mặc định của mình tại đây. Nếu database chưa sẵn sàng,
          hệ thống sẽ lưu tạm trên trình duyệt.
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

        {saveWarning ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="size-4" />
            {saveWarning}
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

      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm text-sky-900">
        <div className="flex gap-3">
          <Database className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Lưu ý khi dùng nhiều thiết bị</p>
            <p className="mt-1 text-sky-800/80">
              Sau khi chạy migration <code>user_preferences</code>, cài đặt sẽ đồng bộ theo tài khoản.
              Trước đó, app vẫn fallback an toàn sang localStorage trên từng trình duyệt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
