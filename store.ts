import { Product } from "./sanity.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import _ from "lodash";
import type { PrizeProduct } from "./types/wheel";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreState {
  items: CartItem[];
  addItem: (product: Product) => void;
  addMultipleItems: (
    products: Array<{ product: Product; quantity: number }>
  ) => void;
  removeItem: (productId: string) => void;
  deleteCartProduct: (productId: string) => void;
  resetCart: () => void;
  getTotalPrice: () => number;
  getSubTotalPrice: () => number;
  getTotalDiscount: () => number;
  getItemCount: (productId: string) => number;
  getGroupedItems: () => CartItem[];
  // Spin & Win prize: one free unit, quantity locked to 1
  addPrizeItem: (product: Product, prizeToken: string) => boolean;
  isPrizeItem: (productId: string) => boolean;
  // favorite
  favoriteProduct: Product[];
  addToFavorite: (product: Product) => Promise<void>;
  removeFromFavorite: (productId: string) => void;
  resetFavorite: () => void;
  // order placement state
  isPlacingOrder: boolean;
  orderStep: "validating" | "creating" | "emailing" | "redirecting";
  setOrderPlacementState: (
    isPlacing: boolean,
    step?: "validating" | "creating" | "emailing" | "redirecting"
  ) => void;
}

const useCartStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      favoriteProduct: [],
      addItem: (product) =>
        set((state) => {
          const existingItem = _.find(
            state.items,
            (item) => item.product._id === product._id
          );
          if (existingItem) {
            // A Spin & Win prize is a single free unit: never increment it.
            if ((existingItem.product as PrizeProduct).isPrize) return state;
            return {
              items: _.map(state.items, (item) =>
                item.product._id === product._id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          } else {
            return { items: [...state.items, { product, quantity: 1 }] };
          }
        }),
      addMultipleItems: (products) =>
        set((state) => {
          let updatedItems = [...state.items];

          _.forEach(products, ({ product, quantity }) => {
            const existingItem = _.find(
              updatedItems,
              (item) => item.product._id === product._id
            );

            if (existingItem && (existingItem.product as PrizeProduct).isPrize) {
              return; // keep the free prize line untouched
            }

            if (existingItem) {
              updatedItems = _.map(updatedItems, (item) =>
                item.product._id === product._id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              updatedItems.push({ product, quantity });
            }
          });

          return { items: updatedItems };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: _.reduce(
            state.items,
            (acc: CartItem[], item) => {
              if (item.product._id === productId) {
                if (item.quantity > 1) {
                  acc.push({ ...item, quantity: item.quantity - 1 });
                }
              } else {
                acc.push(item);
              }
              return acc;
            },
            [] as CartItem[]
          ),
        })),
      deleteCartProduct: (productId) =>
        set((state) => ({
          items: _.filter(
            state.items,
            ({ product }) => product?._id !== productId
          ),
        })),
      resetCart: () => set({ items: [] }),
      getTotalPrice: () => {
        // This should be the final payable amount (current/discounted prices)
        return _.reduce(
          get().items,
          (total, item) => total + (item.product.price ?? 0) * item.quantity,
          0
        );
      },
      getSubTotalPrice: () => {
        // This should be the gross amount (before discount)
        return _.reduce(
          get().items,
          (total, item) => {
            const currentPrice = item.product.price ?? 0;
            const discount = item.product.discount ?? 0;
            const discountAmount = (discount * currentPrice) / 100;
            const grossPrice = currentPrice + discountAmount;
            return total + grossPrice * item.quantity;
          },
          0
        );
      },
      getTotalDiscount: () => {
        // New function to get total discount amount
        return _.reduce(
          get().items,
          (total, item) => {
            const currentPrice = item.product.price ?? 0;
            const discount = item.product.discount ?? 0;
            const discountAmount = (discount * currentPrice) / 100;
            return total + discountAmount * item.quantity;
          },
          0
        );
      },
      getItemCount: (productId) => {
        const item = _.find(
          get().items,
          (item) => item.product._id === productId
        );
        return item ? item.quantity : 0;
      },
      getGroupedItems: () => get().items,
      addPrizeItem: (product, prizeToken) => {
        const state = get();
        // One prize line at a time, and never on top of a paid line of the same product.
        const hasPrize = _.some(
          state.items,
          (item) => (item.product as PrizeProduct).isPrize
        );
        const alreadyInCart = _.some(
          state.items,
          (item) => item.product._id === product._id
        );
        if (hasPrize || alreadyInCart) return false;

        const prizeProduct: PrizeProduct = {
          ...product,
          price: 0,
          discount: 0,
          isPrize: true,
          prizeToken,
        };
        set({ items: [...state.items, { product: prizeProduct, quantity: 1 }] });
        return true;
      },
      isPrizeItem: (productId) =>
        _.some(
          get().items,
          (item) =>
            item.product._id === productId &&
            Boolean((item.product as PrizeProduct).isPrize)
        ),
      addToFavorite: (product: Product) => {
        return new Promise<void>((resolve) => {
          set((state: StoreState) => {
            const isFavorite = _.some(
              state.favoriteProduct,
              (item) => item._id === product._id
            );
            return {
              favoriteProduct: isFavorite
                ? _.filter(
                    state.favoriteProduct,
                    (item) => item._id !== product._id
                  )
                : [...state.favoriteProduct, { ...product }],
            };
          });
          resolve();
        });
      },
      removeFromFavorite: (productId: string) => {
        set((state: StoreState) => ({
          favoriteProduct: _.filter(
            state.favoriteProduct,
            (item) => item?._id !== productId
          ),
        }));
      },
      resetFavorite: () => {
        set({ favoriteProduct: [] });
      },
      // order placement state
      isPlacingOrder: false,
      orderStep: "validating" as const,
      setOrderPlacementState: (isPlacing, step = "validating") => {
        set({
          isPlacingOrder: isPlacing,
          orderStep: step,
        });
      },
    }),
    { name: "intermart-cart-store" }
  )
);

export default useCartStore;
