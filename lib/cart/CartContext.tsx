"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";

export type CartAddon = { addonId: string; name: string; price: number };

export type CartItem = {
  lineId: string; // client-generated uuid per cart line
  menuId: string;
  menuName: string;
  unitPrice: number;
  addons: CartAddon[];
  quantity: number;
};

type CartState = { items: CartItem[] };

type Action =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; lineId: string }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD":
      return { items: [...state.items, action.item] };
    case "REMOVE":
      return { items: state.items.filter((i) => i.lineId !== action.lineId) };
    case "CLEAR":
      return { items: [] };
    case "HYDRATE":
      return { items: action.items };
  }
}

type CartContextValue = CartState & {
  addItem: (item: CartItem) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
  total: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "smoothie_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", items: JSON.parse(raw) });
    } catch {}
  }, []);

  // Persist on every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const total = state.items.reduce(
    (sum, item) =>
      sum +
      (item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) *
        item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem: (item) => dispatch({ type: "ADD", item }),
        removeItem: (lineId) => dispatch({ type: "REMOVE", lineId }),
        clear: () => dispatch({ type: "CLEAR" }),
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
