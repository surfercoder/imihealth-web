"use client";
"use no memo";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface WelcomeScreenProps {
  userName?: string;
  onDone: () => void;
}

export function WelcomeScreen({ userName, onDone }: WelcomeScreenProps) {
  const t = useTranslations("welcomeScreen");
  const [messageIndex] = useState(() => Math.floor(Math.random() * 10));

  const firstName = userName?.split(" ")[0] || t("defaultName");

  useEffect(() => {
    const doneTimer = setTimeout(() => onDone(), 6200);
    return () => clearTimeout(doneTimer);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes ws-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ws-fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes ws-scaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ws-slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ws-overlay {
          animation: ws-fadeIn 0.5s ease-out forwards, ws-fadeOut 0.7s ease-in 5.5s forwards;
        }
        .ws-image {
          animation: ws-scaleIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s backwards;
        }
        .ws-text {
          animation: ws-slideUp 0.6s ease-out 0.4s backwards;
        }
        .ws-phrase {
          animation: ws-slideUp 0.6s ease-out 0.65s backwards;
        }
      `}</style>

      <div
        className="ws-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6"
        style={{ backgroundColor: "#061729" }}
      >
        {/* Image centered at natural size, edges faded into background via mask */}
        <div
          className="ws-image flex items-center justify-center"
          style={{
            WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 50% 50%, black 40%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 85% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        >
          <Image
            src="/assets/images/IMIHEALTH.jpeg"
            alt="IMI Health"
            width={1280}
            height={853}
            priority
            style={{ maxWidth: "min(90vw, 860px)", height: "auto" }}
          />
        </div>

        {/* Greeting and phrase */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1
            className="ws-text text-3xl font-bold tracking-tight text-white"
          >
            {t("greeting", { name: firstName })}
          </h1>
          <p
            className="ws-phrase max-w-lg text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {t(`messages.${messageIndex}` as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>
    </>
  );
}
