import { formatCurrency } from "@/lib/currency";
import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  amount: number | undefined;
  className?: string;
}

const PriceFormatter = memo(({ amount, className }: Props) => {
  const formattedPrice = formatCurrency(amount);
  return (
    <span
      className={twMerge("text-sm font-semibold text-dark-color", className)}
    >
      {formattedPrice}
    </span>
  );
});

PriceFormatter.displayName = "PriceFormatter";

export default PriceFormatter;
