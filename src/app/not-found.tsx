import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import imiBotNotFound from "@/../public/assets/images/imi-bot-404.webp";

export async function generateMetadata() {
  const t = await getTranslations("notFound");
  return {
    title: t("title"),
  };
}

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-slate-900 px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="relative w-96 h-96 mx-auto">
          <Image
            src={imiBotNotFound}
            alt="IMI Bot"
            fill
            sizes="384px"
            className="object-contain drop-shadow-2xl"
            priority
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-6xl font-bold tracking-tight text-white">404</h1>
          <h2 className="text-3xl font-semibold text-white">
            {t("title")}
          </h2>
          <p className="text-gray-300 text-lg">
            {t("description")}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-teal-600 px-8 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
