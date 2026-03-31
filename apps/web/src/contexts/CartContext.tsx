import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addCartItemInSupabase,
  applyCouponInSupabase,
  fetchCartItemsFromSupabase,
  fetchOrdersFromSupabase,
  placeOrderInSupabase,
  removeCartItemFromSupabase,
  updateCartItemInSupabase,
} from "@/lib/supabase";
import { calculateDiscountedPrice } from "@/lib/commerce";
import { CartItem, CheckoutDetails, CouponResult, OrderRecord } from "@/types";

type CartContextValue = {
  items: CartItem[];
  orders: OrderRecord[];
  loading: boolean;
  ordersLoading: boolean;
  error: string;
  coupon: CouponResult | null;
  subtotal: number;
  total: number;
  discountAmount: number;
  itemCount: number;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  toggleSelected: (cartItemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  clearCoupon: () => void;
  placeOrder: (checkout: CheckoutDetails) => Promise<OrderRecord>;
  refreshCart: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);

  const refreshCart = async (): Promise<void> => {
    if (!user) {
      setItems([]);
      setCoupon(null);
      setLoading(false);
      return;
    }

    try {
      setItems(await fetchCartItemsFromSupabase());
      setError("");
    } catch (issue) {
      setItems([]);
      setError(issue instanceof Error ? issue.message : "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async (): Promise<void> => {
    if (!user) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    try {
      setOrders(await fetchOrdersFromSupabase());
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setOrdersLoading(true);
    void refreshCart();
    void refreshOrders();
  }, [user?.id]);

  const selectedItems = items.filter((item) => item.selected);
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + calculateDiscountedPrice(item.product.price, item.product.discount) * item.quantity,
    0,
  );
  const discountAmount = coupon?.discountAmount ?? 0;
  const total = Math.max(subtotal - discountAmount, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = async (productId: string, quantity: number): Promise<void> => {
    setItems(await addCartItemInSupabase(productId, quantity));
  };

  const updateQuantity = async (cartItemId: string, quantity: number): Promise<void> => {
    setItems(await updateCartItemInSupabase(cartItemId, { quantity }));
  };

  const removeItem = async (cartItemId: string): Promise<void> => {
    setItems(await removeCartItemFromSupabase(cartItemId));
  };

  const toggleSelected = async (cartItemId: string): Promise<void> => {
    const current = items.find((item) => item.id === cartItemId);
    if (!current) return;
    setItems(await updateCartItemInSupabase(cartItemId, { selected: !current.selected }));
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    const result = await applyCouponInSupabase(code, subtotal);
    setCoupon(result);
    return Boolean(result);
  };

  const clearCoupon = (): void => {
    setCoupon(null);
  };

  const placeOrder = async (checkout: CheckoutDetails): Promise<OrderRecord> => {
    const order = await placeOrderInSupabase(items, checkout, coupon);
    setCoupon(null);
    await refreshCart();
    await refreshOrders();
    return order;
  };

  const getItemQuantity = (productId: string): number =>
    items.find((item) => item.productId === productId)?.quantity ?? 0;

  const value = useMemo(
    () => ({
      items,
      orders,
      loading,
      ordersLoading,
      error,
      coupon,
      subtotal,
      total,
      discountAmount,
      itemCount,
      addToCart,
      updateQuantity,
      removeItem,
      toggleSelected,
      applyCoupon,
      clearCoupon,
      placeOrder,
      refreshCart,
      refreshOrders,
      getItemQuantity,
    }),
    [coupon, discountAmount, error, itemCount, items, loading, orders, ordersLoading, subtotal, total],
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
