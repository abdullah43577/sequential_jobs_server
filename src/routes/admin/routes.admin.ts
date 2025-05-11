import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../../middleware/validateToken";
import { deactivateAccount, deleteAccount, getSummaryStats } from "../../controllers/admin/admin.dashboard.controller";
import { deleteListing, getListings, updateListingStatus } from "../../controllers/admin/admin.listings.controller";
import { sendBroadcast } from "../../controllers/admin/admin.broadcast.controller";

const adminRouter = Router();

adminRouter.get("/get_summary_stat", validateAccessToken, validateAdminSession, getSummaryStats);
adminRouter.delete("/user/deactivate/:id", validateAccessToken, validateAdminSession, deactivateAccount);
adminRouter.delete("/user/delete/:id", validateAccessToken, validateAdminSession, deleteAccount);

//* LISTINGS MANAGEMENT
adminRouter.get("/get_all_listings", validateAccessToken, validateAdminSession, getListings);
adminRouter.put("/listing/update/:id", validateAccessToken, validateAdminSession, updateListingStatus);
adminRouter.delete("/listing/delete/:id", validateAccessToken, validateAdminSession, deleteListing);

//* BROADCAST
adminRouter.post("/broadcast", validateAccessToken, validateAdminSession, sendBroadcast);

export { adminRouter };
