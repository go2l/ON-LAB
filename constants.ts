import { Region, Crop, Pathogen, SampleStatus, ResistanceCategory, CultivationSystem } from './types';

export const APP_NAME = "ON-LAB-IL";

export const ACTIVE_INGREDIENTS = [
  "Boscalid",
  "Azoxystrobin",
  "Fenhexamid",
  "Fludioxonil",
  "Iprodione"
];

// Color mapping for resistance categories
export const RESISTANCE_COLORS: Record<string, string> = {
  [ResistanceCategory.HS]: "#2D5A27", // Forest Green
  [ResistanceCategory.S]: "#88A096",  // Sage
  [ResistanceCategory.RS]: "#D4A373", // Earthy Tan
  [ResistanceCategory.T]: "#E76F51",  // Terracotta
  [ResistanceCategory.R]: "#BC4749",  // Carmine Red
};

// Logic: If growth exists at specific PPM, classify accordingly.
export const calculateBotrytisResistance = (
  growthAt01: boolean,
  growthAt1: boolean,
  growthAt5: boolean,
  growthAt10: boolean
): ResistanceCategory => {
  if (growthAt10) return ResistanceCategory.R;
  if (growthAt5) return ResistanceCategory.T;
  if (growthAt1) return ResistanceCategory.RS;
  if (growthAt01) return ResistanceCategory.S;
  return ResistanceCategory.HS;
};

// Mock Data for initial state
export const MOCK_SAMPLES: any[] = [];
