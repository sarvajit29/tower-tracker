import { LucideIcon } from "lucide-react";

export interface CellTower {
  id: string;
  operator: "Jio" | "Airtel" | "Vi" | "BSNL" | string;
  networkType: "2G" | "3G" | "4G" | "5G";
  latitude: number;
  longitude: number;
  signalStrength: number; // dBm power (e.g. -115 to -52)
  height: number; // meters
  band: string; // e.g. "3500 MHz (n78)"
  cellId: number;
  tac: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface OperatorStats {
  name: string;
  averageStrength: number;
  towerCount: number;
  maxBand: string;
  score: number; // Score out of 100
  potentialSpeed: string;
}

export interface LiveLocationState {
  coords: Coordinates;
  isSimulated: boolean;
  accuracy?: number;
}

export interface TelemetryHistoryPoint {
  timestamp: string;
  dbm: number;
  operator: string;
  networkType: string;
}

