import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, otEntriesTable, salarySettingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

/**
 * Returns the pay-period date range for a given pay month (YYYY-MM).
 * Period: 21st of previous month → 20th of pay month.
 * Payment: last day of pay month.
 */
function payPeriodRange(month: string): { start: string; end: string; payDate: string } {
  const [year, mon] = month.split("-").map(Number);
  let prevYear = year, prevMon = mon - 1;
  if (prevMon === 0) { prevMon = 12; prevYear--; }
  const start = `${prevYear}-${String(prevMon).padStart(2, "0")}-21`;
  const end   = `${year}-${String(mon).padStart(2, "0")}-20`;
  const lastDay = new Date(year, mon, 0).getDate();
  const payDate = `${year}-${String(mon).padStart(2, "0")}-${lastDay}`;
  return { start, end, payDate };
}

async function buildMonthlySummary(userId: string, month: string, baseSalary: number) {
  const { start, end, payDate } = payPeriodRange(month);

  const rows = await db
    .select()
    .from(otEntriesTable)
    .where(
      and(
        eq(otEntriesTable.userId, userId),
        sql`${otEntriesTable.date}::date >= ${start}::date`,
        sql`${otEntriesTable.date}::date <= ${end}::date`,
      ),
    );

  let totalOtHours = 0;
  let totalOtPay = 0;
  let weekdayOtHours = 0;
  let weekendOtHours = 0;
  let holidayOtHours = 0;

  for (const r of rows) {
    totalOtHours += r.hours;
    totalOtPay += r.otPay;
    if (r.otType === "weekday") weekdayOtHours += r.hours;
    else if (r.otType === "weekend") weekendOtHours += r.hours;
    else if (r.otType === "holiday") holidayOtHours += r.hours;
  }

  return {
    month,
    periodStart: start,
    periodEnd: end,
    payDate,
    baseSalary,
    totalOtHours: parseFloat(totalOtHours.toFixed(2)),
    totalOtPay: parseFloat(totalOtPay.toFixed(2)),
    totalSalary: parseFloat((baseSalary + totalOtPay).toFixed(2)),
    weekdayOtHours: parseFloat(weekdayOtHours.toFixed(2)),
    weekendOtHours: parseFloat(weekendOtHours.toFixed(2)),
    holidayOtHours: parseFloat(holidayOtHours.toFixed(2)),
    entriesCount: rows.length,
  };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { month } = req.query as { month?: string };
  if (!month) return res.status(400).json({ error: "month is required" });

  const settings = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  const baseSalary = settings.length > 0 ? settings[0].baseSalary : 0;
  const summary = await buildMonthlySummary(userId, month, baseSalary);
  return res.json(summary);
});

router.get("/yearly", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { year } = req.query as { year?: string };
  if (!year) return res.status(400).json({ error: "year is required" });

  const settings = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  const baseSalary = settings.length > 0 ? settings[0].baseSalary : 0;

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  const monthlyBreakdown = await Promise.all(
    months.map((m) => buildMonthlySummary(userId, m, baseSalary)),
  );

  const totalOtHours = parseFloat(monthlyBreakdown.reduce((a, b) => a + b.totalOtHours, 0).toFixed(2));
  const totalOtPay = parseFloat(monthlyBreakdown.reduce((a, b) => a + b.totalOtPay, 0).toFixed(2));
  const monthsWithEntries = monthlyBreakdown.filter((m) => m.entriesCount > 0).length || 1;
  const totalBaseSalary = parseFloat((baseSalary * monthsWithEntries).toFixed(2));

  return res.json({
    year,
    totalOtHours,
    totalOtPay,
    totalBaseSalary,
    totalSalary: parseFloat((totalBaseSalary + totalOtPay).toFixed(2)),
    monthlyBreakdown,
  });
});

export default router;
