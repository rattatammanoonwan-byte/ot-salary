import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import otEntriesRouter from "./otEntries";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/settings", settingsRouter);
router.use("/ot-entries", otEntriesRouter);
router.use("/summary", summaryRouter);

export default router;
