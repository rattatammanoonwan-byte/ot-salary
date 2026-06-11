import {
  pgTable,
  serial,
  text,
  real,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otEntriesTable = pgTable("ot_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  hours: real("hours").notNull(),
  otType: text("ot_type").notNull().default("D"),
  note: text("note"),
  otPay: real("ot_pay").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOtEntrySchema = createInsertSchema(otEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOtEntry = z.infer<typeof insertOtEntrySchema>;
export type OtEntry = typeof otEntriesTable.$inferSelect;
