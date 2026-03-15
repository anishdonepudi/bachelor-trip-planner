export interface MonthlyTourismData {
  crowd: number;
  season: "peak" | "shoulder" | "off";
}

export interface TravelEvent {
  name: string;
  month: number; // 1-12
  description?: string;
  date?: string; // approximate date, e.g. "Mar 15-22" or "Late June"
}

export interface DestinationData {
  months: MonthlyTourismData[]; // index 0 = January, 11 = December
  events: TravelEvent[];
  notes?: string;
}
