import { describe, it, expect } from "vitest";
import { exportToGedcom, exportToGedcomWithWarnings } from "@/utils/gedcom";

describe("GEDCOM exporter v2.3.4 Family/Event", () => {
  it("adds UTF-8 BOM and header", () => {
    const out = exportToGedcom({ persons: [], relationships: [] });
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toContain("1 CHAR UTF-8");
    expect(out).toContain("1 LANG Vietnamese");
    expect(out).toContain("\r\n");
  });

  it("exports Vietnamese name correctly", () => {
    const out = exportToGedcom({
      persons: [{ id: "p1", full_name: "Nguyễn Văn An", gender: "male" }],
      relationships: [],
    });

    expect(out).toContain("1 NAME Văn An /Nguyễn/");
    expect(out).toContain("2 SURN Nguyễn");
    expect(out).toContain("2 GIVN Văn An");
    expect(out).not.toContain("Nguyễn Văn /An/");
  });

  it("escapes @ inside text values", () => {
    const out = exportToGedcom({
      persons: [{ id: "p1", full_name: "Nguyễn @ An", gender: "male" }],
      relationships: [],
    });

    expect(out).toContain("@@");
  });

  it("wraps long Vietnamese notes under 255 bytes", () => {
    const note = "Ông Nguyễn Văn An sinh tại làng Đình Bảng, Từ Sơn, Bắc Ninh. ".repeat(12);
    const out = exportToGedcom({
      persons: [{ id: "p1", full_name: "Nguyễn Văn An", gender: "male", note }],
      relationships: [],
    });

    for (const line of out.split("\r\n").filter(Boolean)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(255);
    }
  });

  it("returns warnings for ambiguous legacy family export", () => {
    const result = exportToGedcomWithWarnings({
      persons: [
        { id: "a", full_name: "Nguyễn Văn A", gender: "male" },
        { id: "b", full_name: "Trần Thị B", gender: "female" },
        { id: "d", full_name: "Lê Thị D", gender: "female" },
        { id: "c", full_name: "Nguyễn Văn C", gender: "male" },
      ],
      relationships: [
        { type: "marriage", person_a: "a", person_b: "b" },
        { type: "marriage", person_a: "a", person_b: "d" },
        { type: "biological_child", person_a: "a", person_b: "c" },
      ],
    });

    expect(result.content).toContain("0 HEAD");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("exports FAM from Family Model when available", () => {
    const result = exportToGedcomWithWarnings({
      persons: [
        { id: "father", full_name: "Nguyễn Văn Cha", gender: "male" },
        { id: "mother", full_name: "Trần Thị Mẹ", gender: "female" },
        { id: "child", full_name: "Nguyễn Văn Con", gender: "male" },
      ],
      relationships: [],
      families: [{ id: "fam-1", status: "active" }],
      family_parents: [
        { family_id: "fam-1", person_id: "father", role: "husband" },
        { family_id: "fam-1", person_id: "mother", role: "wife" },
      ],
      family_children: [{ family_id: "fam-1", person_id: "child" }],
    });

    expect(result.content).toContain("0 @Ffam1@ FAM");
    expect(result.content).toContain("1 HUSB @father@");
    expect(result.content).toContain("1 WIFE @mother@");
    expect(result.content).toContain("1 CHIL @child@");
  });

  it("exports birth and death from Event Model before legacy dates", () => {
    const out = exportToGedcom({
      persons: [
        {
          id: "p1",
          full_name: "Nguyễn Văn An",
          gender: "male",
          birth_year: 1980,
          death_year: 2020,
          is_deceased: true,
        },
      ],
      relationships: [],
      events: [
        {
          id: "e1",
          type: "birth",
          start_date: "1981-03-12",
          end_date: "1981-03-12",
          sort_date: "1981-03-12",
          date_precision: "day",
          legacy_person_id: "p1",
          legacy_source: "persons.birth_*",
        },
        {
          id: "e2",
          type: "death",
          start_date: "2021-04-01",
          end_date: "2021-04-30",
          sort_date: "2021-04-15",
          date_precision: "month",
          lunar_year: 2021,
          lunar_month: 3,
          lunar_day: 20,
          legacy_person_id: "p1",
          legacy_source: "persons.death_*",
        },
      ],
      person_events: [
        { person_id: "p1", event_id: "e1", role: "principal" },
        { person_id: "p1", event_id: "e2", role: "deceased" },
      ],
    });

    expect(out).toContain("1 BIRT");
    expect(out).toContain("2 DATE 12 MAR 1981");
    expect(out).toContain("1 DEAT");
    expect(out).toContain("2 DATE APR 2021");
    expect(out).toContain("2 _GIAPHA_LUNAR 20/03/2021");
    expect(out).not.toContain("2 DATE 1980");
    expect(out).not.toContain("2 DATE 2020");
  });

  it("exports primary person_names before persons.full_name", () => {
    const out = exportToGedcom({
      persons: [{ id: "p1", full_name: "Tên Legacy", gender: "male" }],
      relationships: [],
      person_names: [
        {
          person_id: "p1",
          full_name: "Nguyễn Văn Tên Chính",
          surname: "Nguyễn",
          given_name: "Văn Tên Chính",
          is_primary: true,
        },
      ],
    });

    expect(out).toContain("1 NAME Văn Tên Chính /Nguyễn/");
    expect(out).not.toContain("1 NAME Legacy /Tên/");
  });
});

it("uses stable person id as GEDCOM INDI XREF", () => {
  const personId = "72304db3-6e08-44f5-965e-9eba363e4c31";

  const result = exportToGedcomWithWarnings({
    persons: [
      {
        id: personId,
        full_name: "Chồng Oanh",
        gender: "male",
        is_deceased: false,
      } as any,
    ],
    relationships: [],
    families: [],
    familyParents: [],
    familyChildren: [],
    events: [],
    personEvents: [],
    personNames: [],
  } as any);

  expect(result.content).toContain(`0 @${personId}@ INDI`);
});

it("exports Vietnamese names in FamilyGem display order when requested", () => {
  const out = exportToGedcom(
    {
      persons: [
        {
          id: "p1",
          full_name: "Nguyễn Văn A",
          gender: "male",
        } as any,
      ],
      relationships: [],
      personNames: [],
      events: [],
      personEvents: [],
      families: [],
      familyParents: [],
      familyChildren: [],
    } as any,
    { nameFormat: "familygem" },
  );

  expect(out).toContain("1 NAME 2 /Nguyễn Văn A/");
  expect(out).not.toContain("2 SURN Nguyễn Văn A");
  expect(out).not.toContain("2 GIVN Văn A");
  expect(out).not.toContain("1 NAME Văn A /Nguyễn/");
});


it("exports marriage and divorce family events to GEDCOM MARR and DIV", () => {
  const out = exportToGedcom({
    persons: [
      { id: "husband", full_name: "Nguyễn Văn Chồng", gender: "male" },
      { id: "wife", full_name: "Trần Thị Vợ", gender: "female" },
    ],
    relationships: [],
    families: [{ id: "fam-1", status: "divorced" }],
    family_parents: [
      { family_id: "fam-1", person_id: "husband", role: "husband" },
      { family_id: "fam-1", person_id: "wife", role: "wife" },
    ],
    family_children: [],
    events: [
      {
        id: "marr-1",
        type: "marriage",
        family_id: "fam-1",
        start_date: "2015-07-21",
        end_date: "2015-07-21",
        sort_date: "2015-07-21",
        date_precision: "day",
      },
      {
        id: "div-1",
        type: "divorce",
        family_id: "fam-1",
        start_date: "2026-06-06",
        end_date: "2026-06-06",
        sort_date: "2026-06-06",
        date_precision: "day",
      },
    ],
    person_events: [],
  } as any);

  expect(out).toContain("1 MARR");
  expect(out).toContain("2 DATE 21 JUL 2015");
  expect(out).toContain("1 DIV");
  expect(out).toContain("2 DATE 06 JUN 2026");
});

describe("GEDCOM Event Model regression", () => {
  it("does not export death_anniversary as DEAT", () => {
    const result = exportToGedcomWithWarnings({
      persons: [
        {
          id: "p1",
          full_name: "Nguyễn Văn A",
          gender: "male",
          is_deceased: true,
          birth_year: null,
          birth_month: null,
          birth_day: null,
          death_year: null,
          death_month: null,
          death_day: null,
        },
      ],
      relationships: [],
      events: [
        {
          id: "e_gio",
          type: "death_anniversary",
          title: "Ngày giỗ",
          start_date: "2026-03-10",
          date_precision: "day",
          canonical_calendar: "lunar",
          lunar_day: 10,
          lunar_month: 3,
          lunar_year: null,
          legacy_person_id: "p1",
          deleted_at: null,
        },
      ],
      person_events: [
        {
          person_id: "p1",
          event_id: "e_gio",
          role: "principal",
        },
      ],
    } as any);

    expect(result.content).toContain("1 DEAT Y");
    expect(result.content).not.toContain("2 DATE 10 MAR 2026");
    expect(result.content).not.toContain("_GIAPHA_LUNAR");
  });
});

