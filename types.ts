export type Role = 'FIELD_AGENT' | 'LAB_RESEARCHER' | 'MANAGER';

export enum Region {
  ARAVA = 'ערבה',
  JORDAN_VALLEY = 'בקעת הירדן',
  BESOR = 'חבל הבשור',
  WESTERN_NEGEV = 'נגב מערבי',
  BEIT_SHEAN = 'עמק בית שאן',
  GALILEE = 'גליל עליון'
}

export enum Crop {
  PEPPER = 'פלפל',
  CUCUMBER = 'מלפפון',
  TOMATO = 'עגבנייה',
  EGGPLANT = 'חציל',
  BASIL = 'בזיליקום',
  STRAWBERRY = 'תות שדה'
}

export enum Pathogen {
  BOTRYTIS = 'Botrytis cinerea',
  PODOSPHAERA = 'Podosphaera xanthii',
  ALTERNARIA = 'Alternaria alternata'
}

export enum SampleStatus {
  SENT = 'נשלחה',
  PENDING_LAB_CONFIRMATION = 'ממתינה לאישור קבלה במעבדה',
  RECEIVED_LAB = 'התקבל במעבדה',
  IN_TESTING = 'בתהליך בדיקה',
  RESULTS_ENTERED = 'תוצאות הוזנו'
}

export enum ResistanceCategory {
  HS = 'HS (רגיש מאוד)',
  S = 'S (רגיש)',
  RS = 'RS (רגישות מופחתת)',
  T = 'T (סביל)',
  R = 'R (עמיד)'
}

export enum CultivationSystem {
  GREENHOUSE = 'חממה',
  OPEN_FIELD = 'שדה פתוח',
  NET_HOUSE = 'בית רשת',
  TUNNEL = 'מנהרה',
  OTHER = 'אחר'
}

export enum ApplicationMethod {
  SPRAYING = 'ריסוס',
  DRENCHING = 'הגמעה', // Added Drenching
  DRIP = 'טפטוף',
  POWDER = 'אבקה',
  SOAKING = 'השרייה',
  OTHER = 'אחר'
}

export interface PesticideTreatment {
  id: string;
  material: string;
  date: string;
  dosage: string;
  method: ApplicationMethod;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SampleEvent {
  id: string;
  timestamp: string;
  type: 'CREATED' | 'STATUS_CHANGE' | 'RESULT_ADDED' | 'RESULT_UPDATED' | 'LAB_CONFIRMATION' | 'NOTE_ADDED';
  user: string;
  description: string;
}

export interface Sample {
  id: string;
  internalId: string;
  collectorName: string;
  collectorPhone: string;
  collectorEmail: string;
  date: string; // ISO string
  region: Region;
  crop: string; // Changed from enum to string for flexibility
  variety: string;
  cultivationSystem: string; // Changed from enum to string for flexibility
  pathogen: Pathogen;
  coordinates: GeoPoint;
  status: SampleStatus;
  isArchived?: boolean; // New flag for archive visibility
  notes?: string;
  imageUrl?: string;
  municipality?: string;
  plotName?: string;
  lab?: string;
  priority?: string;
  pesticideHistory: PesticideTreatment[];
  history: SampleEvent[]; // New history audit trail
  results?: SensitivityTest[]; // Integrated lab results provided by Firestore
}

export interface Isolate {
  id: string;
  sampleId: string;
  labId: string; // e.g., LAB-001
  creationDate: string;
}

export interface SensitivityTest {
  id: string;
  material: string;
  dosage: string;
  category: ResistanceCategory;
  date: string; // ISO string
  user: string;
  notes?: string;
}

export interface TestResult {
  id: string;
  isolateId: string;
  tests: SensitivityTest[]; // New structure for detailed sensitivity mapping
  summaryResistance: ResistanceCategory;
}

// Stats for dashboard
export interface ResistanceStat {
  region: string;
  resistantCount: number;
  totalCount: number;
}
