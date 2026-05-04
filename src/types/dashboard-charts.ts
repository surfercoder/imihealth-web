export interface ChartData {
  patientsOverTime: { date: string; total: number }[];
  consultationTime: {
    avg: number;
    min: number;
    max: number;
    data: { date: string; minutes: number }[];
  };
  patientsAccumulator: {
    current: { date: string; patients: number }[];
    average: number;
  };
  informTypes: { type: string; count: number; fill: string }[];
  summary: {
    totalPatients: number;
    completedCount: number;
    processingCount: number;
    errorCount: number;
  };
}
