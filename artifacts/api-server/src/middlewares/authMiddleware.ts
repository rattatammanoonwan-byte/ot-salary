import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: number;
  username?: string;
}

// 🟢 แก้ไขโดยเติม : void เพื่อบอก TypeScript ว่าฟังก์ชันนี้ไม่มีการส่งค่ากลับออกไปนอกฟังก์ชัน
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return; // 🟢 ใช้ return ตัวเปล่าเพื่อสั่งหยุดการทำงานของฟังก์ชันทันที
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return; // 🟢 ใช้ return ตัวเปล่าเพื่อหยุดการทำงาน
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: number; username: string };
    req.userId = payload.userId;
    req.username = payload.username;
    next(); // 🟢 ส่งต่อไปยังฟังก์ชันถัดไปเมื่อสำเร็จ
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return; // 🟢 ใช้ return ตัวเปล่าเพื่อหยุดการทำงานในบล็อก catch
  }
}