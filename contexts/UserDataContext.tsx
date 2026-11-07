"use client";

import { toast } from "sonner";
import { siteConfig } from "@/config/site";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useUser } from "@clerk/nextjs";

interface UserData {
  ordersCount: number;
  isEmployee: boolean;
  unreadNotifications: number;
  walletBalance: number;
  isLoading: boolean;
}

interface UserDataContextType extends UserData {
  refreshUserData: () => Promise<void>;
  /** Set the bell's unread count immediately (e.g. after reading/deleting notifications). */
  setUnreadNotifications: (count: number) => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(
  undefined
);

// Cache for user data to prevent unnecessary API calls
let cachedData: UserData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds
const POLL_MS = siteConfig.realtime.notificationPollSeconds * 1000;

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [userData, setUserData] = useState<UserData>({
    ordersCount: 0,
    isEmployee: false,
    unreadNotifications: 0,
    walletBalance: 0,
    isLoading: false,
  });

  const fetchUserData = useCallback(
    async (forceRefresh = false) => {
      if (!user || !isLoaded) return;

      // Use cached data if available and not expired
      const now = Date.now();
      if (
        !forceRefresh &&
        cachedData &&
        now - cacheTimestamp < CACHE_DURATION
      ) {
        setUserData(cachedData);
        return;
      }

      setUserData((prev) => ({ ...prev, isLoading: true }));

      try {
        // Fetch all user data in a single optimized API call
        const response = await fetch("/api/user/combined-data", {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();

          const newUserData = {
            ordersCount: data.ordersCount || 0,
            isEmployee: data.isEmployee || false,
            unreadNotifications: data.unreadNotifications || 0,
            walletBalance: data.walletBalance || 0,
            isLoading: false,
          };

          // Update cache
          cachedData = newUserData;
          cacheTimestamp = now;

          setUserData(newUserData);
        } else {
          setUserData((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserData((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [user, isLoaded]
  );

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData();
    }
  }, [user, isLoaded, fetchUserData]);

  // Near real-time notifications: poll a tiny count endpoint while the tab is visible,
  // and show a toast when something new arrives.
  const lastCountRef = useRef(0);
  useEffect(() => {
    lastCountRef.current = userData.unreadNotifications;
  }, [userData.unreadNotifications]);

  useEffect(() => {
    if (!isLoaded || !user || POLL_MS <= 0) return;

    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/user/notifications/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const { count } = (await res.json()) as { count: number };
        if (count > lastCountRef.current) {
          toast.info("You have a new notification", {
            action: {
              label: "View",
              onClick: () => window.location.assign("/user/notifications"),
            },
          });
        }
        if (count !== lastCountRef.current) {
          cachedData = null;
          setUserData((prev) => ({ ...prev, unreadNotifications: count }));
        }
      } catch {
        /* network hiccup: try again on the next tick */
      }
    };

    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLoaded, user]);

  const setUnreadNotifications = useCallback((count: number) => {
    lastCountRef.current = count;
    setUserData((prev) => ({ ...prev, unreadNotifications: count }));
    if (cachedData) cachedData = { ...cachedData, unreadNotifications: count };
  }, []);

  const refreshUserData = useCallback(async () => {
    await fetchUserData(true);
  }, [fetchUserData]);

  return (
    <UserDataContext.Provider
      value={{
        ...userData,
        refreshUserData,
        setUnreadNotifications,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
}
