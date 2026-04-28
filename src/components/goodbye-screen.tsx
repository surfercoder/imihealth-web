"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import imiBotGoodbye from "@/../public/assets/images/imi-bot-goodbye.webp";

const GOODBYE_MESSAGE_COUNT = 17;
// Computed once per module load, stable across re-renders
const randomMessageIndex = Math.floor(Math.random() * GOODBYE_MESSAGE_COUNT);

interface GoodbyeScreenProps {
  userName?: string;
  onDone: () => void;
}

export function GoodbyeScreen({ userName, onDone }: GoodbyeScreenProps) {
  const t = useTranslations("goodbyeScreen");
  const tAlt = useTranslations("alt");
  const messageIndex = randomMessageIndex;

  const displayName = userName || t("defaultName");

  useEffect(() => {
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => clearTimeout(doneTimer);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes gs-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gs-scaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes gs-slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gs-overlay {
          animation: gs-fadeIn 0.4s ease-out forwards;
        }
        .gs-image {
          animation: gs-scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.05s backwards;
        }
        .gs-text {
          animation: gs-slideUp 0.5s ease-out 0.25s backwards;
        }
        .gs-phrase {
          animation: gs-slideUp 0.5s ease-out 0.4s backwards;
        }
      `}</style>

      <div
        className="gs-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6 bg-white"
      >
        <div className="gs-image flex items-center justify-center">
          <Image
            src={imiBotGoodbye}
            alt={tAlt("botGoodbye")}
            priority
            style={{ maxWidth: "min(90vw, 500px)", height: "auto" }}
          />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="gs-text text-3xl font-bold tracking-tight text-gray-900">
            {t("greeting", { name: displayName })}
          </h1>
          <p className="gs-phrase max-w-lg text-base leading-relaxed text-gray-600">
            {t(`messages.${messageIndex}` as Parameters<typeof t>[0])}
          </p>
        </div>
      </div>
    </>
  );
}
