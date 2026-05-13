"use client";

import { useTranslations } from "next-intl";

export function TermsContent() {
  const t = useTranslations("signupTerms");
  const terms = useTranslations("signupTerms.terms");
  return (
    <>
      <h2 className="text-base font-semibold text-foreground">{terms("title")}</h2>
      <p className="text-xs text-muted-foreground">{t("termsLastUpdated")}</p>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s1Title")}</h3>
        <p>{terms("s1p1")}</p>
        <p>{terms("s1p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s2Title")}</h3>
        <p>{terms("s2p1")}</p>
        <p>{terms("s2p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s3Title")}</h3>
        <p>{terms("s3p1")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{terms("s3li1")}</li>
          <li>{terms("s3li2")}</li>
          <li>{terms("s3li3")}</li>
          <li>{terms("s3li4")}</li>
          <li>{terms("s3li5")}</li>
          <li>{terms("s3li6")}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s4Title")}</h3>
        <p>{terms("s4p1")}</p>
        <p>{terms("s4p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s5Title")}</h3>
        <p>{terms("s5p1")}</p>
        <p>{terms("s5p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s6Title")}</h3>
        <p>{terms("s6p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s7Title")}</h3>
        <p>{terms("s7p1")}</p>
        <p>{terms("s7p2")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s8Title")}</h3>
        <p>{terms("s8p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s9Title")}</h3>
        <p>{terms("s9p1")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">{terms("s10Title")}</h3>
        <p>
          {terms("s10p1")}{" "}
          <span className="font-medium text-primary">{terms("s10email")}</span>{" "}
          {terms("s10p2")}
        </p>
      </section>

      <div className="h-4" aria-hidden />
    </>
  );
}
