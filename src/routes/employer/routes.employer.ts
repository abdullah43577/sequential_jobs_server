import { Router } from "express";
import { validateAccessToken, validateCompanySession } from "../../middleware/validateToken";
import { applicationTest, jobPostCreation, applicationTestCutoff, jobTest, jobTestCutoff, jobTestInviteMsg } from "../../controllers/employer/employer.controller";

const companyRouter = Router();

//* job post creation
companyRouter.put("/create", validateAccessToken, validateCompanySession, jobPostCreation);
companyRouter.put("/application-test", validateAccessToken, validateCompanySession, applicationTest);
companyRouter.put("/application-test-cutoff", validateAccessToken, validateCompanySession, applicationTestCutoff);

//* job test management
companyRouter.put("/job-test", validateAccessToken, validateCompanySession, jobTest);
companyRouter.patch("/job-test/cutoff/:id", validateAccessToken, validateCompanySession, jobTestCutoff);
companyRouter.patch("/job-test/applicant-invite", validateAccessToken, validateCompanySession, jobTestInviteMsg);

export { companyRouter };
