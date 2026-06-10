import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username ต้องมีแค่ตัวอักษร ตัวเลข หรือ _"),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "รหัสผ่านไม่ตรงกัน",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

function makeToken(userId: number, username: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId, username }, secret, { expiresIn: "7d" });
}

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" });
  }

  const { username, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const inserted = await db
    .insert(usersTable)
    .values({ username, passwordHash })
    .returning();

  const user = inserted[0];
  const token = makeToken(user.id, user.username);

  return res.status(201).json({
    token,
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
  }

  const { username, password } = parsed.data;

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (rows.length === 0) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = makeToken(user.id, user.username);
  return res.json({
    token,
    user: { id: user.id, username: user.username, createdAt: user.createdAt.toISOString() },
  });
});

router.get("/me", requireAuth, (req: AuthRequest, res: Response) => {
  return res.json({ id: req.userId, username: req.username });
});

export default router;
