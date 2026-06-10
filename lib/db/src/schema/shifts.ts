import { pgTable, serial, text, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const shiftsTable = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    workDate: text("work_date").notNull(),
    shiftType: text("shift_type").notNull(),
    otHours: real("ot_hours"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("shifts_user_date_idx").on(t.userId, t.workDate)],
);

export type Shift = typeof shiftsTable.$inferSelect;
