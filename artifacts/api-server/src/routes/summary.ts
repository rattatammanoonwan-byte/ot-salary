import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, otEntriesTable, salarySettingsTable, shiftsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

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

type Settings = {
  baseSalary: number;
  transportAllowance: number;
  mealAllowance: number;
  otMealAllowance: number;
  diligenceAllowance: number;
  shiftAllowance: number;
  extraAllowance: number;
  bonusAllowance: number;
  employeeType: "monthly" | "daily";
};

// ════════════════════════════════════════════════════════
// ฟังก์ชันหลัก — คำนวณจาก rows ที่รับมา (ไม่ query DB)
// ใช้ได้ทั้ง monthly และ yearly route
// ════════════════════════════════════════════════════════
function buildMonthlySummaryFromRows(
  month: string,
  otRows: any[],
  shiftRows: any[],
  settings: Settings
) {
  const {
    baseSalary, transportAllowance, mealAllowance, otMealAllowance,
    diligenceAllowance, shiftAllowance, extraAllowance, bonusAllowance, employeeType,
  } = settings;

  const { start, end, payDate } = payPeriodRange(month);

  const SPECIAL     = ["NS", "DS", "NH", "DH"];
  const WORK_SHIFTS = ["D", "N", "DS", "NS", "DH", "NH"];
  const NIGHT_SHIFTS = ["N", "NS", "NH"];

  const hourlyRate = baseSalary / 30 / 8;
  const holidayFirst8Multiplier = employeeType === "daily" ? 2 : 1;

  let totalOtHours = 0, totalOtPay = 0;
  let regularOtHours = 0, regularOtPay = 0;
  let holidayBase8Hours = 0, holidayBase8Pay = 0;
  let holidayExtraHours = 0, holidayExtraPay = 0;

  for (const r of otRows) {
    totalOtHours += r.hours;
    totalOtPay   += r.otPay;

    if (SPECIAL.includes(r.otType)) {
      const b8 = Math.min(r.hours, 8);
      const ex = Math.max(0, r.hours - 8);
      holidayBase8Hours += b8;
      holidayBase8Pay   += b8 * hourlyRate * holidayFirst8Multiplier;
      holidayExtraHours += ex;
      holidayExtraPay   += ex * 3 * hourlyRate;
    } else {
      regularOtHours += r.hours;
      regularOtPay   += r.otPay;
    }
  }

  let totalTransport = 0, totalMeal = 0, totalShiftAllowance = 0;

  for (const s of shiftRows) {
    if (WORK_SHIFTS.includes(s.shiftType)) {
      totalTransport += transportAllowance;
      totalMeal      += mealAllowance;
    }
    if (NIGHT_SHIFTS.includes(s.shiftType)) {
      totalShiftAllowance += shiftAllowance;
    }
  }

  const MIN_OT_HOURS_FOR_MEAL = 2;
  const otDates = new Set(
    otRows.filter(r => r.hours >= MIN_OT_HOURS_FOR_MEAL).map(r => r.date)
  );
  const totalOtMeal = otDates.size * otMealAllowance;

  const totalAllowances = parseFloat(
    (totalTransport + totalMeal + totalOtMeal + diligenceAllowance +
     totalShiftAllowance + extraAllowance + bonusAllowance).toFixed(2)
  );

  const round = (n: number) => parseFloat(n.toFixed(2));

  return {
    month,
    periodStart: start,
    periodEnd: end,
    payDate,
    baseSalary,
    totalOtHours:        round(totalOtHours),
    totalOtPay:          round(totalOtPay),
    totalSalary:         round(baseSalary + totalOtPay + totalAllowances),
    regularOtHours:      round(regularOtHours),
    regularOtPay:        round(regularOtPay),
    holidayBase8Hours:   round(holidayBase8Hours),
    holidayBase8Pay:     round(holidayBase8Pay),
    holidayExtraHours:   round(holidayExtraHours),
    holidayExtraPay:     round(holidayExtraPay),
    totalTransport:      round(totalTransport),
    totalMeal:           round(totalMeal),
    totalOtMeal:         round(totalOtMeal),
    diligenceAllowance:  round(diligenceAllowance),
    totalShiftAllowance: round(totalShiftAllowance),
    extraAllowance:      round(extraAllowance),
    bonusAllowance:      round(bonusAllowance),
    totalAllowances,
    entriesCount: otRows.length,
  };
}

// ════════════════════════════════════════════════════════
// ฟังก์ชัน wrapper — query DB เอง (ใช้กับ monthly route)
// ════════════════════════════════════════════════════════
async function buildMonthlySummary(userId: string, month: string, settings: Settings) {
  const { start, end } = payPeriodRange(month);

  const [otRows, shiftRows] = await Promise.all([
    db.select().from(otEntriesTable).where(
      and(eq(otEntriesTable.userId, userId), gte(otEntriesTable.date, start), lte(otEntriesTable.date, end))
    ),
    db.select().from(shiftsTable).where(
      and(eq(shiftsTable.userId, userId), gte(shiftsTable.workDate, start), lte(shiftsTable.workDate, end))
    ),
  ]);

  return buildMonthlySummaryFromRows(month, otRows, shiftRows, settings);
}

// ════════════════════════════════════════════════════════
// GET /summary?month=YYYY-MM
// ════════════════════════════════════════════════════════
router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { month } = req.query as { month?: string };
  if (!month) return res.status(400).json({ error: "month is required" });

  const settingsRows = await db
    .select().from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId)).limit(1);

  const s = settingsRows[0];
  const settings: Settings = {
    baseSalary:         s?.baseSalary ?? 0,
    transportAllowance: s?.transportAllowance ?? 0,
    mealAllowance:      s?.mealAllowance ?? 0,
    otMealAllowance:    s?.otMealAllowance ?? 0,
    diligenceAllowance: s?.diligenceAllowance ?? 0,
    shiftAllowance:     s?.shiftAllowance ?? 0,
    extraAllowance:     s?.extraAllowance ?? 0,
    bonusAllowance:     s?.bonusAllowance ?? 0,
    employeeType:       (s?.employeeType ?? "monthly") as "monthly" | "daily",
  };

  const summary = await buildMonthlySummary(userId, month, settings);
  return res.json(summary);
});

// ════════════════════════════════════════════════════════
// GET /summary/yearly?year=YYYY
// Query DB แค่ 3 ครั้ง (settings + otRows + shiftRows) แทน 36 ครั้ง
// ════════════════════════════════════════════════════════
router.get("/yearly", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { year } = req.query as { year?: string };
  if (!year) return res.status(400).json({ error: "year is required" });

  const settingsRows = await db
    .select().from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId)).limit(1);

  const s = settingsRows[0];
  const settings: Settings = {
    baseSalary:         s?.baseSalary ?? 0,
    transportAllowance: s?.transportAllowance ?? 0,
    mealAllowance:      s?.mealAllowance ?? 0,
    otMealAllowance:    s?.otMealAllowance ?? 0,
    diligenceAllowance: s?.diligenceAllowance ?? 0,
    shiftAllowance:     s?.shiftAllowance ?? 0,
    extraAllowance:     s?.extraAllowance ?? 0,
    bonusAllowance:     s?.bonusAllowance ?? 0,
    employeeType:       (s?.employeeType ?? "monthly") as "monthly" | "daily",
  };

  // ดึงข้อมูลทั้งปีใน 2 queries
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const [allOtRows, allShiftRows] = await Promise.all([
    db.select().from(otEntriesTable).where(
      and(eq(otEntriesTable.userId, userId), gte(otEntriesTable.date, yearStart), lte(otEntriesTable.date, yearEnd))
    ),
    db.select().from(shiftsTable).where(
      and(eq(shiftsTable.userId, userId), gte(shiftsTable.workDate, yearStart), lte(shiftsTable.workDate, yearEnd))
    ),
  ]);

  // สร้าง 12 เดือน แล้ว filter rows ในหน่วยความจำ (ไม่ query DB อีก)
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  const monthlyBreakdown = months.map((month) => {
    const { start, end } = payPeriodRange(month);
    const otRows    = allOtRows.filter(r => r.date >= start && r.date <= end);
    const shiftRows = allShiftRows.filter(r => r.workDate >= start && r.workDate <= end);
    return buildMonthlySummaryFromRows(month, otRows, shiftRows, settings);
  });

  const totalOtHours    = parseFloat(monthlyBreakdown.reduce((a, b) => a + b.totalOtHours, 0).toFixed(2));
  const totalOtPay      = parseFloat(monthlyBreakdown.reduce((a, b) => a + b.totalOtPay, 0).toFixed(2));
  const totalAllowances = parseFloat(monthlyBreakdown.reduce((a, b) => a + b.totalAllowances, 0).toFixed(2));
  const monthsWithEntries = monthlyBreakdown.filter((m) => m.entriesCount > 0).length || 1;
  const totalBaseSalary = parseFloat((settings.baseSalary * monthsWithEntries).toFixed(2));

  return res.json({
    year,
    totalOtHours,
    totalOtPay,
    totalAllowances,
    totalBaseSalary,
    totalSalary: parseFloat((totalBaseSalary + totalOtPay + totalAllowances).toFixed(2)),
    monthlyBreakdown,
  });
});

export default router;
