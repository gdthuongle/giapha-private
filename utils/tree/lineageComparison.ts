import type { Person, Relationship } from "@/types";
import type {
  FamilyChildRow,
  FamilyParentRow,
  FamilyRow,
} from "@/services/statistics/globalStats.service";

export type LineageBranch = "paternal" | "maternal";
export type InLawSide = "root" | "spouse";

export interface LineagePersonItem {
  person: Person;
  generation: number;
  branch: LineageBranch | "center";
  relationLabel: string;
  note?: string;
}

export interface LineageGenerationRow {
  generation: number;
  label: string;
  paternal: LineagePersonItem[];
  center: LineagePersonItem[];
  maternal: LineagePersonItem[];
}

export interface LineageComparisonResult {
  root: Person | null;
  father: Person | null;
  mother: Person | null;
  rows: LineageGenerationRow[];
  warnings: string[];
}

export interface InLawPersonItem {
  person: Person;
  generation: number;
  side: InLawSide | "center";
  branch: LineageBranch | "couple" | "descendant";
  relationLabel: string;
  addressHint: string;
  note?: string;
}

export interface InLawGenerationRow {
  generation: number;
  label: string;
  rootPaternal: InLawPersonItem[];
  rootMaternal: InLawPersonItem[];
  couple: InLawPersonItem[];
  spousePaternal: InLawPersonItem[];
  spouseMaternal: InLawPersonItem[];
}

export interface InLawComparisonResult {
  root: Person | null;
  spouses: Person[];
  selectedSpouse: Person | null;
  rows: InLawGenerationRow[];
  warnings: string[];
}

export interface LineageInput {
  rootPersonId: string;
  persons: Person[];
  relationships?: Relationship[];
  families?: FamilyRow[];
  familyParents?: FamilyParentRow[];
  familyChildren?: FamilyChildRow[];
  generationsUp?: number;
  generationsDown?: number;
}

export interface InLawInput extends LineageInput {
  spousePersonId?: string | null;
}

interface ParentChildEdge {
  parentId: string;
  childId: string;
}

interface SpouseEdge {
  personA: string;
  personB: string;
}

interface CollectedPerson {
  personId: string;
  generation: number;
}

function getPersonName(person: Person): string {
  return person.full_name || person.id;
}

function sortPersons<T extends { person: Person; generation: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.generation !== b.generation) return a.generation - b.generation;

    const birthA = a.person.birth_year ?? 9999;
    const birthB = b.person.birth_year ?? 9999;
    if (birthA !== birthB) return birthA - birthB;

    return getPersonName(a.person).localeCompare(getPersonName(b.person), "vi");
  });
}

function generationLabel(generation: number): string {
  if (generation < 0) {
    if (generation === -1) return "-1 · Cha mẹ";
    if (generation === -2) return "-2 · Ông bà";
    if (generation === -3) return "-3 · Cụ";
    if (generation === -4) return "-4 · Kỵ";
    return `${generation} · Tổ đời ${Math.abs(generation)}`;
  }

  if (generation === 0) return "0 · Người gốc / cặp vợ chồng";
  if (generation === 1) return "+1 · Con";
  if (generation === 2) return "+2 · Cháu";
  if (generation === 3) return "+3 · Chắt";
  if (generation === 4) return "+4 · Chút";
  return `+${generation} · Hậu duệ đời ${generation}`;
}

function branchAncestorLabel(input: {
  branch: LineageBranch;
  generation: number;
  person: Person;
  owner?: "root" | "spouse";
}): string {
  const { branch, generation, person, owner = "root" } = input;
  const sideSuffix = owner === "spouse" ? " bên vợ/chồng" : "";

  if (generation === -1) {
    if (branch === "paternal") return `Cha${sideSuffix}`;
    return `Mẹ${sideSuffix}`;
  }

  if (generation === -2) {
    if (branch === "paternal") {
      return person.gender === "female" ? `Bà nội${sideSuffix}` : `Ông nội${sideSuffix}`;
    }
    return person.gender === "female" ? `Bà ngoại${sideSuffix}` : `Ông ngoại${sideSuffix}`;
  }

  if (generation === -3) {
    return branch === "paternal" ? `Cụ bên nội${sideSuffix}` : `Cụ bên ngoại${sideSuffix}`;
  }

  if (generation === -4) {
    return branch === "paternal" ? `Kỵ bên nội${sideSuffix}` : `Kỵ bên ngoại${sideSuffix}`;
  }

  return branch === "paternal"
    ? `Tổ đời ${Math.abs(generation)} bên nội${sideSuffix}`
    : `Tổ đời ${Math.abs(generation)} bên ngoại${sideSuffix}`;
}

function descendantLabel(generation: number): string {
  if (generation === 1) return "Con";
  if (generation === 2) return "Cháu";
  if (generation === 3) return "Chắt";
  if (generation === 4) return "Chút";
  return `Hậu duệ đời ${generation}`;
}

function addressHint(item: { branch: LineageBranch | "couple" | "descendant"; generation: number; relationLabel: string }): string {
  if (item.branch === "couple") return "Cặp gốc để so vai vế";
  if (item.branch === "descendant") return "Hậu duệ chung, xưng theo đời con/cháu";
  if (item.generation < 0) return `Thường gọi: ${item.relationLabel.toLowerCase()}`;
  return item.relationLabel;
}

export function buildLineageComparison(input: LineageInput): LineageComparisonResult {
  const generationsUp = input.generationsUp ?? 4;
  const generationsDown = input.generationsDown ?? 4;
  const personsMap = new Map(input.persons.map((person) => [person.id, person]));
  const root = personsMap.get(input.rootPersonId) ?? null;
  const warnings: string[] = [];

  if (!root) {
    return {
      root: null,
      father: null,
      mother: null,
      rows: createLineageRows(generationsUp, generationsDown, [], [], []),
      warnings: [`Không tìm thấy người gốc: ${input.rootPersonId}`],
    };
  }

  const parentChildEdges = buildParentChildEdges(input);
  const { fatherId, motherId } = getDirectParents(input.rootPersonId, parentChildEdges, personsMap);
  const father = fatherId ? personsMap.get(fatherId) ?? null : null;
  const mother = motherId ? personsMap.get(motherId) ?? null : null;

  if (!father) warnings.push("Người gốc chưa có cha trong dữ liệu.");
  if (!mother) warnings.push("Người gốc chưa có mẹ trong dữ liệu.");

  const paternal = fatherId
    ? collectAncestors(fatherId, parentChildEdges, generationsUp)
        .map((node): LineagePersonItem | null => {
          const person = personsMap.get(node.personId);
          if (!person) return null;
          return {
            person,
            generation: -node.generation,
            branch: "paternal",
            relationLabel: branchAncestorLabel({
              branch: "paternal",
              generation: -node.generation,
              person,
            }),
          };
        })
        .filter((item): item is LineagePersonItem => Boolean(item))
    : [];

  const maternal = motherId
    ? collectAncestors(motherId, parentChildEdges, generationsUp)
        .map((node): LineagePersonItem | null => {
          const person = personsMap.get(node.personId);
          if (!person) return null;
          return {
            person,
            generation: -node.generation,
            branch: "maternal",
            relationLabel: branchAncestorLabel({
              branch: "maternal",
              generation: -node.generation,
              person,
            }),
          };
        })
        .filter((item): item is LineagePersonItem => Boolean(item))
    : [];

  const center: LineagePersonItem[] = [
    {
      person: root,
      generation: 0,
      branch: "center",
      relationLabel: "Người gốc",
    },
    ...collectDescendants(input.rootPersonId, parentChildEdges, generationsDown)
      .map((node): LineagePersonItem | null => {
        const person = personsMap.get(node.personId);
        if (!person) return null;
        return {
          person,
          generation: node.generation,
          branch: "center",
          relationLabel: descendantLabel(node.generation),
        };
      })
      .filter((item): item is LineagePersonItem => Boolean(item)),
  ];

  return {
    root,
    father,
    mother,
    rows: createLineageRows(generationsUp, generationsDown, paternal, center, maternal),
    warnings,
  };
}

export function buildInLawComparison(input: InLawInput): InLawComparisonResult {
  const generationsUp = input.generationsUp ?? 3;
  const generationsDown = input.generationsDown ?? 3;
  const personsMap = new Map(input.persons.map((person) => [person.id, person]));
  const root = personsMap.get(input.rootPersonId) ?? null;
  const warnings: string[] = [];

  if (!root) {
    return {
      root: null,
      spouses: [],
      selectedSpouse: null,
      rows: createInLawRows(generationsUp, generationsDown, [], [], [], [], []),
      warnings: [`Không tìm thấy người gốc: ${input.rootPersonId}`],
    };
  }

  const parentChildEdges = buildParentChildEdges(input);
  const spouseEdges = buildSpouseEdges(input);
  const spouses = getSpouses(input.rootPersonId, spouseEdges, personsMap);
  const selectedSpouse =
    (input.spousePersonId ? personsMap.get(input.spousePersonId) ?? null : null) ?? spouses[0] ?? null;

  if (spouses.length === 0) {
    warnings.push("Người được chọn chưa có vợ/chồng hiện hành trong dữ liệu.");
  }

  const rootLineage = collectTwoBranchAncestors({
    ownerId: input.rootPersonId,
    owner: "root",
    parentChildEdges,
    personsMap,
    generationsUp,
  });

  const spouseLineage = selectedSpouse
    ? collectTwoBranchAncestors({
        ownerId: selectedSpouse.id,
        owner: "spouse",
        parentChildEdges,
        personsMap,
        generationsUp,
      })
    : { paternal: [], maternal: [], warnings: ["Chưa chọn được vợ/chồng để so sui gia."] };

  warnings.push(...rootLineage.warnings.map((warning) => `Bên người gốc: ${warning}`));
  warnings.push(...spouseLineage.warnings.map((warning) => `Bên vợ/chồng: ${warning}`));

  const coupleItems: InLawPersonItem[] = [
    {
      person: root,
      generation: 0,
      side: "center",
      branch: "couple",
      relationLabel: "Người gốc",
      addressHint: "Người đang chọn",
    },
  ];

  if (selectedSpouse) {
    coupleItems.push({
      person: selectedSpouse,
      generation: 0,
      side: "center",
      branch: "couple",
      relationLabel: "Vợ/chồng",
      addressHint: "Bên sui gia trực tiếp",
    });
  }

  const commonDescendants = selectedSpouse
    ? collectCommonDescendants({
        rootId: input.rootPersonId,
        spouseId: selectedSpouse.id,
        parentChildEdges,
        families: input.families ?? [],
        familyParents: input.familyParents ?? [],
        familyChildren: input.familyChildren ?? [],
        personsMap,
        maxDepth: generationsDown,
      })
    : [];

  for (const item of commonDescendants) {
    coupleItems.push(item);
  }

  return {
    root,
    spouses,
    selectedSpouse,
    rows: createInLawRows(
      generationsUp,
      generationsDown,
      rootLineage.paternal,
      rootLineage.maternal,
      coupleItems,
      spouseLineage.paternal,
      spouseLineage.maternal,
    ),
    warnings,
  };
}

function collectTwoBranchAncestors(input: {
  ownerId: string;
  owner: "root" | "spouse";
  parentChildEdges: ParentChildEdge[];
  personsMap: Map<string, Person>;
  generationsUp: number;
}): { paternal: InLawPersonItem[]; maternal: InLawPersonItem[]; warnings: string[] } {
  const { fatherId, motherId } = getDirectParents(input.ownerId, input.parentChildEdges, input.personsMap);
  const warnings: string[] = [];

  if (!fatherId) warnings.push("chưa có cha trong dữ liệu.");
  if (!motherId) warnings.push("chưa có mẹ trong dữ liệu.");

  const makeItems = (startId: string | null, branch: LineageBranch): InLawPersonItem[] => {
    if (!startId) return [];

    return collectAncestors(startId, input.parentChildEdges, input.generationsUp)
      .map((node): InLawPersonItem | null => {
        const person = input.personsMap.get(node.personId);
        if (!person) return null;

        const generation = -node.generation;
        const relationLabel = branchAncestorLabel({
          branch,
          generation,
          person,
          owner: input.owner,
        });

        const item = {
          person,
          generation,
          side: input.owner,
          branch,
          relationLabel,
          addressHint: "",
        } satisfies InLawPersonItem;

        return {
          ...item,
          addressHint: addressHint(item),
        };
      })
      .filter((item): item is InLawPersonItem => Boolean(item));
  };

  return {
    paternal: makeItems(fatherId, "paternal"),
    maternal: makeItems(motherId, "maternal"),
    warnings,
  };
}

function createLineageRows(
  generationsUp: number,
  generationsDown: number,
  paternal: LineagePersonItem[],
  center: LineagePersonItem[],
  maternal: LineagePersonItem[],
): LineageGenerationRow[] {
  const rows: LineageGenerationRow[] = [];

  for (let generation = -generationsUp; generation <= generationsDown; generation += 1) {
    rows.push({
      generation,
      label: generationLabel(generation),
      paternal: sortPersons(paternal.filter((item) => item.generation === generation)),
      center: sortPersons(center.filter((item) => item.generation === generation)),
      maternal: sortPersons(maternal.filter((item) => item.generation === generation)),
    });
  }

  return rows;
}

function createInLawRows(
  generationsUp: number,
  generationsDown: number,
  rootPaternal: InLawPersonItem[],
  rootMaternal: InLawPersonItem[],
  couple: InLawPersonItem[],
  spousePaternal: InLawPersonItem[],
  spouseMaternal: InLawPersonItem[],
): InLawGenerationRow[] {
  const rows: InLawGenerationRow[] = [];

  for (let generation = -generationsUp; generation <= generationsDown; generation += 1) {
    rows.push({
      generation,
      label: generationLabel(generation),
      rootPaternal: sortPersons(rootPaternal.filter((item) => item.generation === generation)),
      rootMaternal: sortPersons(rootMaternal.filter((item) => item.generation === generation)),
      couple: sortPersons(couple.filter((item) => item.generation === generation)),
      spousePaternal: sortPersons(spousePaternal.filter((item) => item.generation === generation)),
      spouseMaternal: sortPersons(spouseMaternal.filter((item) => item.generation === generation)),
    });
  }

  return rows;
}

function collectCommonDescendants(input: {
  rootId: string;
  spouseId: string;
  parentChildEdges: ParentChildEdge[];
  families: FamilyRow[];
  familyParents: FamilyParentRow[];
  familyChildren: FamilyChildRow[];
  personsMap: Map<string, Person>;
  maxDepth: number;
}): InLawPersonItem[] {
  const directCommonChildren = new Set<string>();
  const activeFamilyIds = new Set(
    input.families.filter((family) => !family.deleted_at).map((family) => family.id),
  );

  for (const family of input.families) {
    if (family.deleted_at) continue;

    const parents = input.familyParents
      .filter((parent) => parent.family_id === family.id)
      .map((parent) => parent.person_id);

    if (!parents.includes(input.rootId) || !parents.includes(input.spouseId)) continue;

    for (const child of input.familyChildren.filter((row) => row.family_id === family.id)) {
      directCommonChildren.add(child.person_id);
    }
  }

  if (directCommonChildren.size === 0) {
    const rootChildren = new Set(
      input.parentChildEdges
        .filter((edge) => edge.parentId === input.rootId)
        .map((edge) => edge.childId),
    );
    const spouseChildren = new Set(
      input.parentChildEdges
        .filter((edge) => edge.parentId === input.spouseId)
        .map((edge) => edge.childId),
    );

    for (const childId of rootChildren) {
      if (spouseChildren.has(childId)) directCommonChildren.add(childId);
    }
  }

  const out = new Map<string, InLawPersonItem>();
  const queue = Array.from(directCommonChildren).map((personId) => ({ personId, generation: 1 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (visited.has(current.personId)) continue;
    if (current.generation > input.maxDepth) continue;

    visited.add(current.personId);
    const person = input.personsMap.get(current.personId);

    if (person) {
      const relationLabel = descendantLabel(current.generation);
      const item = {
        person,
        generation: current.generation,
        side: "center",
        branch: "descendant",
        relationLabel,
        addressHint: "",
      } satisfies InLawPersonItem;

      out.set(current.personId, {
        ...item,
        addressHint: addressHint(item),
      });
    }

    if (current.generation >= input.maxDepth) continue;

    const childIds = input.parentChildEdges
      .filter((edge) => edge.parentId === current.personId)
      .map((edge) => edge.childId);

    for (const childId of childIds) {
      queue.push({ personId: childId, generation: current.generation + 1 });
    }
  }

  return sortPersons(Array.from(out.values()));
}

function collectAncestors(
  startPersonId: string,
  parentChildEdges: ParentChildEdge[],
  maxDepth: number,
): CollectedPerson[] {
  const out: CollectedPerson[] = [];
  const queue: CollectedPerson[] = [{ personId: startPersonId, generation: 1 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (visited.has(current.personId)) continue;
    if (current.generation > maxDepth) continue;

    visited.add(current.personId);
    out.push(current);

    const parentIds = parentChildEdges
      .filter((edge) => edge.childId === current.personId)
      .map((edge) => edge.parentId);

    for (const parentId of parentIds) {
      queue.push({ personId: parentId, generation: current.generation + 1 });
    }
  }

  return out;
}

function collectDescendants(
  startPersonId: string,
  parentChildEdges: ParentChildEdge[],
  maxDepth: number,
): CollectedPerson[] {
  const out: CollectedPerson[] = [];
  const queue: CollectedPerson[] = [{ personId: startPersonId, generation: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (visited.has(current.personId)) continue;

    visited.add(current.personId);

    if (current.generation > 0 && current.generation <= maxDepth) {
      out.push(current);
    }

    if (current.generation >= maxDepth) continue;

    const childIds = parentChildEdges
      .filter((edge) => edge.parentId === current.personId)
      .map((edge) => edge.childId);

    for (const childId of childIds) {
      queue.push({ personId: childId, generation: current.generation + 1 });
    }
  }

  return out;
}

function getDirectParents(
  personId: string,
  parentChildEdges: ParentChildEdge[],
  personsMap: Map<string, Person>,
): { fatherId: string | null; motherId: string | null } {
  const parentIds = parentChildEdges
    .filter((edge) => edge.childId === personId)
    .map((edge) => edge.parentId)
    .filter((id) => personsMap.has(id));

  const fatherId =
    parentIds.find((id) => personsMap.get(id)?.gender === "male") ?? parentIds[0] ?? null;
  const motherId =
    parentIds.find((id) => personsMap.get(id)?.gender === "female") ??
    parentIds.find((id) => id !== fatherId) ??
    null;

  return { fatherId, motherId };
}

function getSpouses(
  personId: string,
  spouseEdges: SpouseEdge[],
  personsMap: Map<string, Person>,
): Person[] {
  const spouseIds = new Set<string>();

  for (const edge of spouseEdges) {
    if (edge.personA === personId) spouseIds.add(edge.personB);
    if (edge.personB === personId) spouseIds.add(edge.personA);
  }

  return Array.from(spouseIds)
    .map((id) => personsMap.get(id))
    .filter((person): person is Person => Boolean(person))
    .sort((a, b) => getPersonName(a).localeCompare(getPersonName(b), "vi"));
}

function buildParentChildEdges(input: {
  relationships?: Relationship[];
  families?: FamilyRow[];
  familyParents?: FamilyParentRow[];
  familyChildren?: FamilyChildRow[];
}): ParentChildEdge[] {
  const out: ParentChildEdge[] = [];
  const activeFamilyIds = new Set(
    (input.families ?? [])
      .filter((family) => !family.deleted_at)
      .map((family) => family.id),
  );

  const parentsByFamily = new Map<string, string[]>();

  for (const parent of input.familyParents ?? []) {
    if (activeFamilyIds.size > 0 && !activeFamilyIds.has(parent.family_id)) continue;
    const arr = parentsByFamily.get(parent.family_id) ?? [];
    arr.push(parent.person_id);
    parentsByFamily.set(parent.family_id, arr);
  }

  for (const child of input.familyChildren ?? []) {
    if (activeFamilyIds.size > 0 && !activeFamilyIds.has(child.family_id)) continue;
    const parents = parentsByFamily.get(child.family_id) ?? [];
    for (const parentId of parents) {
      out.push({ parentId, childId: child.person_id });
    }
  }

  for (const rel of input.relationships ?? []) {
    if (rel.type !== "biological_child" && rel.type !== "adopted_child") continue;
    out.push({ parentId: rel.person_a, childId: rel.person_b });
  }

  return dedupeParentChildEdges(out);
}

function buildSpouseEdges(input: {
  relationships?: Relationship[];
  families?: FamilyRow[];
  familyParents?: FamilyParentRow[];
}): SpouseEdge[] {
  const out: SpouseEdge[] = [];
  const activeCurrentFamilyIds = new Set(
    (input.families ?? [])
      .filter((family) => !family.deleted_at)
      .filter((family) => family.status !== "divorced" && family.status !== "separated")
      .map((family) => family.id),
  );

  const parentsByFamily = new Map<string, string[]>();

  for (const parent of input.familyParents ?? []) {
    if (activeCurrentFamilyIds.size > 0 && !activeCurrentFamilyIds.has(parent.family_id)) continue;
    const arr = parentsByFamily.get(parent.family_id) ?? [];
    arr.push(parent.person_id);
    parentsByFamily.set(parent.family_id, arr);
  }

  for (const parentIds of parentsByFamily.values()) {
    for (let i = 0; i < parentIds.length; i += 1) {
      for (let j = i + 1; j < parentIds.length; j += 1) {
        out.push({ personA: parentIds[i], personB: parentIds[j] });
      }
    }
  }

  for (const rel of input.relationships ?? []) {
    if (rel.type !== "marriage") continue;
    if (rel.status === "divorced" || rel.status === "separated") continue;
    out.push({ personA: rel.person_a, personB: rel.person_b });
  }

  return dedupeSpouseEdges(out);
}

function dedupeParentChildEdges(edges: ParentChildEdge[]): ParentChildEdge[] {
  const seen = new Set<string>();
  const out: ParentChildEdge[] = [];

  for (const edge of edges) {
    const key = `${edge.parentId}->${edge.childId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }

  return out;
}

function dedupeSpouseEdges(edges: SpouseEdge[]): SpouseEdge[] {
  const seen = new Set<string>();
  const out: SpouseEdge[] = [];

  for (const edge of edges) {
    const key = [edge.personA, edge.personB].sort().join("<->");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }

  return out;
}
