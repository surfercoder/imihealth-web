"use client";

import { useState, useCallback } from "react";
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
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const tab = selectedTab ?? activeTab;

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }, []);

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
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
