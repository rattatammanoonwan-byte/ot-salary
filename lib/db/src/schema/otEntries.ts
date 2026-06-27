import {
  pgTable,
  serial,
  varchar,
  date,
  numeric,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const salarySlipsTable = pgTable("salary_slips", {
  id: serial("id").primaryKey(),
  month: varchar("month", { length: 100 }).notNull(),
  payDate: date("pay_date").notNull(),
  salary: numeric("salary", { precision: 10, scale: 2 }).notNull(),
  pdfUrl: varchar("pdf_url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const insertSalarySlipSchema = createInsertSchema(salarySlipsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSalarySlip = z.infer<typeof insertSalarySlipSchema>;
export type SalarySlip = typeof salarySlipsTable.$inferSelect;