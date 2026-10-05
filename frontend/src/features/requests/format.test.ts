import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "./format";

describe("format", () => {
  // Noon UTC stays on the same day in any time zone from -11h to +11h.
  const iso = "2026-10-03T12:00:00.000000Z";

  it("formats the date as dd/mm/aaaa", () => {
    expect(formatDate(iso)).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it("formats the date and time as dd/mm/aaaa hh:mm, without a comma", () => {
    expect(formatDateTime(iso)).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  });

  it("shows the date and time in the browser's time zone", () => {
    const local = new Date(iso);
    const hh = String(local.getHours()).padStart(2, "0");
    const mm = String(local.getMinutes()).padStart(2, "0");

    expect(formatDateTime(iso).endsWith(`${hh}:${mm}`)).toBe(true);
  });
});
