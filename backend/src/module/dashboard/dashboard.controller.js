import * as dashboardService from "./dashboard.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

// ═══════════════════════════════════════════════════════════════
// GET TODAY DASHBOARD STATS (Total Students + Attendance matrix)
// ═══════════════════════════════════════════════════════════════

export const getDashboardStats = asyncHandler(async (req, res) => {
    // req.user has been populated by verifyToken
    const result = await dashboardService.getDashboardStats(req.user);
    
    res.status(200).json({
        success: true,
        data: result,
    });
});
