export enum SupportType {
  FIXED = 'FIXED',
  PIN = 'PIN',
  ROLLER = 'ROLLER',
  FREE = 'FREE',
  HINGE = 'HINGE' // Internal hinge
}

export enum LoadType {
  DISTRIBUTED = 'DISTRIBUTED',
  POINT = 'POINT',
  MOMENT = 'MOMENT'
}

export interface BeamNode {
  id: string;
  label: string;
  position: number; // x-coordinate relative to start (0)
  supportType?: SupportType;
  hasHinge?: boolean;
}

export interface BeamLoad {
  id: string;
  type: LoadType;
  start: number;
  end: number; // Same as start for point loads
  magnitude: number; // Numeric value for calculation
  unit: string; // e.g. "k", "kN", "k/ft"
  symbol: string; // e.g. "P1", "w", "M_A"
  direction: 'UP' | 'DOWN' | 'CLOCKWISE' | 'COUNTER_CLOCKWISE';
}

export interface Dimension {
  id: string;
  start: number;
  end: number;
  value: number;
  unit: string; // e.g. "ft", "m"
  symbol: string; // e.g. "L1", "L2"
  yOffset?: number;
}

export interface BeamStructure {
  totalLength: number;
  nodes: BeamNode[];
  loads: BeamLoad[];
  dimensions: Dimension[];
}

export interface AnalysisResult {
  structure: BeamStructure;
  latexCode: string;
}

export interface AnalysisReport {
  markdown: string;
}
