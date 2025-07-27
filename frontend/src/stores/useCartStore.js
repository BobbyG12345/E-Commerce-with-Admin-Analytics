import { create } from "zustand";
import axios from "../lib/axios";

import toast from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,
  isCouponApplied: false,
  getCartItems: async () => {
    try {
      const response = await axios.get("/cart");
      set({ cart: response.data.cartItems });
      get().calculateTotals();
    } catch (error) {
      set({ cart: [] });
      toast.error(error.response.data.message || "Something went wrong", {
        id: "getCartItems",
      });
    }
  },

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupons");
      set({ coupon: response.data });
      get().calculateTotals();
    } catch (error) {
      set({ coupon: null });
      toast.error(error.response.data.message || "Something went wrong", {
        id: "getMyCoupon",
      });
    }
  },

  removeCoupon: async () => {
    try {
      set({ coupon: null, isCouponApplied: false });
      get().calculateTotals();
      toast.success("Coupon removed successfully", { id: "removeCoupon" });
    } catch (error) {
      set({ coupon: null });
      toast.error(error.response.data.message || "Something went wrong", {
        id: "removeCoupon",
      });
    }
  },

  applyCoupon: async (code) => {
    try {
      const response = await axios.post("/coupons/validate", { code });
      set({ coupon: response.data.coupon, isCouponApplied: true });
      get().calculateTotals();
      toast.success("Coupon applied successfully", { id: "applyCoupon" });
    } catch (error) {
      set({ coupon: null });
      toast.error(error.response.data.message || "Something went wrong", {
        id: "applyCoupon",
      });
    }
  },

  addToCart: async (product) => {
    try {
      await axios.post("/cart", { productId: product._id });
      toast.success("Product added to cart successfully", { id: "Cart" });

      set((prevState) => {
        const existingItem = prevState.cart.find(
          (item) => item._id === product._id
        );
        const newCart = existingItem
          ? prevState.cart.map((item) =>
              item._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...prevState.cart, { ...product, quantity: 1 }];
        return { cart: newCart };
      });
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Something went wrong");
    }
  },

  calculateTotals: async () => {
    const { cart, coupon } = get();
    const subtotal = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    let total = subtotal;
    if (coupon) {
      const discount = (subtotal * coupon.discountPercentage) / 100;
      total = subtotal - discount;
    }
    set({ subtotal, total });
  },

  clearCart: async () => {
    try {
      await axios.delete("/cart", { data: {} });
      set({ cart: [], total: 0, subtotal: 0 });
    } catch (error) {
      toast.error(error.response.data.message || "Something went wrong");
    }
  },

  removeFromCart: async (productId) => {
    try {
      await axios.delete("/cart", { data: { productId } });
      toast.success("Product removed from cart successfully", { id: "Cart" });
      set((prevState) => ({
        cart: prevState.cart.filter((item) => item._id !== productId),
      }));
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Something went wrong");
    }
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    try {
      await axios.put(`/cart/${productId}`, { quantity });
      set((prevState) => ({
        cart: prevState.cart.map((item) =>
          item._id === productId ? { ...item, quantity } : item
        ),
      }));
      get().calculateTotals();
    } catch (error) {
      toast.error(error.response.data.message || "Something went wrong");
    }
  },
}));
