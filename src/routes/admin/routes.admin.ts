import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../../middleware/validateToken";
import { getSummaryStats } from "../../controllers/admin/admin.dashboard.controller";

const adminRouter = Router();

adminRouter.get("/get_summary_stat", validateAccessToken, validateAdminSession, getSummaryStats);

export { adminRouter };
