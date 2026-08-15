import { describe, expect, it } from "vitest";
import {
  collectNoteTags,
  formatNoteDate,
  noteBody,
  noteHeading,
  noteMatches,
  parseTagInput,
  sortNotes,
} from "./notes";
import type { NoteItem } from "./types";

function note(partial: Partial<NoteItem> & { id: string }): NoteItem {
  return { text: "", timestamp: "", ...partial };
}

describe("note heading and body", () => {
  it("uses the title when it is set", () => {
    const item = note({ id: "1", title: "Клиент", text: "первая\nвторая" });
    expect(noteHeading(item)).toBe("Клиент");
    expect(noteBody(item)).toBe("первая\nвторая");
  });

  it("promotes the first line when there is no title", () => {
    const item = note({ id: "1", text: "первая\nвторая\nтретья" });
    expect(noteHeading(item)).toBe("первая");
    expect(noteBody(item)).toBe("вторая\nтретья");
  });
});

describe("sortNotes", () => {
  const legacyA = note({ id: "a" });
  const legacyB = note({ id: "b" });
  const fresh = note({ id: "c", createdAt: "2026-08-10T10:00:00.000Z", updatedAt: "2026-08-10T10:00:00.000Z" });
  const newest = note({ id: "d", createdAt: "2026-08-14T10:00:00.000Z", updatedAt: "2026-08-15T10:00:00.000Z" });

  it("keeps pinned notes on top", () => {
    const pinned = { ...legacyB, pinned: true };
    expect(sortNotes([fresh, newest, pinned], "updated").map((item) => item.id)).toEqual(["b", "d", "c"]);
  });

  it("sorts by the chosen date, newest first", () => {
    expect(sortNotes([fresh, newest], "updated").map((item) => item.id)).toEqual(["d", "c"]);
    expect(sortNotes([newest, fresh], "created").map((item) => item.id)).toEqual(["d", "c"]);
  });

  it("keeps dateless notes in their original order after dated ones", () => {
    expect(sortNotes([legacyA, newest, legacyB], "updated").map((item) => item.id)).toEqual(["d", "a", "b"]);
  });
});

describe("formatNoteDate", () => {
  const now = new Date("2026-08-15T12:00:00");

  it("says today and yesterday for recent notes", () => {
    expect(formatNoteDate(note({ id: "1", updatedAt: "2026-08-15T09:14:00" }), now)).toMatch(/^сегодня, /);
    expect(formatNoteDate(note({ id: "2", updatedAt: "2026-08-14T18:40:00" }), now)).toMatch(/^вчера, /);
  });

  it("falls back to the legacy timestamp when there is no date", () => {
    expect(formatNoteDate(note({ id: "3", timestamp: "вчера, 18:40" }), now)).toBe("вчера, 18:40");
  });
});

describe("search and tags", () => {
  it("matches title, text and tags", () => {
    const item = note({ id: "1", title: "Didox", text: "сроки интеграции", tags: ["клиенты"] });
    expect(noteMatches(item, "didox")).toBe(true);
    expect(noteMatches(item, "сроки")).toBe(true);
    expect(noteMatches(item, "клиент")).toBe(true);
    expect(noteMatches(item, "оплата")).toBe(false);
  });

  it("counts tags case-insensitively, most used first", () => {
    const notes = [
      note({ id: "1", tags: ["Клиенты"] }),
      note({ id: "2", tags: ["клиенты", "оплата"] }),
    ];
    expect(collectNoteTags(notes)).toEqual([
      { tag: "Клиенты", count: 2 },
      { tag: "оплата", count: 1 },
    ]);
  });

  it("parses a tag string", () => {
    expect(parseTagInput(" клиенты, #оплата ,, ")).toEqual(["клиенты", "оплата"]);
  });
});
