/**
 * Gym store — persists gym profile and notification threshold settings.
 * Stored in localStorage so changes survive page refreshes.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GymInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface NotifSettings {
  /** Days before expiry to show red "critical" alert (default 7) */
  criticalDays: number;
  /** Days before expiry to show yellow "warning" alert (default 30) */
  warningDays: number;
  /** Days without check-in before student is considered inactive (default 14) */
  inactiveDays: number;
}

interface GymState extends GymInfo, NotifSettings {
  saveGymInfo: (data: GymInfo) => void;
  saveNotifSettings: (data: NotifSettings) => void;
}

const defaults: GymInfo & NotifSettings = {
  name: "Fitness Room",
  address: "",
  phone: "",
  email: "",
  website: "",
  criticalDays: 7,
  warningDays: 30,
  inactiveDays: 30,
};

export const useGymStore = create<GymState>()(
  persist(
    (set) => ({
      ...defaults,
      saveGymInfo: (data: GymInfo) => { set({ ...data }); },
      saveNotifSettings: (data: NotifSettings) => { set({ ...data }); },
    }),
    { name: "fitness-room-gym" }
  )
);
