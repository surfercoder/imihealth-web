import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PublicLandingPage } from "@/components/public-landing-page";

export const metadata: Metadata = {
  title: "IMI Health",
  description: "AI-powered medical consultation reports",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <PublicLandingPage />;
}
