import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, otEntriesTable, salarySettingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

async function buildMonthlySummary(userId: string, month: string, baseSalary: number) {
  const rows = await db
    .select()
    .from(otEntriesTable)
    .where(
      and(
        eq(otEntriesTable.userId, userId),
        sql`to_char(${otEntriesTable.date}::date, 'YYYY-MM') = ${month}`,
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

router.get("/", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

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

router.get("/yearly", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

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
