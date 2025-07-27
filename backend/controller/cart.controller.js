import Product from "../models/product.model.js";

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    const existingItem = user.cartItems.find(
      (item) => String(item.product) === String(productId)
    );
    if (existingItem) {
      existingItem.quantity++;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }
    await user.save();
    res.status(200).json(user.cartItems);
  } catch (error) {
    console.log("Error in getCart controller", error);
    res
      .status(500)
      .json({ message: "Error fetching cart", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (!productId) {
      user.cartItems = [];
      await user.save();
    } else {
      user.cartItems = user.cartItems.filter(
        (item) => String(item.product) !== String(productId)
      );
      await user.save();
    }
    res.status(200).json(user.cartItems);
  } catch (error) {
    console.log("Error in getCart controller", error);
    res
      .status(500)
      .json({ message: "Error fetching cart", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;
    const existingItem = user.cartItems.find(
      (item) => String(item.product) === String(productId)
    );
    if (existingItem) {
      if (quantity > 0) {
        existingItem.quantity = quantity;
        await user.save();
        res.status(200).json(user.cartItems);
      } else {
        user.cartItems = user.cartItems.filter(
          (item) => String(item.product) !== String(productId)
        );
        await user.save();
        res.status(200).json(user.cartItems);
      }
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.log("Error in updateQuantity controller", error);
    res
      .status(500)
      .json({ message: "Error updating quantity", error: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const cartItemIds = (req.user.cartItems || []).map((item) => item.product);

    const products = await Product.find({ _id: { $in: cartItemIds } });

    const cartItems = products.map((product) => {
      const item = req.user.cartItems.find(
        (cartItem) => String(cartItem.product) === String(product._id)
      );
      return {
        ...product.toJSON(),
        quantity: item?.quantity || 1,
      };
    });

    res.status(200).json({ cartItems });
  } catch (error) {
    console.log("Error in getCart controller", error);
    res
      .status(500)
      .json({ message: "Error fetching cart", error: error.message });
  }
};
