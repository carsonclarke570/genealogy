import { describe, it, expect } from "vitest";
import { buildCensusRows, censusResidenceId, censusEventId } from "./census-derive";

const place = {
  label: "12 Maple St, Cambridge, MA",
  country: "United States",
  region: "Massachusetts",
  locality: "Cambridge",
  address: "12 Maple St",
  lat: 42.37,
  lng: -71.11,
  placeId: "osm:42",
};

describe("buildCensusRows", () => {
  it("derives a point residence + census event from a dated census", () => {
    const { residence, event } = buildCensusRows({
      mediaId: "M-9",
      year: 1940,
      location: place,
      prov: "verified",
    });

    // Deterministic ids tie the rows back to the media item.
    expect(residence.id).toBe(censusResidenceId("M-9"));
    expect(event.id).toBe(censusEventId("M-9"));

    // A census tells us they lived there *around* that year — a point, not a span.
    expect(residence.dateKind).toBe("point");
    expect(residence.startDate).toBe("1940");
    expect(residence.startYear).toBe(1940);
    expect(residence.endDate).toBeNull();
    expect(residence.endYear).toBeNull();
    // Structured location is carried onto the residence columns.
    expect(residence.placeLabel).toBe(place.label);
    expect(residence.locality).toBe("Cambridge");
    expect(residence.lat).toBe(42.37);
    // Cites the census as its source, and the sync owns it until a hand edit.
    expect(residence.mediaId).toBe("M-9");
    expect(residence.prov).toBe("verified");
    expect(residence.autoManaged).toBe(true);

    // The event is a first-class census record at the same year + place.
    expect(event.type).toBe("census");
    expect(event.title).toBe("1940 Census");
    expect(event.date).toBe("1940");
    expect(event.year).toBe(1940);
    expect(event.place).toBe(place.label);
    expect(event.mediaId).toBe("M-9");
    expect(event.autoManaged).toBe(true);
  });

  it("handles an undated census (null dates, generic title)", () => {
    const { residence, event } = buildCensusRows({
      mediaId: "M-10",
      year: null,
      location: { label: "Boston, MA" },
      prov: "unverified",
    });
    expect(residence.startDate).toBeNull();
    expect(residence.startYear).toBeNull();
    expect(residence.placeLabel).toBe("Boston, MA");
    expect(event.title).toBe("Census record");
    expect(event.date).toBeNull();
    expect(event.year).toBeNull();
  });

  it("is deterministic — same media id always yields the same row ids", () => {
    const first = buildCensusRows({ mediaId: "M-1", year: 1900, location: place, prov: "estimated" });
    const second = buildCensusRows({ mediaId: "M-1", year: 1910, location: place, prov: "verified" });
    expect(first.residence.id).toBe(second.residence.id);
    expect(first.event.id).toBe(second.event.id);
  });
});
