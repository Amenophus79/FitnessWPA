"use client";

import { create } from "zustand";
import type { User } from "@/types/domain";

interface AuthState {
  user?: User;
  offlinePinUnlocked: boolean;
  setUser: (user?: User) => void;
  setOfflinePinUnlocked: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  offlinePinUnlocked: false,
  setUser: (user) => set({ user }),
  setOfflinePinUnlocked: (offlinePinUnlocked) => set({ offlinePinUnlocked })
}));
