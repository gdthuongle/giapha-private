"use client";

import { Person, Relationship } from "@/types";
import { useMemo } from "react";
import {
  buildVietnameseFamilyLayout,
  type VietnameseTreeFamily,
} from "@/utils/tree/vietnameseTreeLayout";

type VietnameseFamilyTreeProps = {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
};

export default function VietnameseFamilyTree({
  personsMap,
  relationships,
  roots,
}: VietnameseFamilyTreeProps) {
  const family = useMemo(() => {
    const root = roots[0];
    if (!root) return null;

    const spouseRels = relationships.filter(
      (rel) =>
        rel.type === "marriage" &&
        (rel.person_a === root.id || rel.person_b === root.id),
    );

    const spouseIds = spouseRels.map((rel) =>
      rel.person_a === root.id ? rel.person_b : rel.person_a,
    );

    const childIds = relationships
      .filter(
        (rel) =>
          (rel.type === "biological_child" || rel.type === "adopted_child") &&
          rel.person_a === root.id,
      )
      .map((rel) => rel.person_b);

    const parents = [
      {
        role: root.gender === "female" ? "wife" : "husband",
        person: root,
      },
      ...spouseIds
        .map((id) => personsMap.get(id))
        .filter(Boolean)
        .map((person) => ({
          role: person!.gender === "female" ? "wife" : "husband",
          person: person!,
        })),
    ];

    const children = childIds
      .map((id) => personsMap.get(id))
      .filter(Boolean) as Person[];

    return {
      familyId: root.id,
      parents,
      children,
    } satisfies VietnameseTreeFamily;
  }, [personsMap, relationships, roots]);

  const layout = useMemo(() => {
    if (!family) return null;
    return buildVietnameseFamilyLayout(family);
  }, [family]);

  if (!layout) {
    return (
      <div className="p-10 text-center text-stone-500">
        Không tìm thấy dữ liệu cây.
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-stone-50 p-8">
      <div className="inline-block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <svg
          width={layout.width + 80}
          height={layout.height + 80}
          className="bg-stone-50"
        >
          <g transform="translate(40, 40)">
            {layout.lines.map((line) => (
              <line
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#a8a29e"
                strokeWidth={2}
              />
            ))}

            {layout.nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <rect
                  width={180}
                  height={72}
                  rx={14}
                  fill="white"
                  stroke={node.role === "parent" ? "#d97706" : "#78716c"}
                />
                <text
                  x={90}
                  y={32}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill="#292524"
                >
                  {node.person.full_name}
                </text>
                <text
                  x={90}
                  y={52}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#78716c"
                >
                  {node.role === "parent" ? "Cha/Mẹ" : "Con"}
                  {node.person.birth_year ? ` · ${node.person.birth_year}` : ""}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
