import { describe, it, expect } from "vitest";
import { parseCountField, parseNumericResponse, parseMandatsText, parseDetailsText, normalize, capitalizeFirst, capitalizeWords } from "../saisie-parser";

// ═══════════════════════════════════════════════════════════════════════════════
// STRICT CONTROLE — single numeric intent only
// ═══════════════════════════════════════════════════════════════════════════════

describe("normalize", () => {
  it("strips zero-width spaces", () => expect(normalize("un\u200B")).toBe("un"));
  it("strips BOM", () => expect(normalize("\uFEFFdeux")).toBe("deux"));
  it("NFKC normalizes ligature", () => expect(normalize("\uFB01n")).toBe("fin"));
  it("normalizes nbsp", () => expect(normalize("un\u00A0")).toBe("un"));
  it("normalizes fancy apostrophes", () => expect(normalize("j\u2019en ai pas")).toBe("j'en ai pas"));
  it("strips soft hyphen", () => expect(normalize("u\u00ADn")).toBe("un"));
  it("collapses whitespace", () => expect(normalize("  un   deux  ")).toBe("un deux"));
});

describe("parseCountField — accepted (single numeric intent)", () => {
  // Atomic numbers
  it('"0" => 0', () => expect(parseCountField("0")).toBe(0));
  it('"1" => 1', () => expect(parseCountField("1")).toBe(1));
  it('"2" => 2', () => expect(parseCountField("2")).toBe(2));
  it('"35" => 35', () => expect(parseCountField("35")).toBe(35));
  it('"12000" => 12000', () => expect(parseCountField("12000")).toBe(12000));

  // French words
  it('"un" => 1', () => expect(parseCountField("un")).toBe(1));
  it('"une" => 1', () => expect(parseCountField("une")).toBe(1));
  it('"Un" => 1', () => expect(parseCountField("Un")).toBe(1));
  it('"Une" => 1', () => expect(parseCountField("Une")).toBe(1));
  it('"UN" => 1', () => expect(parseCountField("UN")).toBe(1));
  it('"deux" => 2', () => expect(parseCountField("deux")).toBe(2));
  it('"trois" => 3', () => expect(parseCountField("trois")).toBe(3));
  it('"dix" => 10', () => expect(parseCountField("dix")).toBe(10));

  // Zero expressions
  it('"rien" => 0', () => expect(parseCountField("rien")).toBe(0));
  it('"non" => 0', () => expect(parseCountField("non")).toBe(0));
  it('"aucun" => 0', () => expect(parseCountField("aucun")).toBe(0));
  it('"aucune" => 0', () => expect(parseCountField("aucune")).toBe(0));
  it('"zéro" => 0', () => expect(parseCountField("zéro")).toBe(0));
  it('"pas du tout" => 0', () => expect(parseCountField("pas du tout")).toBe(0));
  it('"j\'en ai pas" => 0', () => expect(parseCountField("j'en ai pas")).toBe(0));

  // STT edge cases (punctuation, spaces)
  it('"1." => 1', () => expect(parseCountField("1.")).toBe(1));
  it('"un." => 1', () => expect(parseCountField("un.")).toBe(1));
  it('"une." => 1', () => expect(parseCountField("une.")).toBe(1));
  it('" un " => 1', () => expect(parseCountField(" un ")).toBe(1));
  it('"  un  " => 1', () => expect(parseCountField("  un  ")).toBe(1));
  it('"2," => 2', () => expect(parseCountField("2,")).toBe(2));
  it('"Deux." => 2', () => expect(parseCountField("Deux.")).toBe(2));

  // Short phrases with single quantity
  it('"j\'en ai fait un" => 1', () => expect(parseCountField("j'en ai fait un")).toBe(1));
  it('"il y en a deux" => 2', () => expect(parseCountField("il y en a deux")).toBe(2));
  it('"j\'ai fait 3 estimations" => 3', () => expect(parseCountField("j'ai fait 3 estimations")).toBe(3));
  it('"aucun cette semaine" => 0', () => expect(parseCountField("aucun cette semaine")).toBe(0));
});

describe("parseCountField — safety (must NOT confuse)", () => {
  it('"aucune" => 0 (not 1)', () => expect(parseCountField("aucune")).toBe(0));
  it('"aucune." => 0', () => expect(parseCountField("aucune.")).toBe(0));
  it('"Aucune" => 0', () => expect(parseCountField("Aucune")).toBe(0));
  it('"de" => null (not 2)', () => expect(parseCountField("de")).toBe(null));
  it('"demain" => null (not 2)', () => expect(parseCountField("demain")).toBe(null));
});

describe("parseCountField — ambiguous (rejected, needs relance)", () => {
  it('"1 ou 2" => null', () => expect(parseCountField("1 ou 2")).toBe(null));
  it('"un ou deux" => null', () => expect(parseCountField("un ou deux")).toBe(null));
  it('"peut-être 3" => null', () => expect(parseCountField("peut-être 3")).toBe(null));
  it('"je sais pas" => null', () => expect(parseCountField("je sais pas")).toBe(null));
});

describe("parseCountField — rejected (not a quantity)", () => {
  it('"oui" => null', () => expect(parseCountField("oui")).toBe(null));
  it('"ouais" => null', () => expect(parseCountField("ouais")).toBe(null));
  it('"" => null', () => expect(parseCountField("")).toBe(null));
  it('"bonjour" => null', () => expect(parseCountField("bonjour")).toBe(null));
});

describe("parseNumericResponse — decision tracing", () => {
  it('"3" → accepted', () => {
    const r = parseNumericResponse("3");
    expect(r.decision).toBe("accepted");
    expect(r.type).toBe("number");
  });
  it('"1 ou 2" → ambiguous', () => {
    const r = parseNumericResponse("1 ou 2");
    expect(r.decision).toBe("ambiguous");
  });
  it('"oui" → rejected', () => {
    const r = parseNumericResponse("oui");
    expect(r.decision).toBe("rejected");
  });
  it('"bonjour" → rejected', () => {
    const r = parseNumericResponse("bonjour");
    expect(r.decision).toBe("rejected");
  });
  it('"un" → accepted, value 1', () => {
    const r = parseNumericResponse("un");
    expect(r.decision).toBe("accepted");
    if (r.type === "number") expect(r.value).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL PARSERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseMandatsText", () => {
  it("'Dupont exclusif, Martin simple' => 2 mandats", () => {
    const r = parseMandatsText("Dupont exclusif, Martin simple");
    expect(r).toEqual([
      { nomVendeur: "dupont", type: "exclusif" },
      { nomVendeur: "martin", type: "simple" },
    ]);
  });

  it("'Léo simple et Beltrand exclusif' => 2 mandats", () => {
    const r = parseMandatsText("Léo simple et Beltrand exclusif");
    expect(r).toHaveLength(2);
  });

  it("'Dupont exclusif Leroy simple' (no separator) => 2 mandats", () => {
    const r = parseMandatsText("Dupont exclusif Leroy simple");
    expect(r).toHaveLength(2);
  });

  it("defaults to simple if no type keyword", () => {
    const r = parseMandatsText("Dupont");
    expect(r).toEqual([{ nomVendeur: "dupont", type: "simple" }]);
  });

  it("returns empty for zero", () => {
    expect(parseMandatsText("aucun")).toEqual([]);
    expect(parseMandatsText("0")).toEqual([]);
  });
});

describe("parseDetailsText", () => {
  it("'Brun retraite, Leroy divorce' => 2 details", () => {
    const r = parseDetailsText("Brun retraite, Leroy divorce");
    expect(r).toEqual([
      { nom: "brun", commentaire: "retraite" },
      { nom: "leroy", commentaire: "divorce" },
    ]);
  });

  it("name without comment", () => {
    const r = parseDetailsText("Dupont");
    expect(r).toEqual([{ nom: "dupont", commentaire: "" }]);
  });

  it("returns empty for zero", () => {
    expect(parseDetailsText("rien")).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CAPITALIZE (display formatting)
// ═══════════════════════════════════════════════════════════════════════════════

describe("capitalizeFirst", () => {
  it('"dupont" => "Dupont"', () => expect(capitalizeFirst("dupont")).toBe("Dupont"));
  it('"martin" => "Martin"', () => expect(capitalizeFirst("martin")).toBe("Martin"));
  it('"DUPONT" => "DUPONT" (no downcase)', () => expect(capitalizeFirst("DUPONT")).toBe("DUPONT"));
  it('"" => ""', () => expect(capitalizeFirst("")).toBe(""));
  it('"a" => "A"', () => expect(capitalizeFirst("a")).toBe("A"));
});

describe("capitalizeWords", () => {
  it('"dupont retraite" => "Dupont Retraite"', () => expect(capitalizeWords("dupont retraite")).toBe("Dupont Retraite"));
  it('"léo simple" => "Léo Simple"', () => expect(capitalizeWords("léo simple")).toBe("Léo Simple"));
});
