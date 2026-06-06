export type RootPreferenceKind =
  | "tree"
  | "dualAncestry"
  | "inLaw"
  | "mindmap"
  | "bubble"
  | "stats";

export type RootPreferences = Record<RootPreferenceKind, string | null>;

export const ROOT_PREFERENCE_KINDS: Array<{
  kind: RootPreferenceKind;
  label: string;
  description: string;
}> = [
  {
    kind: "tree",
    label: "Gốc sơ đồ",
    description:
      "Dùng chung khi mở Cây gia phả, Mindmap và Bong bóng vì các màn này cùng dùng rootId của trang thành viên.",
  },
  {
    kind: "dualAncestry",
    label: "Gốc Nội / Ngoại",
    description: "Dùng khi mở bảng tương quan họ nội, họ ngoại.",
  },
  {
    kind: "inLaw",
    label: "Gốc Sui gia",
    description: "Dùng khi mở bảng so vai vế sui gia hai bên.",
  },
  {
    kind: "stats",
    label: "Gốc Thống kê",
    description: "Dùng cho phần thống kê theo gốc gia phả.",
  },
];

export function getRootPreferenceAccountKey(input?: {
  userId?: string | null;
  email?: string | null;
}) {
  return input?.userId || input?.email || "local";
}

export function getRootPreferenceStorageKey(
  kind: RootPreferenceKind,
  accountKey: string,
) {
  return `giapha:root:${kind}:${accountKey}`;
}

export function getLegacyRootPreferenceKeys(kind: RootPreferenceKind) {
  switch (kind) {
    case "tree":
      return ["members_rootId"];
    case "dualAncestry":
      return ["giapha:root:dual-ancestry:local"];
    case "inLaw":
      return ["giapha:root:in-law-relations:local"];
    default:
      return [];
  }
}

export function readRootPreference(
  kind: RootPreferenceKind,
  accountKey: string,
): string | null {
  if (typeof window === "undefined") return null;

  const direct = window.localStorage.getItem(
    getRootPreferenceStorageKey(kind, accountKey),
  );
  if (direct) return direct;

  for (const legacyKey of getLegacyRootPreferenceKeys(kind)) {
    const value = window.localStorage.getItem(legacyKey);
    if (value) return value;
  }

  return null;
}

export function writeRootPreference(
  kind: RootPreferenceKind,
  accountKey: string,
  personId: string | null,
) {
  if (typeof window === "undefined") return;

  const key = getRootPreferenceStorageKey(kind, accountKey);
  if (personId) {
    window.localStorage.setItem(key, personId);
  } else {
    window.localStorage.removeItem(key);
  }

  // Keep old pages / old builds compatible while we migrate all root pickers.
  if (kind === "tree") {
    if (personId) window.localStorage.setItem("members_rootId", personId);
    else window.localStorage.removeItem("members_rootId");
  }
}

export function readAllRootPreferences(accountKey: string): RootPreferences {
  return {
    tree: readRootPreference("tree", accountKey),
    dualAncestry: readRootPreference("dualAncestry", accountKey),
    inLaw: readRootPreference("inLaw", accountKey),
    mindmap: readRootPreference("mindmap", accountKey),
    bubble: readRootPreference("bubble", accountKey),
    stats: readRootPreference("stats", accountKey),
  };
}

export function writeAllRootPreferences(
  accountKey: string,
  preferences: RootPreferences,
) {
  for (const kind of Object.keys(preferences) as RootPreferenceKind[]) {
    writeRootPreference(kind, accountKey, preferences[kind]);
  }
}
