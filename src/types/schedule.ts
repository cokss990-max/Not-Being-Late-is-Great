export type SessionPhase = 'teaching' | 'break';

export type NavSection = 'today' | 'appointments' | 'todos' | 'week';

export type AppointmentCategory = 'Teaching' | 'Meeting' | 'Prep' | 'Personal';

export type TodoPriority = 'High' | 'Medium' | 'Low';

export interface AlertRecord {
  id: string;
  phase: SessionPhase;
  blockNumber: number;
  firedAt: string;
  message: string;
  isPreview?: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: AppointmentCategory;
  location: string;
  notes: string;
}

export interface TodoItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  priority: TodoPriority;
  completed: boolean;
  notes: string;
}

export const TEACHING_DURATION_SECONDS = 25 * 60;
export const BREAK_DURATION_SECONDS = 5 * 60;
export const WARNING_THRESHOLD_SECONDS = 60;
