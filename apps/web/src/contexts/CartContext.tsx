import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartItem } from "@/types";

type CartContextValue = {
  items: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  getItemQuantity: (productId: string) => number;
  itemCount: number;
};

const STORAGE_KEY = "happypets-cart";
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setItems(JSON.parse(raw) as CartItem[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (productId: string, quantity: number): void => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) {
        return [...current, { productId, quantity }];
      }

      return current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      );
    });
  };

  const getItemQuantity = (productId: string): number =>
    items.find((item) => item.productId === productId)?.quantity ?? 0;

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(
    () => ({
      items,
      addToCart,
      getItemQuantity,
      itemCount,
    }),
    [itemCount, items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
