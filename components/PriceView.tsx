import { twMerge } from "tailwind-merge";
import PriceFormatter from "./PriceFormatter";
import { cn } from "@/lib/utils";

interface Props {
  price: number | undefined;
  discount: number | undefined;
  className?: string;
}

const PriceView = ({ price, discount, className }: Props) => {
  // Current/payable price is the actual price (discounted price)
  const currentPrice = price || 0;

  // Gross price = current price + discount amount
  const discountAmount =
    discount && currentPrice ? (discount * currentPrice) / 100 : 0;
  const grossPrice = currentPrice + discountAmount;

  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex items-center gap-2">
        {/* Current/Payable Price (discounted price) */}
        <PriceFormatter
          amount={currentPrice}
          className={cn("text-shop_dark_green font-semibold", className)}
        />

        {/* Gross Price (original price before discount) - only show if there's a discount */}
        {discount && discountAmount > 0 && (
          <div className="flex items-center gap-1">
            <PriceFormatter
              amount={grossPrice}
              className={twMerge(
                "line-through text-xs font-normal text-zinc-500",
                className
              )}
            />
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
              -{discount}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceView;
