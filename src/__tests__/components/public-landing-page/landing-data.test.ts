import {
  FEATURES,
  BENEFITS,
  buildFaqItems,
} from "@/components/public-landing-page/landing-data";

describe("public-landing-page/landing-data", () => {
  it("exports four features with icon, titleKey and descKey", () => {
    expect(FEATURES).toHaveLength(4);
    for (const f of FEATURES) {
      expect(typeof f.titleKey).toBe("string");
      expect(typeof f.descKey).toBe("string");
      expect(f.icon).toBeDefined();
    }
  });

  it("exports four benefits with icon, titleKey and descKey", () => {
    expect(BENEFITS).toHaveLength(4);
    for (const b of BENEFITS) {
      expect(typeof b.titleKey).toBe("string");
      expect(typeof b.descKey).toBe("string");
      expect(b.icon).toBeDefined();
    }
  });

  it("buildFaqItems builds 10 items using the translator", () => {
    const t = (key: string) => `t:${key}`;
    const items = buildFaqItems(t);
    expect(items).toHaveLength(10);
    expect(items[0]).toEqual({ question: "t:faq1Q", answer: "t:faq1A" });
    expect(items[9]).toEqual({ question: "t:faq10Q", answer: "t:faq10A" });
  });
});
