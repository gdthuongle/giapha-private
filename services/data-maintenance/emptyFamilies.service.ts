export type FamilyLike = {
  id: string;
  status?: string | null;
  legacy_family_id?: string | null;
  legacy_source?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export type FamilyParentLike = {
  family_id: string;
};

export type FamilyChildLike = {
  family_id: string;
};

export type EmptyFamilyRow = {
  id: string;
  status: string;
  legacyFamilyId: string | null;
  legacySource: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function buildEmptyFamilyRows(input: {
  families: FamilyLike[];
  familyParents: FamilyParentLike[];
  familyChildren: FamilyChildLike[];
}): EmptyFamilyRow[] {
  const familyIdsWithParents = new Set(
    input.familyParents.map((row) => row.family_id),
  );

  const familyIdsWithChildren = new Set(
    input.familyChildren.map((row) => row.family_id),
  );

  return input.families
    .filter((family) => !family.deleted_at)
    .filter((family) => !familyIdsWithParents.has(family.id))
    .filter((family) => !familyIdsWithChildren.has(family.id))
    .sort((a, b) => {
      return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    })
    .map((family) => ({
      id: family.id,
      status: family.status ?? "unknown",
      legacyFamilyId: family.legacy_family_id ?? null,
      legacySource: family.legacy_source ?? null,
      createdAt: family.created_at ?? null,
      updatedAt: family.updated_at ?? null,
    }));
}
