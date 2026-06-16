export interface KinshipPersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

export interface KinshipRelationshipEdge {
  type: string;
  person_a: string;
  person_b: string;
}

export interface KinshipResult {
  aCallsB: string;
  bCallsA: string;
  description: string;
  pathLabels: string[];
}

type Step = "parent" | "child" | "spouse";

interface DirectedEdge {
  to: string;
  step: Step;
}

interface PathNode {
  id: string;
  steps: Step[];
  personIds: string[];
}

function southernBirthOrderLabel(order?: number | null): string | null {
  if (order == null || !Number.isFinite(order) || order <= 0) return null;

  const labels = [
    "Hai",
    "Ba",
    "Tư",
    "Năm",
    "Sáu",
    "Bảy",
    "Tám",
    "Chín",
    "Mười",
    "Mười Một",
    "Mười Hai",
    "Mười Ba",
  ];

  return labels[order - 1] ?? `thứ ${order + 1}`;
}

function personName(person?: KinshipPersonNode | null): string {
  if (!person) return "người này";
  const order = southernBirthOrderLabel(person.birth_order);
  return order ? `${person.full_name} (thứ ${order})` : person.full_name;
}

function lineageSideFromRootParent(rootParent?: KinshipPersonNode | null): "nội" | "ngoại" | null {
  if (!rootParent) return null;
  return rootParent.gender === "female" ? "ngoại" : "nội";
}

function appendLineageSide(term: string, side: "nội" | "ngoại" | null): string {
  return side ? `${term} bên ${side}` : term;
}

function genderParentTerm(person?: KinshipPersonNode | null): string {
  if (person?.gender === "female") return "mẹ";
  if (person?.gender === "male") return "cha";
  return "cha/mẹ";
}

function genderChildTerm(person?: KinshipPersonNode | null): string {
  if (person?.gender === "female") return "con gái";
  if (person?.gender === "male") return "con trai";
  return "con";
}

function siblingTerm(target?: KinshipPersonNode | null, reference?: KinshipPersonNode | null): string {
  const gender = target?.gender;
  const older = isOlder(target, reference);

  if (gender === "male") return older === true ? "anh" : older === false ? "em trai" : "anh/em trai";
  if (gender === "female") return older === true ? "chị" : older === false ? "em gái" : "chị/em gái";
  return older === true ? "anh/chị" : older === false ? "em" : "anh/chị/em";
}

function isOlder(a?: KinshipPersonNode | null, b?: KinshipPersonNode | null): boolean | null {
  if (!a || !b) return null;

  // Vai vế gia phả ưu tiên thứ tự sinh trong cùng gia đình. Ngày/năm sinh chỉ là
  // fallback khi chưa nhập thứ tự sinh. Điều này xử lý đúng trường hợp người nhỏ
  // tuổi hơn nhưng thuộc nhánh bác/cậu/dì lớn hơn.
  if (a.birth_order != null && b.birth_order != null && a.birth_order !== b.birth_order) {
    return a.birth_order < b.birth_order;
  }

  if (a.birth_year != null && b.birth_year != null && a.birth_year !== b.birth_year) {
    return a.birth_year < b.birth_year;
  }

  return null;
}

function normalizeTerm(value: string): string {
  return value
    .toLocaleLowerCase("vi")
    .replace(/[·,:;().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sideOfSpouse(root?: KinshipPersonNode | null): "vợ" | "chồng" | "vợ/chồng" {
  if (root?.gender === "male") return "vợ";
  if (root?.gender === "female") return "chồng";
  return "vợ/chồng";
}

function parentInLawTerm(target?: KinshipPersonNode | null, root?: KinshipPersonNode | null): string {
  const side = sideOfSpouse(root);
  if (target?.gender === "male") return side === "vợ" ? "cha vợ" : side === "chồng" ? "cha chồng" : "cha vợ/chồng";
  if (target?.gender === "female") return side === "vợ" ? "mẹ vợ" : side === "chồng" ? "mẹ chồng" : "mẹ vợ/chồng";
  return side === "vợ" ? "cha/mẹ vợ" : side === "chồng" ? "cha/mẹ chồng" : "cha/mẹ vợ/chồng";
}

function spouseSiblingInLawTerm(input: {
  target?: KinshipPersonNode | null;
  spouse?: KinshipPersonNode | null;
  root?: KinshipPersonNode | null;
}): string {
  const { target, spouse, root } = input;
  const side = sideOfSpouse(root);
  const older = isOlder(target, spouse);
  const prefix = target?.gender === "female"
    ? older === true ? "chị" : older === false ? "em" : "chị/em"
    : target?.gender === "male"
      ? older === true ? "anh" : older === false ? "em" : "anh/em"
      : older === true ? "anh/chị" : older === false ? "em" : "anh/chị/em";

  if (side === "vợ") return `${prefix} vợ`;
  if (side === "chồng") return `${prefix} chồng`;
  return `${prefix} vợ/chồng`;
}

function childSpouseParentTerm(target?: KinshipPersonNode | null): string {
  if (target?.gender === "male") return "ông sui";
  if (target?.gender === "female") return "bà sui";
  return "sui gia";
}


function directAncestorTerm(steps: Step[], people: KinshipPersonNode[]): string | null {
  if (!steps.every((step) => step === "parent")) return null;

  const depth = steps.length;
  const firstParent = people[1];
  const target = people[depth];
  const side = lineageSideFromRootParent(firstParent);

  if (depth === 1) return genderParentTerm(target);

  if (depth === 2) {
    if (side === "ngoại") return target?.gender === "female" ? "bà ngoại" : "ông ngoại";
    return target?.gender === "female" ? "bà nội" : "ông nội";
  }

  if (depth === 3) {
    const base = target?.gender === "female" ? "bà cố" : target?.gender === "male" ? "ông cố" : "ông/bà cố";
    return appendLineageSide(base, side);
  }

  if (depth === 4) {
    const base = target?.gender === "female" ? "bà sơ" : target?.gender === "male" ? "ông sơ" : "ông/bà sơ";
    return appendLineageSide(base, side);
  }

  return appendLineageSide(`tổ đời trên ${depth}`, side);
}

function directDescendantTerm(steps: Step[], people: KinshipPersonNode[]): string | null {
  if (!steps.every((step) => step === "child")) return null;

  const depth = steps.length;
  const firstChild = people[1];
  const target = people[people.length - 1];

  if (depth === 1) return genderChildTerm(target);
  if (depth === 2) {
    if (firstChild?.gender === "male") return "cháu nội";
    if (firstChild?.gender === "female") return "cháu ngoại";
    return "cháu";
  }
  if (depth === 3) return "chắt";
  if (depth === 4) return "chút";
  if (depth === 5) return "chít";
  return `hậu duệ đời ${depth}`;
}

function parentSiblingTerm(input: {
  target?: KinshipPersonNode | null;
  parent?: KinshipPersonNode | null;
  sideParent?: KinshipPersonNode | null;
}): string {
  const { target, parent, sideParent } = input;
  const older = isOlder(target, parent);
  const side = sideParent?.gender === "female" ? "ngoại" : "nội";

  if (side === "ngoại") {
    // Theo cách gọi phổ biến ở Nam Bộ/Vietnamese family context: bên ngoại nam cùng hàng
    // cha/mẹ gọi chung là cậu, không tách chú/bác ngoại. Nữ bên ngoại gọi là dì.
    if (target?.gender === "male") return "cậu";
    if (target?.gender === "female") return "dì";
    return "cậu/dì";
  }

  if (target?.gender === "male") return older === true ? "bác" : "chú";
  if (target?.gender === "female") return "cô";
  return "bác/chú/cô";
}

function grandparentSiblingTerm(input: {
  target?: KinshipPersonNode | null;
  grandparent?: KinshipPersonNode | null;
  rootParent?: KinshipPersonNode | null;
  grandparentSideParent?: KinshipPersonNode | null;
}): string {
  const { target, grandparent, rootParent, grandparentSideParent } = input;
  const older = isOlder(target, grandparent);
  const isMaternalSide = rootParent?.gender === "female";
  const side = isMaternalSide ? "ngoại" : "nội";
  const grandparentGender = grandparent?.gender;

  if (side === "ngoại") {
    // Bên ngoại không dùng chú/bác ngoại làm cách gọi ưu tiên.
    if (target?.gender === "male") return "ông cậu ngoại";
    if (target?.gender === "female") return "bà dì ngoại";
    return "ông cậu/bà dì ngoại";
  }

  if (older === true) {
    if (target?.gender === "male") return "ông bác nội";
    if (target?.gender === "female") return "bà cô nội";
    return "ông/bà bác nội";
  }

  if (grandparentGender === "female") {
    if (target?.gender === "male") return "ông cậu nội";
    if (target?.gender === "female") return "bà dì nội";
    return "ông cậu/bà dì nội";
  }

  if (target?.gender === "male") return "ông chú nội";
  if (target?.gender === "female") return "bà cô nội";
  return "ông chú/bà cô nội";
}

function childOfParentSiblingTerm(input: { target?: KinshipPersonNode | null; parentSibling?: KinshipPersonNode | null }): string {
  const { target, parentSibling } = input;
  if (target?.gender === "male") return parentSibling?.gender === "female" ? "anh/em con dì/cô" : "anh/em con bác/chú/cậu";
  if (target?.gender === "female") return parentSibling?.gender === "female" ? "chị/em con dì/cô" : "chị/em con bác/chú/cậu";
  return "anh/chị/em họ";
}

function sameGenerationCollateralTerm(input: {
  target?: KinshipPersonNode | null;
  rootBranch?: KinshipPersonNode | null;
  targetBranch?: KinshipPersonNode | null;
  rootParent?: KinshipPersonNode | null;
  degree?: number;
}): string {
  const { target, rootBranch, targetBranch, rootParent, degree = 1 } = input;
  const targetBranchOlder = isOlder(targetBranch, rootBranch);
  const side = lineageSideFromRootParent(rootParent ?? rootBranch);
  const cousinTerm = degree >= 2 ? "họ xa" : "họ";

  if (target?.gender === "male") {
    if (targetBranchOlder === true) return appendLineageSide(`anh ${cousinTerm}`, side);
    if (targetBranchOlder === false) return appendLineageSide(`em trai ${cousinTerm}`, side);
    return appendLineageSide(`anh/em ${cousinTerm}`, side);
  }

  if (target?.gender === "female") {
    if (targetBranchOlder === true) return appendLineageSide(`chị ${cousinTerm}`, side);
    if (targetBranchOlder === false) return appendLineageSide(`em gái ${cousinTerm}`, side);
    return appendLineageSide(`chị/em ${cousinTerm}`, side);
  }

  if (targetBranchOlder === true) return appendLineageSide(`anh/chị ${cousinTerm}`, side);
  if (targetBranchOlder === false) return appendLineageSide(`em ${cousinTerm}`, side);
  return appendLineageSide(`anh/chị/em ${cousinTerm}`, side);
}

function ancestorSiblingByDepthTerm(input: {
  target?: KinshipPersonNode | null;
  ancestorSiblingOf?: KinshipPersonNode | null;
  rootParent?: KinshipPersonNode | null;
  depth: number;
}): string {
  const { target, ancestorSiblingOf, rootParent, depth } = input;

  if (depth === 1) {
    return parentSiblingTerm({
      target,
      parent: ancestorSiblingOf,
      sideParent: rootParent,
    });
  }

  if (depth === 2) {
    return grandparentSiblingTerm({
      target,
      grandparent: ancestorSiblingOf,
      rootParent,
    });
  }

  const side = rootParent?.gender === "female" ? "ngoại" : "nội";
  const prefix = depth === 3 ? "cụ" : `đời trên ${depth}`;
  if (target?.gender === "male") return `${prefix} ông ${side}`;
  if (target?.gender === "female") return `${prefix} bà ${side}`;
  return `${prefix} bên ${side}`;
}

function descendantCollateralTerm(_depth: number): string {
  // Với nhánh bàng hệ, cách gọi thông dụng vẫn là “cháu” dù thấp hơn nhiều đời
  // so với người đang gọi. Direct descendant đã được xử lý riêng ở directDescendantTerm().
  return "cháu";
}

function genericCollateralTerm(steps: Step[], people: KinshipPersonNode[]): string | null {
  if (steps.length < 2) return null;

  let up = 0;
  while (up < steps.length && steps[up] === "parent") up += 1;
  let down = 0;
  while (up + down < steps.length && steps[up + down] === "child") down += 1;

  if (up === 0 || down === 0 || up + down !== steps.length) return null;

  const target = people[people.length - 1];
  const rootParent = people[1];

  // Target is an anh/chị/em of an ancestor of the root.
  // Examples:
  // parent -> parent -> child = sibling of parent: bác/cậu/dì/chú/cô.
  // parent -> parent -> parent -> child = sibling of grandparent: ông cậu ngoại, bà dì ngoại...
  if (down === 1 && up >= 2) {
    return ancestorSiblingByDepthTerm({
      target,
      ancestorSiblingOf: people[up - 1],
      rootParent,
      depth: up - 1,
    });
  }

  // Same generation collateral relatives: compare seniority by the branch directly under
  // the common ancestor, not by the person record itself. This matches Vietnamese vai vế:
  // con của anh/chị cha mẹ thường là anh/chị họ, con của em cha mẹ là em họ.
  if (up === down && up >= 2) {
    return sameGenerationCollateralTerm({
      target,
      rootBranch: people[up - 1],
      targetBranch: people[up + 1],
      rootParent,
      degree: up - 1,
    });
  }

  // Target is in an upper generation but not a direct sibling of the root's ancestor,
  // for example child of ông/bà's sibling. Keep a useful Vietnamese term instead of
  // falling back to “họ hàng cùng nhánh”.
  if (up > down) {
    const generationAbove = up - down;
    if (generationAbove === 1) {
      const side = rootParent?.gender === "female" ? "ngoại" : "nội";
      if (side === "ngoại") {
        if (target?.gender === "male") return "cậu";
        if (target?.gender === "female") return "dì";
        return "cậu/dì";
      }

      const ancestorBranch = people[up - 1];
      const targetBranch = people[up + 1];
      const targetBranchOlder = isOlder(targetBranch, ancestorBranch);
      if (target?.gender === "male") return targetBranchOlder === true ? "bác" : "chú";
      if (target?.gender === "female") return "cô";
      return "bác/chú/cô";
    }
    if (generationAbove === 2) {
      const side = rootParent?.gender === "female" ? "ngoại" : "nội";
      if (target?.gender === "male") return `ông họ ${side}`;
      if (target?.gender === "female") return `bà họ ${side}`;
      return `họ hàng hàng ông bà bên ${side}`;
    }
    return `họ hàng đời trên ${generationAbove}`;
  }

  // Target is in a lower generation collateral branch.
  return descendantCollateralTerm(down - up);
}


function spouseOfKinshipTerm(baseTerm: string, spouse?: KinshipPersonNode | null): string | null {
  const base = normalizeTerm(baseTerm);
  const spouseGender = spouse?.gender;

  if (spouseGender === "female") {
    if (base.includes("ông chú")) return "bà thím";
    if (base.includes("ông cậu")) return "bà mợ";
    if (base === "chú" || base.includes(" chú") || base.includes("chú ")) return "thím";
    if (base === "cậu" || base.includes(" cậu") || base.includes("cậu ")) return "mợ";

    if (base === "anh" || base === "anh họ" || base.startsWith("anh ")) return "chị dâu";
    if (base === "em trai" || base === "em trai họ" || base === "em họ" || base.includes("em trai") || base.includes("em họ")) return "em dâu";
    if (base.includes("anh/em") || base.includes("anh chị em")) return "chị/em dâu";

    if (base === "con trai") return "con dâu";
    if (base === "cháu" || base.includes("cháu trai") || base.includes("cháu")) return "cháu dâu";
  }

  if (spouseGender === "male") {
    if (base.includes("bà cô")) return "ông dượng";
    if (base.includes("bà dì")) return "ông dượng";
    if (base === "cô" || base.includes(" cô") || base.includes("cô ")) return "dượng";
    if (base === "dì" || base.includes(" dì") || base.includes("dì ")) return "dượng";

    if (base === "chị" || base === "chị họ" || base.startsWith("chị ")) return "anh rể";
    if (base === "em gái" || base === "em gái họ" || base === "em họ" || base.includes("em gái") || base.includes("em họ")) return "em rể";
    if (base.includes("chị/em") || base.includes("anh chị em")) return "anh/em rể";

    if (base === "con gái") return "con rể";
    if (base === "cháu" || base.includes("cháu gái") || base.includes("cháu")) return "cháu rể";
  }

  return null;
}

function termFromPath(steps: Step[], people: KinshipPersonNode[]): string {
  const root = people[0];
  const target = people[people.length - 1];

  if (steps.length === 0) return "bản thân";
  if (steps.length === 1 && steps[0] === "spouse") return target?.gender === "female" ? "vợ" : target?.gender === "male" ? "chồng" : "vợ/chồng";

  // Sui gia / in-law patterns should be resolved before generic collateral fallback.
  // root -> spouse -> parent = cha/mẹ vợ/chồng.
  if (steps.length === 2 && steps[0] === "spouse" && steps[1] === "parent") {
    return parentInLawTerm(target, root);
  }

  // root -> spouse -> parent -> child = anh/chị/em vợ/chồng.
  if (steps.length === 3 && steps[0] === "spouse" && steps[1] === "parent" && steps[2] === "child") {
    return spouseSiblingInLawTerm({ target, spouse: people[1], root });
  }

  // root -> child -> spouse -> parent = ông/bà sui.
  if (steps.length === 3 && steps[0] === "child" && steps[1] === "spouse" && steps[2] === "parent") {
    return childSpouseParentTerm(target);
  }

  // Spouse of a known relation: map to Vietnamese affinal terms before trying
  // collateral patterns, otherwise paths ending in spouse can be lost to generic labels.
  if (steps[steps.length - 1] === "spouse") {
    const base = termFromPath(steps.slice(0, -1), people.slice(0, -1));
    const mapped = spouseOfKinshipTerm(base, target);
    if (mapped) return mapped;
    if (target?.gender === "female") return `vợ của ${base}`;
    if (target?.gender === "male") return `chồng của ${base}`;
    return `vợ/chồng của ${base}`;
  }

  const ancestor = directAncestorTerm(steps, people);
  if (ancestor) return ancestor;

  const descendant = directDescendantTerm(steps, people);
  if (descendant) return descendant;

  // sibling: up parent, down child.
  if (steps.length === 2 && steps[0] === "parent" && steps[1] === "child") {
    return siblingTerm(target, people[0]);
  }

  // sibling of parent: up to grandparent, down to parent's sibling.
  if (steps.length === 3 && steps[0] === "parent" && steps[1] === "parent" && steps[2] === "child") {
    return parentSiblingTerm({ target, parent: people[1], sideParent: people[1] });
  }

  // sibling of grandparent: parent -> grandparent -> great-grandparent -> sibling of grandparent.
  if (
    steps.length === 4 &&
    steps[0] === "parent" &&
    steps[1] === "parent" &&
    steps[2] === "parent" &&
    steps[3] === "child"
  ) {
    return grandparentSiblingTerm({
      target,
      grandparent: people[2],
      rootParent: people[1],
      grandparentSideParent: people[3],
    });
  }

  // cousin: parent -> grandparent -> down to aunt/uncle -> down to cousin.
  if (
    steps.length === 4 &&
    steps[0] === "parent" &&
    steps[1] === "parent" &&
    steps[2] === "child" &&
    steps[3] === "child"
  ) {
    const branchBased = sameGenerationCollateralTerm({
      target,
      rootBranch: people[1],
      targetBranch: people[3],
      rootParent: people[1],
      degree: 1,
    });
    return branchBased || childOfParentSiblingTerm({ target, parentSibling: people[3] });
  }

  const collateral = genericCollateralTerm(steps, people);
  if (collateral) return collateral;

  // Other inverse spouse relations not covered above.
  if (steps[0] === "spouse") {
    const base = termFromPath(steps.slice(1), people.slice(1));
    return `${base} bên ${sideOfSpouse(root)}`;
  }

  if (steps.filter((step) => step === "parent").length > 0 && steps.filter((step) => step === "child").length > 0) {
    return "họ hàng cùng nhánh";
  }

  return "chưa xác định";
}

function buildGraph(relationships: KinshipRelationshipEdge[]): Map<string, DirectedEdge[]> {
  const graph = new Map<string, DirectedEdge[]>();

  const push = (from: string, edge: DirectedEdge) => {
    const list = graph.get(from) ?? [];
    list.push(edge);
    graph.set(from, list);
  };

  for (const rel of relationships) {
    if (rel.type === "biological_child" || rel.type === "adopted_child") {
      push(rel.person_b, { to: rel.person_a, step: "parent" });
      push(rel.person_a, { to: rel.person_b, step: "child" });
      continue;
    }

    if (rel.type === "marriage") {
      push(rel.person_a, { to: rel.person_b, step: "spouse" });
      push(rel.person_b, { to: rel.person_a, step: "spouse" });
    }
  }

  return graph;
}

function findShortestPath(
  fromId: string,
  toId: string,
  relationships: KinshipRelationshipEdge[],
): PathNode | null {
  if (fromId === toId) return { id: fromId, steps: [], personIds: [fromId] };

  const graph = buildGraph(relationships);
  const queue: Array<PathNode & { score: number; spouseCount: number }> = [
    { id: fromId, steps: [], personIds: [fromId], score: 0, spouseCount: 0 },
  ];
  const best = new Map<string, number>([[fromId, 0]]);

  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.spouseCount !== b.spouseCount) return a.spouseCount - b.spouseCount;
      return a.steps.length - b.steps.length;
    });

    const current = queue.shift();
    if (!current) continue;
    if (current.id === toId) {
      return { id: current.id, steps: current.steps, personIds: current.personIds };
    }
    if (current.steps.length >= 10) continue;

    for (const edge of graph.get(current.id) ?? []) {
      if (current.personIds.includes(edge.to)) continue;

      // Prefer blood-line paths over spouse shortcuts. A spouse edge is still allowed,
      // but it has higher weight so “ông cậu/cháu” does not get hidden behind
      // a shorter in-law path when both paths exist.
      const edgeWeight = edge.step === "spouse" ? 4 : 1;
      const nextScore = current.score + edgeWeight;
      const known = best.get(edge.to);
      if (known != null && known <= nextScore) continue;

      best.set(edge.to, nextScore);
      queue.push({
        id: edge.to,
        steps: [...current.steps, edge.step],
        personIds: [...current.personIds, edge.to],
        score: nextScore,
        spouseCount: current.spouseCount + (edge.step === "spouse" ? 1 : 0),
      });
    }
  }

  return null;
}

function stepLabel(step: Step, from?: KinshipPersonNode | null, to?: KinshipPersonNode | null): string {
  if (step === "parent") return `${personName(from)} → ${genderParentTerm(to)}: ${personName(to)}`;
  if (step === "child") return `${personName(from)} → ${genderChildTerm(to)}: ${personName(to)}`;
  return `${personName(from)} → vợ/chồng: ${personName(to)}`;
}

function labelsForPath(path: PathNode, personsById: Map<string, KinshipPersonNode>): string[] {
  return path.steps.map((step, index) => {
    const from = personsById.get(path.personIds[index]);
    const to = personsById.get(path.personIds[index + 1]);
    return stepLabel(step, from, to);
  });
}

export function computeKinship(
  personA: KinshipPersonNode,
  personB: KinshipPersonNode,
  persons: KinshipPersonNode[],
  relationships: KinshipRelationshipEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsById = new Map(persons.map((person) => [person.id, person]));
  const pathAB = findShortestPath(personA.id, personB.id, relationships);
  const pathBA = findShortestPath(personB.id, personA.id, relationships);

  if (!pathAB || !pathBA) {
    return {
      aCallsB: "chưa xác định",
      bCallsA: "chưa xác định",
      description: "Chưa tìm thấy đường quan hệ đủ gần trong dữ liệu hiện có.",
      pathLabels: [],
    };
  }

  const peopleAB = pathAB.personIds.map((id) => personsById.get(id)).filter(Boolean) as KinshipPersonNode[];
  const peopleBA = pathBA.personIds.map((id) => personsById.get(id)).filter(Boolean) as KinshipPersonNode[];
  const aCallsB = termFromPath(pathAB.steps, peopleAB);
  const bCallsA = termFromPath(pathBA.steps, peopleBA);

  return {
    aCallsB,
    bCallsA,
    description: `${personName(personA)} gọi ${personName(personB)} là ${aCallsB}; ${personName(personB)} gọi ${personName(personA)} là ${bCallsA}.`,
    pathLabels: labelsForPath(pathAB, personsById),
  };
}
