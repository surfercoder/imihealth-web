"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InformesTab } from "@/components/tabs/informes-tab";
import { MisPacientesTab } from "@/components/tabs/mis-pacientes-tab";
import { DashboardTab } from "@/components/tabs/dashboard-tab";
import { PlantillasTab } from "@/components/tabs/plantillas-tab";
import type { PatientWithStats } from "@/actions/patients";
import type { PlanInfo } from "@/actions/plan";
import type { ChartData } from "@/actions/dashboard-charts";

interface HomeTabsProps {
  activeTab: string;
  patients: PatientWithStats[];
  totalInformes: number;
  completedCount: number;
  processingCount: number;
  errorCount: number;
  plan: PlanInfo;
  chartData: ChartData | null;
  translations: {
    informes: string;
    misPacientes: string;
    dashboard: string;
    plantillas: string;
  };
}

function HomeTabsContent({
  activeTab,
  patients,
  totalInformes,
  completedCount,
  processingCount,
  errorCount,
  plan,
  chartData,
  translations,
}: HomeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="informes">{translations.informes}</TabsTrigger>
        <TabsTrigger value="misPacientes">{translations.misPacientes}</TabsTrigger>
        <TabsTrigger value="dashboard">{translations.dashboard}</TabsTrigger>
        <TabsTrigger value="plantillas">{translations.plantillas}</TabsTrigger>
      </TabsList>

      <TabsContent value="informes">
        <InformesTab />
      </TabsContent>

      <TabsContent value="misPacientes">
        <MisPacientesTab patients={patients} />
      </TabsContent>

      <TabsContent value="dashboard">
        <DashboardTab
          totalPatients={patients.length}
          totalInformes={totalInformes}
          completedCount={completedCount}
          processingCount={processingCount}
          errorCount={errorCount}
          plan={plan}
          chartData={chartData}
        />
      </TabsContent>

      <TabsContent value="plantillas">
        <PlantillasTab />
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
