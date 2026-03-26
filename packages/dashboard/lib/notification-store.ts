import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationType =
  | "bounty_new"
  | "bounty_claimed"
  | "bounty_submitted"
  | "bounty_completed"
  | "bounty_disputed"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const notification: Notification = {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },
    }),
    {
      name: "botbrained-notifications",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage)
      ),
    }
  )
);
