import type { Product } from "@/sanity.types";

/** A wheel segment shown to the visitor. */
export type WheelSlice = {
  id: string;
  name: string;
  price: number;
};

/** A cart product that was won on the wheel: free, quantity locked to 1. */
export type PrizeProduct = Product & {
  isPrize?: true;
  prizeToken?: string;
};

export type WheelState = {
  hasSpunToday: boolean;
  slices: WheelSlice[];
};

export type SpinResult =
  | {
      ok: true;
      winnerIndex: number;
      product: PrizeProduct;
      prizeToken: string;
    }
  | { ok: false; reason: "already_spun" | "unavailable" | "error" };
