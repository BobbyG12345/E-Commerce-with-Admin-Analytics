import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { adminRoute } from "../middleware/auth.middleware.js";
import {
  getAnalyticsData,
  getDailySalesData,
} from "../controller/analytics.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, async (req, res) => {
  try {
    const analyticsData = await getAnalyticsData();
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // 设置为今天的结束时间
    const startDate = new Date(endDate.getTime());
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    const dailySalesData = await getDailySalesData(startDate, endDate);
    res.json({ analyticsData, dailySalesData });
  } catch (error) {
    console.log("Error in getAnalytics controller", error);
    res
      .status(500)
      .json({ message: "Error fetching analytics", error: error.message });
  }
});

export default router;
