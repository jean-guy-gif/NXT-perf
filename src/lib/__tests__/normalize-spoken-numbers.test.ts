import { describe, it, expect } from "vitest";
import { normalizeSpokenNumbers } from "../normalize-spoken-numbers";

describe("normalizeSpokenNumbers", () => {
  // Basic units
  it.each([
    ["un", "1"],
    ["une", "1"],
    ["deux", "2"],
    ["trois", "3"],
    ["quatre", "4"],
    ["cinq", "5"],
    ["six", "6"],
    ["sept", "7"],
    ["huit", "8"],
    ["neuf", "9"],
    ["dix", "10"],
    ["onze", "11"],
    ["douze", "12"],
    ["treize", "13"],
    ["quatorze", "14"],
    ["quinze", "15"],
    ["seize", "16"],
  ])("standalone '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // Tens
  it.each([
    ["vingt", "20"],
    ["trente", "30"],
    ["quarante", "40"],
    ["cinquante", "50"],
    ["soixante", "60"],
  ])("standalone tens '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // Compound tens + units
  it.each([
    ["vingt-cinq", "25"],
    ["trente-deux", "32"],
    ["quarante-sept", "47"],
    ["cinquante-trois", "53"],
  ])("compound '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // Tens + et + un
  it.each([
    ["vingt-et-un", "21"],
    ["trente-et-un", "31"],
  ])("compound with et '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // 70s (soixante-dix)
  it.each([
    ["soixante-dix", "70"],
    ["soixante-et-onze", "71"],
    ["soixante-douze", "72"],
    ["soixante-treize", "73"],
    ["soixante-quatorze", "74"],
    ["soixante-quinze", "75"],
    ["soixante-seize", "76"],
  ])("seventies '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // 80s (quatre-vingt)
  it.each([
    ["quatre-vingt", "80"],
    ["quatre-vingts", "80"],
    ["quatre-vingt-un", "81"],
    ["quatre-vingt-cinq", "85"],
    ["quatre-vingt-neuf", "89"],
  ])("eighties '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // 90s (quatre-vingt-dix)
  it.each([
    ["quatre-vingt-dix", "90"],
    ["quatre-vingt-dix-sept", "97"],
  ])("nineties '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // Special values
  it.each([
    ["cent", "100"],
    ["mille", "1000"],
    ["zéro", "0"],
    ["zero", "0"],
  ])("special '%s' → '%s'", (input, expected) => {
    expect(normalizeSpokenNumbers(input)).toBe(expected);
  });

  // In-sentence replacement
  it("replaces in sentence context", () => {
    expect(normalizeSpokenNumbers("j'ai eu vingt-cinq contacts")).toBe("j'ai eu 25 contacts");
  });

  it("replaces 'un' in context", () => {
    expect(normalizeSpokenNumbers("j'ai un mandat")).toBe("j'ai 1 mandat");
  });

  it("does not modify already-numeric text", () => {
    expect(normalizeSpokenNumbers("j'ai 5 mandats")).toBe("j'ai 5 mandats");
  });
});
