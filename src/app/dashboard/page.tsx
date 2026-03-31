import { redirect } from "next/navigation";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const welcome = params.welcome;
  
  if (welcome === "true") {
    redirect("/?welcome=true");
  }
  
  redirect("/");
}
