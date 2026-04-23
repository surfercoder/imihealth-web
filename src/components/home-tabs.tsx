"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomeTabsProps {
  initialTab: string;
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
  initialTab,
  translations,
  informesContent,
  patientsContent,
  dashboardContent,
}: HomeTabsProps) {
  const [activeTab, setActiveTab] = useState(() => initialTab);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    // Sync URL without triggering a server round-trip
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }, []);

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
