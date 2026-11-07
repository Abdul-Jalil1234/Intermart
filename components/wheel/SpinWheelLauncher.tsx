"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Gift } from "lucide-react";
import { getWheelState } from "@/actions/wheelActions";
import useCartStore from "@/store";
import type { WheelState } from "@/types/wheel";
import SpinWheel, { readPendingPrize } from "./SpinWheel";

const DISMISSED_KEY = "wheel:dismissedDay";
const AUTO_OPEN_DELAY_MS = 2500;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Mounts the Spin & Win wheel for the whole storefront:
 * - on the home page it opens by itself once a day;
 * - everywhere else a floating button lets visitors open it.
 */
export default function SpinWheelLauncher() {
  const pathname = usePathname();
  const [state, setState] = useState<WheelState | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const cartIds = useCartStore.getState().items.map((i) => i.product._id);
      setState(await getWheelState(cartIds));
    } catch (error) {
      console.error("Could not load the wheel:", error);
      setState(null);
    }
    setHasPending(readPendingPrize() !== null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canSpin = !!state && !state.hasSpunToday && state.slices.length >= 3;
  const available = canSpin || hasPending;

  // Auto-open once per day on the home page.
  useEffect(() => {
    if (!available || pathname !== "/") return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === today();
    } catch {
      /* ignore */
    }
    if (dismissed && !hasPending) return;
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [available, hasPending, pathname]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(DISMISSED_KEY, today());
      } catch {
        /* ignore */
      }
      setHasPending(readPendingPrize() !== null);
    }
  };

  if (!state || !available) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-linear-to-r from-red-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-xl transition-transform hover:scale-105"
        aria-label={hasPending ? "Claim your prize" : "Spin and win"}
      >
        <Gift className="h-5 w-5 animate-bounce" />
        {hasPending ? "Claim your prize" : "Spin & Win"}
      </button>

      <SpinWheel
        open={open}
        onOpenChange={handleOpenChange}
        slices={state.slices}
        hasSpunToday={state.hasSpunToday}
        onSpun={() => {
          setState((s) => (s ? { ...s, hasSpunToday: true } : s));
          setHasPending(true);
        }}
        onClaimed={() => setHasPending(false)}
      />
    </>
  );
}
