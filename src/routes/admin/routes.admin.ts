import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../../middleware/validateToken";
import { deactivateAccount, deleteAccount, getSummaryStats } from "../../controllers/admin/admin.dashboard.controller";
import { getListings } from "../../controllers/admin/admin.listings.controller";

const adminRouter = Router();

adminRouter.get("/get_summary_stat", validateAccessToken, validateAdminSession, getSummaryStats);
adminRouter.delete("/user/deactivate/:id", validateAccessToken, validateAdminSession, deactivateAccount);
adminRouter.delete("/user/delete/:id", validateAccessToken, validateAdminSession, deleteAccount);

//* LISTINGS MANAGEMENT
adminRouter.get("/get_all_listings", validateAccessToken, validateAdminSession, getListings);

export { adminRouter };
