"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
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

export function HomeTabs({
  activeTab,
  translations,
  informesContent,
  patientsContent,
  dashboardContent,
}: HomeTabsProps) {
  const router = useRouter();

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", value);
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router]
  );

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
