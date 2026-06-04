import { describe, expect, it } from "vitest";
import { buildEmptyFamilyRows } from "@/services/data-maintenance/emptyFamilies.service";

describe("empty families maintenance", () => {
  it("finds active families without parents and children", () => {
    const rows = buildEmptyFamilyRows({
      families: [
        {
          id: "f1",
          status: "active",
          created_at: "2026-06-03T10:00:00Z",
          deleted_at: null,
        },
        {
          id: "f2",
          status: "active",
          created_at: "2026-06-03T11:00:00Z",
          deleted_at: null,
        },
      ],
      familyParents: [{ family_id: "f2" }],
      familyChildren: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("f1");
  });

  it("ignores deleted families", () => {
    const rows = buildEmptyFamilyRows({
      families: [
        {
          id: "f1",
          status: "active",
          deleted_at: "2026-06-04T00:00:00Z",
        },
      ],
      familyParents: [],
      familyChildren: [],
    });

    expect(rows).toHaveLength(0);
  });

  it("ignores families with children", () => {
    const rows = buildEmptyFamilyRows({
      families: [
        {
          id: "f1",
          status: "active",
          deleted_at: null,
        },
      ],
      familyParents: [],
      familyChildren: [{ family_id: "f1" }],
    });

    expect(rows).toHaveLength(0);
  });
});
