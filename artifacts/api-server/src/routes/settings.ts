import { Router, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { db, salarySettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.use(requireAuth);

const settingsInputSchema = z.object({
  fullName: z.string().max(200).nullable().optional(),
  profileImage: z.string().nullable().optional(),

  employeeType: z.enum([
  "monthly",
  "daily"
]).default("monthly"),

  baseSalary: z.number().min(0),
  otRate: z.number().min(0).default(1.5),
  hoursPerDay: z.number().min(0).default(8),
  workingDaysPerMonth: z.number().min(0).default(26),

  employmentStartDate: z.string().nullable().optional(),

  transportAllowance: z.number().min(0).default(0),
  mealAllowance: z.number().min(0).default(0),
  otMealAllowance: z.number().min(0).default(0),
  diligenceAllowance: z.number().min(0).default(0),
  shiftAllowance: z.number().min(0).default(0),
  extraAllowance: z.number().min(0).default(0),
  bonusAllowance: z.number().min(0).default(0),
});

function formatRow(s: typeof salarySettingsTable.$inferSelect) {
  return {
    id: s.id,
    userId: s.userId,

    fullName: s.fullName ?? null,
    profileImage: s.profileImage ?? null,

    employeeType: s.employeeType,

    baseSalary: s.baseSalary,
    otRate: s.otRate,
    hoursPerDay: s.hoursPerDay,
    workingDaysPerMonth: s.workingDaysPerMonth,

    employmentStartDate: s.employmentStartDate ?? null,

    transportAllowance: s.transportAllowance ?? 0,
    mealAllowance: s.mealAllowance ?? 0,
    otMealAllowance: s.otMealAllowance ?? 0,
    diligenceAllowance: s.diligenceAllowance ?? 0,
    shiftAllowance: s.shiftAllowance ?? 0,
    extraAllowance: s.extraAllowance ?? 0,
    bonusAllowance: s.bonusAllowance ?? 0,

    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);

  const rows = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return res.status(404).json({
      error: "Settings not found",
    });
  }

  return res.json(formatRow(rows[0]));
});

router.put("/", async (req: AuthRequest, res: Response) => {
  const userId = String(req.userId!);

  const parsed = settingsInputSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;

  const existing = await db
    .select()
    .from(salarySettingsTable)
    .where(eq(salarySettingsTable.userId, userId))
    .limit(1);

  // สร้าง object แบบ dynamic
  const updateData = Object.fromEntries(
    Object.entries({
      fullName: data.fullName,
      profileImage: data.profileImage,

      employeeType: data.employeeType,

      baseSalary: data.baseSalary,
      otRate: data.otRate,
      hoursPerDay: data.hoursPerDay,
      workingDaysPerMonth: data.workingDaysPerMonth,

      employmentStartDate: data.employmentStartDate,

      transportAllowance: data.transportAllowance,
      mealAllowance: data.mealAllowance,
      otMealAllowance: data.otMealAllowance,
      diligenceAllowance: data.diligenceAllowance,
      shiftAllowance: data.shiftAllowance,
      extraAllowance: data.extraAllowance,
      bonusAllowance: data.bonusAllowance,

      updatedAt: new Date(),
    }).filter(([_, value]) => value !== undefined)
  );

  let row;

  if (existing.length > 0) {
    const updated = await db
      .update(salarySettingsTable)
      .set(updateData)
      .where(eq(salarySettingsTable.userId, userId))
      .returning();

    row = updated[0];
  } else {
    const inserted = await db
      .insert(salarySettingsTable)
      .values({
        userId,
        ...updateData,
      })
      .returning();

    row = inserted[0];
  }

  return res.json(formatRow(row));
});

export default router;