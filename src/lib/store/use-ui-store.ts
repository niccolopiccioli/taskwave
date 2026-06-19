import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'teal' | 'violet' | 'amber' | 'rose';

export interface NotificationPrefs {
  email: boolean;
  taskAssigned: boolean;
  workspaceUpdates: boolean;
  weeklyDigest: boolean;
}

interface UIState {
  sidebarOpen: boolean;
  theme: ThemeMode;
  accent: AccentColor;
  compactMode: boolean;
  reduceMotion: boolean;
  notifications: NotificationPrefs;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void;
}

const defaultNotifications: NotificationPrefs = {
  email: true,
  taskAssigned: true,
  workspaceUpdates: true,
  weeklyDigest: false,
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      accent: 'teal',
      compactMode: false,
      reduceMotion: false,
      notifications: defaultNotifications,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setNotification: (key, value) =>
        set((state) => ({
          notifications: { ...state.notifications, [key]: value },
        })),
    }),
    { name: 'taskwave-ui-preferences' }
  )
);

export const ACCENT_OPTIONS: Array<{
  id: AccentColor;
  label: string;
  hsl: string;
  ring: string;
}> = [
  { id: 'teal', label: 'Teal', hsl: '168 76% 42%', ring: 'ring-teal-500' },
  { id: 'violet', label: 'Viola', hsl: '262 83% 58%', ring: 'ring-violet-500' },
  { id: 'amber', label: 'Ambra', hsl: '38 92% 50%', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rosa', hsl: '350 89% 60%', ring: 'ring-rose-500' },
];
