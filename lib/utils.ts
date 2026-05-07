// lib/utils.ts - CLIENT SAFE (no server imports)
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple auth helper for client
export const authHelpers = {
  setToken: (token: string) => {
    localStorage.setItem('token', token);
  },
  getToken: () => {
    return localStorage.getItem('token');
  },
  removeToken: () => {
    localStorage.removeItem('token');
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};