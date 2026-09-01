import { Region, Crop, Pathogen, SampleStatus, ResistanceCategory, CultivationSystem } from './types';

export const APP_NAME = "ON-LAB-IL";
export const ARCGIS_API_KEY = "AAPTagIE2A182txSOGAD12mbyFg..fxf08-5BN6pGVV_13YioS5tXqRFfpODTP9UiISuQO063N6ewYSe5gXro_bZGJGqcqaj16nHb5-ocZtEKpzPKLX_u4F9_K2gIAMRhBue3L0rDyQl3gBhxTtQwtXK_KOz5LjLuLv9m6y0jWgZ0mL54pBfbxJ8VypqjKQPPJdgz1nZaY8Itw6NKPZsj6vI6kkjxig_B_CgSnG_x_5qK9plX1JvwPh8Gcfq5-OBwsaqKG9nT_x4gQsJI2A..AT1_qlwulQnS";

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
