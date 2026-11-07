// Server-only helpers for the Spin & Win wheel.
// Only import this from server code (server actions, route handlers).
import crypto from "crypto";

export const SPIN_COOKIE = "wheel_spin";
export const PRIZE_TTL_MS = 24 * 60 * 60 * 1000; // a won prize can be claimed/used for 24h
export const WHEEL_SLICE_COUNT = 8;
export const WHEEL_MIN_SLICES = 3;

function getSecret(): string {
  const secret = process.env.WHEEL_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-wheel-secret-change-me";
  }
  throw new Error("WHEEL_SECRET must be set (16+ characters) in production");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function signPayload(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyPayload<T>(token: unknown): T | null {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(hmac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Calendar day in UTC, e.g. "2026-10-21". One spin per day per browser. */
export const todayUTC = () => new Date().toISOString().slice(0, 10);

/** Products above this price are never offered as wheel prizes. */
export const maxPrizePrice = () => {
  const n = Number(process.env.WHEEL_MAX_PRIZE_PRICE);
  return Number.isFinite(n) && n > 0 ? n : 50;
};

type SpinCookiePayload = { day: string };

export const createSpinCookieValue = () => signPayload({ day: todayUTC() } satisfies SpinCookiePayload);

export function hasSpunToday(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const payload = verifyPayload<SpinCookiePayload>(cookieValue);
  return payload?.day === todayUTC();
}

type PrizePayload = { pid: string; exp: number; nonce: string };

export function createPrizeToken(productId: string): string {
  return signPayload({
    pid: productId,
    exp: Date.now() + PRIZE_TTL_MS,
    nonce: crypto.randomUUID(),
  } satisfies PrizePayload);
}

/** Returns the verified payload, or null if the token is forged, expired or for another product. */
export function verifyPrizeToken(token: unknown, productId: string): PrizePayload | null {
  const payload = verifyPayload<PrizePayload>(token);
  if (!payload || payload.pid !== productId || payload.exp < Date.now()) return null;
  return payload;
}

/** Stable id for the one-time redemption record of a prize token. */
export const redemptionId = (nonce: string) =>
  `wheelRedemption.${crypto.createHash("sha256").update(nonce).digest("hex").slice(0, 32)}`;
