import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  addToCart,
  getCart,
  removeAllFromCart,
  updateQuantity,
} from "../controller/cart.controller.js";

const router = express.Router();

router.post("/", protectRoute, addToCart);
router.put("/:id", protectRoute, updateQuantity);
router.get("/", protectRoute, getCart);

router.delete("/", protectRoute, removeAllFromCart);

export default router;
