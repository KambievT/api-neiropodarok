export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface DayEntry {
  id: string;
  contractorId?: string;
  description?: string;
  serviceType?: "individual" | "group";
  amount: number;
  cost?: number;
  duration?: number;
  completed?: boolean;
}

export type DayKey = string; // "YYYY-MM-DD"

export type EntriesByDay = Record<DayKey, DayEntry[]>;

export interface AuthRequestUser {
  id: string;
  email: string;
}
