"use client";

import { formatCurrency } from "@/lib/currency";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gift, Loader2, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { spinWheel } from "@/actions/wheelActions";
import { urlFor } from "@/sanity/lib/image";
import useCartStore from "@/store";
import type { PrizeProduct, WheelSlice } from "@/types/wheel";

export const PENDING_PRIZE_KEY = "wheel:pendingPrize";

type PendingPrize = { product: PrizeProduct; token: string; exp: number };

export const readPendingPrize = (): PendingPrize | null => {
  try {
    const raw = localStorage.getItem(PENDING_PRIZE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPrize;
    if (!parsed?.product?._id || !parsed.token || parsed.exp < Date.now()) {
      localStorage.removeItem(PENDING_PRIZE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const SLICE_COLORS = [
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

const SPIN_MS = 5000;
const CX = 200;
const CY = 200;
const R = 192;

// Angle is measured clockwise from 12 o'clock.
const pointOnCircle = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) };
};

const slicePath = (index: number, count: number) => {
  const seg = 360 / count;
  const start = pointOnCircle(index * seg, R);
  const end = pointOnCircle((index + 1) * seg, R);
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y} Z`;
};

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

type Phase = "idle" | "spinning" | "won";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slices: WheelSlice[];
  hasSpunToday: boolean;
  /** Called after a spin has used up today's turn. */
  onSpun: () => void;
  /** Called when the prize has been put in the cart. */
  onClaimed: () => void;
};

export default function SpinWheel({
  open,
  onOpenChange,
  slices,
  hasSpunToday,
  onSpun,
  onClaimed,
}: Props) {
  const router = useRouter();
  const addPrizeItem = useCartStore((s) => s.addPrizeItem);

  const [phase, setPhase] = useState<Phase>("idle");
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState<PendingPrize | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reopening after an unclaimed win: jump straight to the prize.
  useEffect(() => {
    if (!open) return;
    const pending = readPendingPrize();
    if (pending) {
      setPrize(pending);
      setPhase("won");
    }
  }, [open]);

  // Closed (and not mid-spin): reset so the next opening starts clean.
  useEffect(() => {
    if (!open && phase !== "spinning") {
      setPhase("idle");
      setPrize(null);
    }
  }, [open, phase]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const count = slices.length;
  const seg = count > 0 ? 360 / count : 0;

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const duration = reducedMotion ? 400 : SPIN_MS;

  const handleSpin = async () => {
    if (phase !== "idle" || hasSpunToday || count < 3) return;
    setPhase("spinning");

    const cartIds = useCartStore.getState().items.map((i) => i.product._id);
    const result = await spinWheel(
      slices.map((s) => s.id),
      cartIds
    );

    if (!result.ok) {
      setPhase("idle");
      if (result.reason === "already_spun") {
        toast.info("You've already spun today. Come back tomorrow!");
        onSpun();
      } else if (result.reason === "unavailable") {
        toast.error("The prizes just changed. Please reopen the wheel.");
        onOpenChange(false);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }

    // Land the winning slice's centre under the pointer at the top.
    const centre = (result.winnerIndex + 0.5) * seg;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    setRotation(360 * 6 - centre + jitter);

    const won: PendingPrize = {
      product: result.product,
      token: result.prizeToken,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };
    try {
      localStorage.setItem(PENDING_PRIZE_KEY, JSON.stringify(won));
    } catch {
      /* storage can be unavailable; the prize is still shown below */
    }
    onSpun();

    timer.current = setTimeout(() => {
      setPrize(won);
      setPhase("won");
    }, duration + 300);
  };

  const handleClaim = () => {
    if (!prize) return;
    const added = addPrizeItem(prize.product, prize.token);
    if (!added) {
      toast.error(
        "You can't claim this prize while the same item (or another prize) is in your cart."
      );
      return;
    }
    try {
      localStorage.removeItem(PENDING_PRIZE_KEY);
    } catch {
      /* ignore */
    }
    toast.success(`${prize.product.name} added to your cart for free!`);
    onClaimed();
    onOpenChange(false);
    router.push("/cart");
  };

  const prizeImage = prize?.product.images?.[0]
    ? urlFor(prize.product.images[0]).width(480).height(480).url()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto p-0 sm:max-w-[520px]">
        <div className="bg-linear-to-r from-red-500 to-orange-500 px-6 py-5 text-center text-white">
          <DialogTitle className="text-2xl font-bold">Spin &amp; Win 🎁</DialogTitle>
          <DialogDescription className="mt-1 text-white/90">
            One free spin a day. Every slice is a free product.
          </DialogDescription>
        </div>

        {phase !== "won" && (
          <div className="flex flex-col items-center gap-5 bg-gray-50 px-4 pb-8 pt-6">
            <div className="relative aspect-square w-full max-w-[380px]">
              {/* Pointer */}
              <svg
                viewBox="0 0 40 40"
                className="absolute left-1/2 top-0 z-20 h-9 w-9 -translate-x-1/2 -translate-y-1 drop-shadow"
                aria-hidden="true"
              >
                <polygon points="4,4 36,4 20,36" fill="#dc2626" stroke="#fff" strokeWidth="3" />
              </svg>

              <div
                className="h-full w-full rounded-full shadow-[0_0_25px_rgba(0,0,0,0.25)]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition:
                    phase === "spinning"
                      ? `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                      : "none",
                }}
              >
                <svg
                  viewBox="0 0 400 400"
                  className="h-full w-full"
                  role="img"
                  aria-label="Prize wheel"
                >
                  <circle cx={CX} cy={CY} r={R + 6} fill="#e5e7eb" />
                  {slices.map((slice, i) => {
                    const centre = (i + 0.5) * seg;
                    return (
                      <g key={slice.id}>
                        <path
                          d={slicePath(i, count)}
                          fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <g transform={`rotate(${centre} ${CX} ${CY})`}>
                          <text
                            transform={`translate(${CX - 4} ${CY - 62}) rotate(-90)`}
                            fill="#fff"
                            fontSize="15"
                            fontWeight="700"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="3"
                            paintOrder="stroke"
                          >
                            {truncate(slice.name, 15)}
                          </text>
                          <text
                            transform={`translate(${CX + 14} ${CY - 62}) rotate(-90)`}
                            fill="#fef08a"
                            fontSize="13"
                            fontWeight="700"
                            stroke="rgba(0,0,0,0.35)"
                            strokeWidth="3"
                            paintOrder="stroke"
                          >
                            {formatCurrency(slice.price)} value
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  <circle cx={CX} cy={CY} r="30" fill="#fff" stroke="#e5e7eb" strokeWidth="4" />
                  <text
                    x={CX}
                    y={CY + 5}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="800"
                    fill="#dc2626"
                  >
                    WIN
                  </text>
                </svg>
              </div>
            </div>

            <Button
              onClick={handleSpin}
              disabled={phase === "spinning" || hasSpunToday || count < 3}
              className="h-12 rounded-full bg-linear-to-r from-red-500 via-orange-500 to-red-500 px-10 text-lg font-bold text-white shadow-lg hover:scale-105 disabled:opacity-60"
            >
              {phase === "spinning" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Spinning…
                </>
              ) : hasSpunToday ? (
                "Come back tomorrow"
              ) : (
                <>
                  <Gift className="mr-2 h-5 w-5" /> SPIN NOW
                </>
              )}
            </Button>
          </div>
        )}

        {phase === "won" && prize && (
          <div className="flex flex-col items-center gap-4 bg-gray-50 px-6 pb-8 pt-6 text-center">
            <h3 className="text-2xl font-bold text-emerald-600">🎉 Congratulations! 🎉</h3>
            <div className="relative">
              <span className="absolute -right-3 -top-3 z-10 rounded-full bg-red-600 px-3 py-1 text-sm font-black text-white shadow">
                FREE
              </span>
              <div className="relative h-52 w-52 overflow-hidden rounded-xl border-2 border-yellow-400 bg-white shadow-lg">
                {prizeImage ? (
                  <Image
                    src={prizeImage}
                    alt={prize.product.name || "Your prize"}
                    fill
                    sizes="208px"
                    className="object-cover"
                  />
                ) : (
                  <Gift className="m-auto h-full w-16 text-gray-300" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">You won</p>
              <p className="text-lg font-semibold text-gray-900">{prize.product.name}</p>
            </div>
            <Button
              onClick={handleClaim}
              className="h-12 w-full rounded-full bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add my free prize to cart
            </Button>
            <p className="text-xs text-muted-foreground">
              Your prize is held for 24 hours. Shipping and tax still apply at checkout.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
