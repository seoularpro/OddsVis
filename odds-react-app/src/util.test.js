import { impliedYards, normInv } from "./util";

describe("normInv", () => {
  it("returns 0 at the median and the familiar 95% z-scores at the tails", () => {
    expect(normInv(0.5)).toBeCloseTo(0, 6);
    expect(normInv(0.975)).toBeCloseTo(1.95996, 4);
    expect(normInv(0.025)).toBeCloseTo(-1.95996, 4);
  });
});

describe("impliedYards", () => {
  it("leaves a near-even line essentially unchanged", () => {
    // -114/-114 is break-even for the 1.0623 overround, so the line IS the median.
    const yds = impliedYards(58.5, -114);
    expect(Math.abs(yds - 58.5) / 58.5).toBeLessThan(0.01);
  });

  it("pulls a heavily shaded over well below the posted line", () => {
    // Jameson Williams: Over 39.5 @ +285 -> the line is his ~76th percentile,
    // so the lognormal median sits well under it.
    const yds = impliedYards(39.5, 285);
    expect(yds).toBeLessThan(39.5 * 0.75);
    expect(yds).toBeCloseTo(25.5, 0);
  });

  it("returns a lower median the more the over is shaded", () => {
    // Same line, increasingly unlikely over -> monotonically lower median.
    const even = impliedYards(39.5, -114);
    const mild = impliedYards(39.5, 150);
    const heavy = impliedYards(39.5, 285);
    const extreme = impliedYards(39.5, 1000);
    expect(mild).toBeLessThan(even);
    expect(heavy).toBeLessThan(mild);
    expect(extreme).toBeLessThan(heavy);
    // Never degenerate: always positive and finite.
    expect(extreme).toBeGreaterThan(0);
    expect(Number.isFinite(extreme)).toBe(true);
  });

  it("pushes a heavily favored over above the posted line", () => {
    expect(impliedYards(39.5, -300)).toBeGreaterThan(39.5);
  });

  it("falls back to the raw line when odds are missing or unusable", () => {
    expect(impliedYards(58.5, undefined)).toBe(58.5);
    expect(impliedYards(58.5, null)).toBe(58.5);
    expect(impliedYards(58.5, 0)).toBe(58.5);
    expect(impliedYards(58.5, "not-odds")).toBe(58.5);
  });

  it("passes a non-positive or non-numeric line straight through", () => {
    expect(impliedYards(0, -114)).toBe(0);
    expect(Number.isNaN(impliedYards("abc", -114))).toBe(true);
  });
});
