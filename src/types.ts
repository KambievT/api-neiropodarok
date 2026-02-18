export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface DayEntry {
  id: string;
  clientName: string;
  amount: number;
  cost?: number;
  completed?: boolean;
}

export type DayKey = string; // "YYYY-MM-DD"

export type EntriesByDay = Record<DayKey, DayEntry[]>;

export interface AuthRequestUser {
  id: string;
  email: string;
}

