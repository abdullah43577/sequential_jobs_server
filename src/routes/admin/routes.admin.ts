import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../../middleware/validateToken";
import { updateAccountStatus, deleteAccount, getSummaryStats } from "../../controllers/admin/admin.dashboard.controller";
import { deleteListing, getListings, updateListingStatus } from "../../controllers/admin/admin.listings.controller";
import { sendBroadcast } from "../../controllers/admin/admin.broadcast.controller";
import { changeUserPlan, createCheckoutSessionAdmin, extendGracePeriod, extendPlanExpiry } from "../../controllers/admin/admin.subscription.controller";

const adminRouter = Router();

adminRouter.get("/get_summary_stat", validateAccessToken, validateAdminSession, getSummaryStats);
adminRouter.put("/user/deactivate/:id", validateAccessToken, validateAdminSession, updateAccountStatus);
adminRouter.delete("/user/delete/:id", validateAccessToken, validateAdminSession, deleteAccount);

//* SUBSCRIPTIONS
adminRouter.put("/extend_plan_expiry/:userId", validateAccessToken, validateAdminSession, extendPlanExpiry);
adminRouter.put("/payment/create-checkout/:userId", validateAccessToken, validateAdminSession, createCheckoutSessionAdmin);
adminRouter.put("/user/change-plan/:userId", validateAccessToken, validateAdminSession, changeUserPlan);
adminRouter.put("/extend_grace_period/:userId", validateAccessToken, validateAdminSession, extendGracePeriod);

//* LISTINGS MANAGEMENT
adminRouter.get("/get_all_listings", validateAccessToken, validateAdminSession, getListings);
adminRouter.put("/listing/update/:id", validateAccessToken, validateAdminSession, updateListingStatus);
adminRouter.delete("/listing/delete/:id", validateAccessToken, validateAdminSession, deleteListing);

//* BROADCAST
adminRouter.post("/broadcast", validateAccessToken, validateAdminSession, sendBroadcast);

export { adminRouter };
