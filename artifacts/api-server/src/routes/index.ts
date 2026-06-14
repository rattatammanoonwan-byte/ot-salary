import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import otEntriesRouter from "./otEntries";
import summaryRouter from "./summary";
import shiftsRouter from "./shifts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/settings", settingsRouter);
router.use("/ot-entries", otEntriesRouter);
router.use("/summary", summaryRouter);
router.use("/shifts", shiftsRouter);

export default router;