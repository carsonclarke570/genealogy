import { describe, it, expect } from "vitest";
import { mediaMetaSchema, sniffMime, MAX_UPLOAD_BYTES } from "./media-validation";

/** Build a byte array from a leading signature padded out to `len`. */
function bytes(sig: number[], len = 16): Uint8Array {
  const a = new Uint8Array(len);
  a.set(sig, 0);
  return a;
}

describe("sniffMime", () => {
  it("accepts JPEG / PNG / GIF / WebP / PDF by magic bytes", () => {
    expect(sniffMime(bytes([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
    expect(sniffMime(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
    expect(
      sniffMime(bytes([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("image/webp");
    expect(sniffMime(bytes([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
  });

  it("rejects SVG (text) — an XSS vector if served inline", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sniffMime(svg)).toBeNull();
  });

  it("rejects HTML masquerading as an image (declared type is never trusted)", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");
    expect(sniffMime(html)).toBeNull();
  });

  it("rejects empty / too-short / unknown buffers", () => {
    expect(sniffMime(new Uint8Array(0))).toBeNull();
    expect(sniffMime(bytes([0xff, 0xd8]))).toBeNull(); // truncated JPEG sig
    expect(sniffMime(bytes([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });
});

describe("mediaMetaSchema", () => {
  it("accepts a well-formed payload and dedupes person ids", () => {
    const r = mediaMetaSchema.safeParse({
      title: "  Eleanor — birth certificate ",
      type: "certificate",
      year: "1915",
      description: "",
      personIds: ["a", "a", "b"],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBe("Eleanor — birth certificate");
      expect(r.data.year).toBe(1915);
      expect(r.data.description).toBeNull();
      expect(r.data.personIds).toEqual(["a", "b"]);
    }
  });

  it("requires a non-empty title", () => {
    expect(mediaMetaSchema.safeParse({ title: "   ", type: "photo", personIds: [] }).success).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(mediaMetaSchema.safeParse({ title: "x", type: "video", personIds: [] }).success).toBe(false);
  });

  it("coerces a blank or out-of-range year to null rather than failing", () => {
    const blank = mediaMetaSchema.safeParse({ title: "x", type: "photo", year: "", personIds: [] });
    expect(blank.success && blank.data.year).toBeNull();
    const silly = mediaMetaSchema.safeParse({ title: "x", type: "photo", year: "3500", personIds: [] });
    expect(silly.success && silly.data.year).toBeNull();
  });

  it("tolerates a missing/garbage personIds field", () => {
    const r = mediaMetaSchema.safeParse({ title: "x", type: "photo", personIds: "nope" });
    expect(r.success && r.data.personIds).toEqual([]);
  });

  it("accepts the grave type and re-canonicalises per-person dates", () => {
    const r = mediaMetaSchema.safeParse({
      title: "Rivers headstone",
      type: "grave",
      personIds: ["tom", "ele"],
      personDates: { tom: "1971", ele: "2001-03-04", bad: "not-a-date" },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("grave");
      // valid dates survive (canonical), the unparseable one is dropped
      expect(r.data.personDates).toEqual({ tom: "1971", ele: "2001-03-04" });
    }
  });

  it("tolerates a missing/garbage personDates field", () => {
    const r = mediaMetaSchema.safeParse({ title: "x", type: "grave", personIds: [], personDates: "nope" });
    expect(r.success && r.data.personDates).toEqual({});
  });
});

describe("MAX_UPLOAD_BYTES", () => {
  it("is 25 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
  });
});
