import { siteConfig } from "@/config/site";

export const CURRENCY_CODE = siteConfig.currency.code;
export const CURRENCY_LOCALE = siteConfig.currency.locale;

/** Format an amount in the store currency, e.g. "$12.50" or "Rs 1,250.00". */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
}

/** The free-shipping threshold, formatted for display copy, e.g. "$100". */
export const FREE_SHIPPING_LABEL = formatCurrency(
  siteConfig.shipping.freeThreshold,
  { minimumFractionDigits: 0, maximumFractionDigits: 0 }
);
