"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { client } from "@/sanity/lib/client";
import type { Product } from "@/sanity.types";
import type { PrizeProduct, SpinResult, WheelSlice, WheelState } from "@/types/wheel";
import {
  SPIN_COOKIE,
  WHEEL_MIN_SLICES,
  WHEEL_SLICE_COUNT,
  createPrizeToken,
  createSpinCookieValue,
  hasSpunToday,
  maxPrizePrice,
} from "@/lib/wheel";

const cleanIds = (ids: unknown): string[] =>
  Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === "string").slice(0, 100)
    : [];

/**
 * Builds today's wheel. Everyone sees the same products on a given day
 * (rotating through the eligible catalogue); products already in the
 * visitor's cart are left out so a free prize never collides with a paid line.
 */
export async function getWheelState(cartProductIds: string[] = []): Promise<WheelState> {
  const jar = await cookies();
  const spun = hasSpunToday(jar.get(SPIN_COOKIE)?.value);

  const candidates = await client
    .withConfig({ useCdn: false })
    .fetch<Array<{ _id: string; name?: string; price?: number }>>(
      `*[_type == "product" && stock > 0 && price > 0 && price <= $max && !(_id in $exclude)]
        | order(_id asc)[0...40]{ _id, name, price }`,
      { max: maxPrizePrice(), exclude: cleanIds(cartProductIds) }
    );

  if (candidates.length < WHEEL_MIN_SLICES) {
    return { hasSpunToday: spun, slices: [] };
  }

  // Rotate through the catalogue day by day.
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const offset = (dayNumber * 3) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];

  const slices: WheelSlice[] = rotated.slice(0, WHEEL_SLICE_COUNT).map((p) => ({
    id: p._id,
    name: p.name || "Mystery prize",
    price: p.price ?? 0,
  }));

  return { hasSpunToday: spun, slices };
}

/**
 * Spins the wheel. The winner is chosen here, on the server, from the slices
 * the visitor is looking at, so the animation always lands on the real prize.
 * One spin per day per browser (signed httpOnly cookie).
 */
export async function spinWheel(
  sliceIds: string[],
  cartProductIds: string[] = []
): Promise<SpinResult> {
  try {
    const jar = await cookies();
    if (hasSpunToday(jar.get(SPIN_COOKIE)?.value)) {
      return { ok: false, reason: "already_spun" };
    }

    const ids = cleanIds(sliceIds).slice(0, WHEEL_SLICE_COUNT);
    if (ids.length < WHEEL_MIN_SLICES) return { ok: false, reason: "unavailable" };

    // Re-check every slice against fresh data: still in stock, still cheap enough.
    const fresh = await client.withConfig({ useCdn: false }).fetch<Product[]>(
      `*[_type == "product" && _id in $ids && stock > 0 && price > 0 && price <= $max
          && !(_id in $exclude)]{..., "categories": categories[]->title}`,
      { ids, max: maxPrizePrice(), exclude: cleanIds(cartProductIds) }
    );
    const eligibleIds = new Set(fresh.map((p) => p._id));
    const pool = ids.filter((id) => eligibleIds.has(id));
    if (pool.length === 0) return { ok: false, reason: "unavailable" };

    const winnerId = pool[crypto.randomInt(0, pool.length)];
    const winnerIndex = ids.indexOf(winnerId);
    const winner = fresh.find((p) => p._id === winnerId)!;

    // Burn today's spin before answering.
    jar.set(SPIN_COOKIE, createSpinCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 48,
    });

    const prizeToken = createPrizeToken(winner._id);
    const product = {
      ...winner,
      price: 0,
      discount: 0,
      isPrize: true,
      prizeToken,
    } as unknown as PrizeProduct;

    return { ok: true, winnerIndex, product, prizeToken };
  } catch (error) {
    console.error("spinWheel failed:", error);
    return { ok: false, reason: "error" };
  }
}
