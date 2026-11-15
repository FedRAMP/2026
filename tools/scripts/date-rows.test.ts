import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const script = await readFile(
  new URL("../../overrides/javascripts/date-rows.js", import.meta.url),
  "utf8",
);

function fixture(values: string[]) {
  let now = new Date(2026, 10, 15, 23, 59);
  const rows = values.map((value) => {
    const attributes = new Map<string, string>();
    return {
      value,
      attributes,
      getAttribute: (key: string) => attributes.get(key),
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      hasAttribute: (key: string) => attributes.has(key),
      removeAttribute: (key: string) => attributes.delete(key),
    };
  });
  const callbacks: Record<string, () => void> = {};
  let delay = 0;
  class Clock extends Date {
    constructor(...args: any[]) {
      if (!args.length) super(now.getTime());
      else if (args.length === 1) super(args[0]);
      else
        super(
          args[0],
          args[1],
          args[2],
          args[3] ?? 0,
          args[4] ?? 0,
          args[5] ?? 0,
          args[6] ?? 0,
        );
    }
  }
  vm.runInNewContext(script, {
    Date: Clock,
    document: {
      hidden: false,
      querySelectorAll: (selector: string) =>
        selector === "tr[data-date-state]"
          ? rows.filter((r) => r.hasAttribute("data-date-state"))
          : rows.map((row) => ({
              closest: (selector: string) => (selector === "tr" ? row : null),
              getAttribute: () => row.value,
            })),
      addEventListener: (event: string, callback: () => void) => {
        callbacks[event] = callback;
      },
    },
    document$: {
      subscribe: (callback: () => void) => {
        callbacks.navigate = callback;
        callback();
      },
    },
    clearTimeout: () => {},
    setTimeout: (callback: () => void, ms: number) => {
      callbacks.midnight = callback;
      delay = ms;
      return 1;
    },
  });
  return {
    rows,
    callbacks,
    delay,
    setNow: (value: Date) => {
      now = value;
    },
    states: () => rows.map((r) => r.getAttribute("data-date-state")),
  };
}

test("date rows use local calendar dates and include exact 60-day boundaries in near groups", () => {
  const f = fixture([
    "2026-09-15",
    "2026-09-16",
    "2026-11-14",
    "2026-11-15",
    "2027-01-14",
    "2027-01-15",
  ]);
  expect(f.states()).toEqual([
    "past",
    "recent",
    "recent",
    "upcoming",
    "upcoming",
    "future",
  ]);
  expect(f.delay).toBe(61000);
});

test("invalid and ambiguous markers are ignored", () => {
  expect(
    fixture([
      "2026-02-30",
      "2026-13-01",
      "01/02/2026",
      "",
      "2026-2-03",
    ]).states(),
  ).toEqual(Array(5).fill(undefined));
});

test("instant navigation, midnight, and returning to the tab refresh existing rows", () => {
  const f = fixture(["2026-11-15"]);
  f.setNow(new Date(2026, 10, 16));
  f.callbacks.midnight!();
  expect(f.states()).toEqual(["recent"]);
  f.setNow(new Date(2027, 1, 1));
  f.callbacks.visibilitychange!();
  expect(f.states()).toEqual(["past"]);
  f.rows[0]!.value = "invalid";
  f.callbacks.navigate!();
  expect(f.states()).toEqual([undefined]);
});

test("multi-date rows follow the sorted date column and retain chronological sort values", () => {
  let sorted: number | null = null;
  const callbacks: Record<string, () => void> = {};
  const attributes = new Map<string, string>();
  const cells = Array.from({ length: 5 }, () => ({
    attributes: new Map<string, string>(),
    setAttribute(key: string, value: string) {
      this.attributes.set(key, value);
    },
  }));
  const row = {
    cells,
    setAttribute: (key: string, value: string) => attributes.set(key, value),
    hasAttribute: (key: string) => attributes.has(key),
    removeAttribute: (key: string) => attributes.delete(key),
  };
  const headers = cells.map((_, cellIndex) => ({
    cellIndex,
    querySelector: () => (cellIndex > 0 ? {} : null),
  }));
  const table = {
    querySelector: (selector: string) =>
      selector === "thead th[aria-sort]"
        ? sorted === null
          ? null
          : headers[sorted]
        : { closest: () => headers[3] },
  };
  const markers = [
    null,
    "2000-01-01",
    "2099-01-01",
    "2001-01-01",
    null,
  ].flatMap((value, index) =>
    value
      ? [
          {
            getAttribute: () => value,
            closest: (selector: string) =>
              selector === "tr"
                ? row
                : selector === "td"
                  ? cells[index]
                  : table,
          },
        ]
      : [],
  );
  vm.runInNewContext(script, {
    document: {
      hidden: false,
      querySelectorAll: (selector: string) =>
        selector === "tr[data-date-state]" ? [row] : markers,
      addEventListener: (name: string, callback: () => void) => {
        callbacks[name] = callback;
      },
    },
    document$: { subscribe: (callback: () => void) => callback() },
    setTimeout: () => 1,
    clearTimeout: () => {},
  });
  expect(attributes.get("data-date-state")).toBe("past");
  expect(cells[2]!.attributes.get("data-sort")).toBe("2099-01-01");
  sorted = 2;
  callbacks.afterSort!();
  expect(attributes.get("data-date-state")).toBe("future");
  callbacks.afterSort!();
  expect(attributes.get("data-date-state")).toBe("future");
  sorted = 4;
  callbacks.afterSort!();
  expect(attributes.has("data-date-state")).toBe(false);
  sorted = 0;
  callbacks.afterSort!();
  expect(attributes.get("data-date-state")).toBe("past");
});
