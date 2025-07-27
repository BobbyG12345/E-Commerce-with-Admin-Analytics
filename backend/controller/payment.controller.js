import { stripe } from "../lib/stripe.js";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "No products provided" });
    }

    let totalAmount = 0;

    const lineItems = products.map((product) => {
      const amount = product.price * 100; // Convert to cents, stripe accepts amount in cents
      totalAmount += amount * product.quantity;
      return {
        price_data: {
          currency: "cad",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });
      if (coupon) {
        totalAmount -= Math.round(
          totalAmount * (coupon.discountPercentage / 100)
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `https://e-commerce-with-admin-analytics.onrender.com/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://e-commerce-with-admin-analytics.onrender.com//purchase-cancel`,
      discounts: coupon
        ? [{ coupon: await createStripeCoupon(coupon.discountPercentage) }]
        : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
      },
    });

    if (totalAmount >= 20000) {
      await createNewCoupon(req.user._id);
    }
    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.log("Error in createCheckoutSession controller", error);
    res.status(500).json({
      message: "Error creating checkout session",
      error: error.message,
    });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log("sessionId", sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      const existingOrder = await Order.findOne({ stripeSessionId: sessionId });
      if (existingOrder) {
        return res.status(200).json({
          message: "Order already exists",
          orderId: existingOrder._id,
        });
      }
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          {
            isActive: false,
          }
        );
      }
      const products = JSON.parse(session.metadata.products);
      const newOrder = new Order({
        user: req.user._id,
        products: products.map((product) => ({
          product: product.id,
          quantity: product.quantity,
          price: product.price,
        })),
        totalAmount: session.amount_total / 100, // Stripe returns amount in cents
        stripeSessionId: sessionId,
      });
      await newOrder.save();
      console.log("newOrder", newOrder);
      res.status(200).json({
        success: true,
        message:
          "Payment successful, order created, and coupon deactivated if used",
        orderId: newOrder._id,
      });
    }
  } catch (error) {
    console.log("Error in checkout-success route", error);
    res.status(500).json({ message: "Error processing checkout", error });
  }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    duration: "once",
    percent_off: discountPercentage,
  });
  return coupon.id;
}

async function createNewCoupon(userId) {
  await Coupon.deleteMany({ userId: userId });
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 30 days from now
    userId: userId,
  });
  await newCoupon.save();

  return newCoupon;
}
