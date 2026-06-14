import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ... (ส่วน pinoHttp คงเดิม)

app.use(cors({ credentials: true, origin: true }));

// แก้ไขตรงนี้: เพิ่ม limit เพื่อรองรับไฟล์ขนาดใหญ่
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// แนะนำให้เปลี่ยนจาก "/api" เป็น "/api/salary-settings" 
// เพื่อให้ตรงกับที่ frontend เรียกใช้งาน
app.use("/api/salary-settings", router); 

// ... (ส่วน Serve Frontend คงเดิม)
export default app;