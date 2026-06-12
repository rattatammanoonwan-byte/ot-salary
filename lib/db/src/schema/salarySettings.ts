import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salarySettingsTable = pgTable("salary_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  baseSalary: real("base_salary").notNull(),
  otRate: real("ot_rate").notNull().default(1.5),
  hoursPerDay: real("hours_per_day").notNull().default(8),
  workingDaysPerMonth: real("working_days_per_month").notNull().default(26),
  employmentStartDate: text("employment_start_date"),
  transportAllowance: real("transport_allowance").notNull().default(0),
  mealAllowance: real("meal_allowance").notNull().default(0),
  otMealAllowance: real("ot_meal_allowance").notNull().default(0),
  diligenceAllowance: real("diligence_allowance").notNull().default(0),
  shiftAllowance: real("shift_allowance").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSalarySettingsSchema = createInsertSchema(salarySettingsTable).omit({ id: true, updatedAt: true });
export type InsertSalarySettings = z.infer<typeof insertSalarySettingsSchema>;
export type SalarySettings = typeof salarySettingsTable.$inferSelect;
