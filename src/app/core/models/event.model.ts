export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'organizer';
  avatarUrl?: string;
  organization?: string;
}

export type EventStatus =
  | 'draft'
  | 'registration-open'
  | 'registration-closed'
  | 'ongoing'
  | 'completed'
  | 'archived';

export interface Event {
  id: string;
  name: string;
  tagline?: string;
  description: string;
  category: 'conference' | 'workshop' | 'celebration' | 'seminar' | 'networking' | 'webinar';
  bannerUrl: string;
  bannerPosition?: string; // CSS background-position, e.g. 'center', 'top', '50% 20%'
  badgeColor?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  venue: string;
  address: string;
  registrationDeadline: string; // YYYY-MM-DD
  capacity: number;
  organizerId: string;
  organizerName: string;
  contactEmail: string;
  contactNumber: string;
  status: EventStatus;
  isWalkInAllowed: boolean;
  isRsvpEnabled: boolean;
  confirmationMessage?: string;
  customQuestions?: CustomQuestion[];
  createdAt: string;
  updatedAt: string;
}

export type CustomQuestionType = 'text' | 'number' | 'dropdown' | 'radio' | 'checkbox' | 'yes-no';

export interface CustomQuestion {
  id: string;
  eventId: string;
  question: string;
  type: CustomQuestionType;
  required: boolean;
  options?: string[]; // for dropdown, radio, checkbox
  order: number;
  placeholder?: string;
}

export interface CustomAnswer {
  questionId: string;
  questionText: string;
  answer: string | string[] | boolean | number;
}

export type RSVPStatus = 'attending' | 'maybe' | 'declined' | 'pending';
export type RegistrationType = 'pre-registered' | 'walk-in' | 'imported';
export type RegistrationSource = 'form' | 'excel-import' | 'walk-in';

export interface Registration {
  id: string; // e.g. EVT-2026-000123 or EVT-2026-W-000045
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  dietaryPreferences?: string;
  rsvpStatus: RSVPStatus;
  registrationType: RegistrationType;
  registrationSource: RegistrationSource;
  registrationDate: string; // ISO string
  qrToken: string; // Secure token e.g. tok_evt2026_x89f
  checkInStatus: boolean;
  checkInTime?: string; // ISO string
  checkedInBy?: string;
  customAnswers?: CustomAnswer[];
  notes?: string;
}

export interface CheckIn {
  id: string;
  eventId: string;
  registrationId: string;
  attendeeName: string;
  timestamp: string;
  checkedInBy: string;
  method: 'qr-scan' | 'manual' | 'walk-in-auto';
}

export interface ExcelAttendeeRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  rsvpStatus?: RSVPStatus;
  dietaryPreferences?: string;
  raw?: Record<string, any>;
  customAnswers?: CustomAnswer[];
  isValid?: boolean;
  errors?: string[];
  isDuplicate?: boolean;
  duplicateResolution?: 'skip' | 'update' | 'import-anyway';
}

export interface CustomMappedColumn {
  id: string;
  fieldLabel: string;
  sheetHeader: string;
}

export interface ColumnMapping {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  rsvpStatus: string;
  dietary: string;
  primaryKeyColumn?: string; // key of the column used as primary key / unique ID
  customColumns?: CustomMappedColumn[];
}
