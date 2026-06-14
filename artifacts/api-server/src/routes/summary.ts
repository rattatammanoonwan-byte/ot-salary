import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, otEntriesTable, salarySettingsTable, shiftsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm"; // ใช้วิธี Build-in ของ Drizzle จะปลอดภัยกว่า sql

const router = Router();
router.use(requireAuth);

function payPeriodRange(month: string): { start: string; end: string; payDate: string } {
  const [year, mon] = month.split("-").map(Number);
  let prevYear = year, prevMon = mon - 1;
  if (prevMon === 0) { prevMon = 12; prevYear--; }
  
  // กำหนดรูปแบบ String วันที่มาตรฐาน YYYY-MM-DD
  const start = `${prevYear}-${String(prevMon).padStart(2, "0")}-21`;
  const end   = `${year}-${String(mon).padStart(2, "0")}-20`;
  const lastDay = new Date(year, mon, 0).getDate();
  const payDate = `${year}-${String(mon).padStart(2, "0")}-${lastDay}`;
  return { start, end, payDate };
}

async function buildMonthlySummary(
  userId: string,
  month: string,
  settings: {
    baseSalary: number;
    transportAllowance: number;
    mealAllowance: number;
    otMealAllowance: number;
    diligenceAllowance: number;
    shiftAllowance: number;
    extraAllowance: number;
    bonusAllowance: number;
  }
) {
  const { baseSalary, transportAllowance, mealAllowance, otMealAllowance, diligenceAllowance, shiftAllowance, extraAllowance, bonusAllowance } = settings;
  const { start, end, payDate } = payPeriodRange(month);

  // ดึงข้อมูล OT entries
  const otRows = await db
    .select()
    .from(otEntriesTable)
    .where(
      and(
        eq(otEntriesTable.userId, userId),
        gte(otEntriesTable.date, start),
        lte(otEntriesTable.date, end)
      ),
    );

  // ดึงข้อมูล Shifts
  const shiftRows = await db
    .select()
    .from(shiftsTable)
    .where(
      and(
        eq(shiftsTable.userId, userId),
        gte(shiftsTable.workDate, start),
        lte(shiftsTable.workDate, end)
      ),
    );

  const SPECIAL = ["NS", "DS", "NH", "DH"];
  const WORK_SHIFTS = ["D", "N", "DS", "NS", "DH", "NH"];
  const NIGHT_SHIFTS = ["N", "NS", "NH"];
  
  // ฐานคิดชั่วโมงการทำงานปกติ (เงินเดือน / 30 วัน / 8 ชั่วโมง)
  const hourlyRate = baseSalary / 30 / 8;

  let totalOtHours = 0;
  let totalOtPay = 0;
  let regularOtHours = 0;
  let regularOtPay = 0;
  let holidayBase8Hours = 0;
  let holidayBase8Pay = 0;
  let holidayExtraHours = 0;
  let holidayExtraPay = 0;

  for (const r of otRows) {
    totalOtHours += r.hours;
    totalOtPay   += r.otPay;

    if (SPECIAL.includes(r.otType)) {
      const b8 = Math.min(r.hours, 8);
      const ex = Math.max(0, r.hours - 8);
      holidayBase8Hours += b8;
      
      // 📌 จุดแก้ไข: ปรับตัวคูณของ 8 ชม. แรกในวันหยุดตามนโยบายบริษัท
      holidayBase8Pay   += b8 * hourlyRate * 1; 
      
      holidayExtraHours += ex;
      holidayExtraPay   += ex * 3 * hourlyRate; // โอทีเกิน 8 ชม. วันหยุด คิด 3 เท่าตามกฎหมาย
    } else {
      regularOtHours += r.hours;
      regularOtPay   += r.otPay;
    }
  }

  // คำนวณสวัสดิการประจำวัน
  let totalTransport = 0;
  let totalMeal = 0;
  let totalShiftAllowance = 0;

  for (const s of shiftRows) {
    if (WORK_SHIFTS.includes(s.shiftType)) {
      totalTransport += transportAllowance;
      totalMeal      += mealAllowance;
    }
    if (NIGHT_SHIFTS.includes(s.shiftType)) {
      totalShiftAllowance += shiftAllowance;
    }
  }

  // นับค่าข้าวโอที โดยตั้งเงื่อนไขขั้นต่ำ
  const MIN_OT_HOURS_FOR_MEAL = 2; 
  const otDates = new Set(
    otRows.filter(r => r.hours >= MIN_OT_HOURS_FOR_MEAL).map(r => r.date)
  );
  const totalOtMeal = otDates.size * otMealAllowance;

  // 🟢 [จุดที่แก้ไข] บวก extraAllowance และ bonusAllowance เพิ่มเข้าไปในยอดรวมสวัสดิการตรงนี้ครับ
  const totalAllowances = parseFloat(
    (
      totalTransport + 
      totalMeal + 
      totalOtMeal + 
      diligenceAllowance + 
      totalShiftAllowance + 
      extraAllowance + 
      bonusAllowance
    ).toFixed(2)
  );

  const round = (n: number) => parseFloat(n.toFixed(2));

  return {
    month,
    periodStart: start,
    periodEnd: end,
    payDate,
    baseSalary,
    totalOtHours:         round(totalOtHours),
    totalOtPay:           round(totalOtPay),
    totalSalary:          round(baseSalary + totalOtPay + totalAllowances), // ตัวนี้จะปรับเพิ่มขึ้นอัตโนมัติจาก totalAllowances
    regularOtHours:       round(regularOtHours),
    regularOtPay:         round(regularOtPay),
    holidayBase8Hours:    round(holidayBase8Hours),
    holidayBase8Pay:      round(holidayBase8Pay),
    holidayExtraHours:    round(holidayExtraHours),
    holidayExtraPay:      round(holidayExtraPay),
    totalTransport:       round(totalTransport),
    totalMeal:            round(totalMeal),
    totalOtMeal:          round(totalOtMeal),
    diligenceAllowance:   round(diligenceAllowance),
    totalShiftAllowance:  round(totalShiftAllowance),
    extraAllowance:       round(extraAllowance),
    bonusAllowance:       round(bonusAllowance),
    totalAllowances,
    entriesCount: otRows.length,
  };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { month } = req.query as { month?: string };
  if (!month) return res.status(400).json({ error: "month is required" });

  const settingsRows = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  const s = settingsRows[0];
  const settings = {
    baseSalary:          s?.baseSalary ?? 0,
    transportAllowance:  s?.transportAllowance ?? 0,
    mealAllowance:       s?.mealAllowance ?? 0,
    otMealAllowance:     s?.otMealAllowance ?? 0,
    diligenceAllowance:  s?.diligenceAllowance ?? 0,
    shiftAllowance:      s?.shiftAllowance ?? 0,
    extraAllowance:      s?.extraAllowance ?? 0,
    bonusAllowance:      s?.bonusAllowance ?? 0,
  };

  const summary = await buildMonthlySummary(userId, month, settings);
  return res.json(summary);
});

router.get("/yearly", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);
  const { year } = req.query as { year?: string };
  if (!year) return res.status(400).json({ error: "year is required" });

  const settingsRows = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  const s = settingsRows[0];
  const settings = {
    baseSalary:          s?.baseSalary ?? 0,
    transportAllowance:  s?.transportAllowance ?? 0,
    mealAllowance:       s?.mealAllowance ?? 0,
    otMealAllowance:     s?.otMealAllowance ?? 0,
    diligenceAllowance:  s?.diligenceAllowance ?? 0,
    shiftAllowance:      s?.shiftAllowance ?? 0,
    extraAllowance:      s?.extraAllowance ?? 0,
    bonusAllowance:      s?.bonusAllowance ?? 0,
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  const monthlyBreakdown = await Promise.all(
    months.map((m) => buildMonthlySummary(userId, m, settings)),
  );

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