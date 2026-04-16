"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams as useNextSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomeTabsProps {
  activeTab: string;
  translations: {
    informes: string;
    misPacientes: string;
    dashboard: string;
  };
  informesContent: React.ReactNode;
  patientsContent: React.ReactNode;
  dashboardContent: React.ReactNode;
}

function HomeTabsContent({
  activeTab,
  translations,
  informesContent,
  patientsContent,
  dashboardContent,
}: HomeTabsProps) {
  const router = useRouter();
  const searchParams = useNextSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8">
        <TabsTrigger value="informes">{translations.informes}</TabsTrigger>
        <TabsTrigger value="misPacientes">{translations.misPacientes}</TabsTrigger>
        <TabsTrigger value="dashboard">{translations.dashboard}</TabsTrigger>
      </TabsList>

      <TabsContent value="informes">
        {informesContent}
      </TabsContent>

      <TabsContent value="misPacientes">
        {patientsContent}
      </TabsContent>

      <TabsContent value="dashboard">
        {dashboardContent}
      </TabsContent>
    </Tabs>
  );
}

export function HomeTabs(props: HomeTabsProps) {
  return (
    <Suspense>
      <HomeTabsContent {...props} />
    </Suspense>
  );
}
