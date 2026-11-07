import { memo } from "react";
import { Product } from "@/sanity.types";
import PriceView from "./PriceView";
import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import Title from "./Title";
import { StarIcon } from "@sanity/icons";
import ProductSideMenu from "./ProductSideMenu";
import { Flame } from "lucide-react";
import { image } from "@/sanity/image";

const ProductCard = memo(({ product }: { product: Product }) => {
  return (
    <div className="text-sm border rounded-md border-dark-blue/20 group bg-white">
      <div className="relative group overflow-hidden bg-shop_light_bg">
        {product?.images && (
          <Link href={`/product/${product?.slug?.current}`}>
            <img
              src={image(product.images[0]).size(900, 880).url()}
              className={`w-full h-64 object-contain overflow-hidden transition-transform bg-shop_light_bg duration-500 
                ${
                  product?.stock !== 0 ? "group-hover:scale-105" : "opacity-50"
                }`}
              alt="productImage"
              loading="lazy"
            />
            {/* <Image
              src={urlFor(product.images[0]).url()}
              alt="productImage"
              width={500}
              height={500}
              priority
              className={`w-full h-64 object-contain overflow-hidden transition-transform bg-shop_light_bg duration-500 
              ${product?.stock !== 0 ? "group-hover:scale-105" : "opacity-50"}`}
            /> */}
          </Link>
        )}
        <ProductSideMenu product={product} />
        {product?.status === "sale" ? (
          <p className="absolute top-2 left-2 z-10 text-xs border border-dark-color/50 px-2 rounded-full group-hover:border-light-green hover:text-shop_dark_green hoverEffect">
            Sale!
          </p>
        ) : (
          <Link
            href={"/deal"}
            className="absolute top-2 left-2 z-10 border border-shop_orange/50 p-1 rounded-full group-hover:border-shop_orange hover:text-shop_dark_green hoverEffect"
          >
            <Flame
              size={18}
              fill="#fb6c08"
              className="text-shop_orange/50 group-hover:text-shop_orange hoverEffect"
            />
          </Link>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        {product?.categories && (
          <p className="uppercase line-clamp-1 text-xs font-medium text-light-text">
            {product.categories.map((cat) => cat).join(", ")}
          </p>
        )}
        <Title className="text-sm line-clamp-1">{product?.name}</Title>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, index) => (
              <StarIcon
                key={index}
                className={
                  index < Math.round(product?.averageRating || 0)
                    ? "text-shop_light_green"
                    : " text-light-text"
                }
                fill={
                  index < Math.round(product?.averageRating || 0)
                    ? "#93D991"
                    : "#ababab"
                }
              />
            ))}
          </div>
          <p className="text-light-text text-xs tracking-wide">
            {product?.totalReviews
              ? `${product.totalReviews} ${
                  product.totalReviews === 1 ? "Review" : "Reviews"
                }`
              : "No Reviews"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <p className="font-medium">In Stock</p>
          <p
            className={`${
              product?.stock === 0
                ? "text-red-600"
                : "text-shop_dark_green/80 font-semibold"
            }`}
          >
            {(product?.stock as number) > 0 ? product?.stock : "unavailable"}
          </p>
        </div>

        <PriceView
          price={product?.price}
          discount={product?.discount}
          className="text-sm"
        />
        <AddToCartButton product={product} className="w-36 rounded-full" />
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
