import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background text-center px-4">
      <div className="rounded-full bg-muted p-6 mb-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">404</h1>
      <h2 className="text-xl font-medium text-foreground mb-4">ไม่พบหน้าที่คุณค้นหา</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        หน้าที่คุณกำลังพยายามเข้าถึงอาจถูกลบ ย้าย หรือไม่มีอยู่ตั้งแต่แรก 
        โปรดตรวจสอบ URL อีกครั้งหรือกลับไปที่หน้าหลัก
      </p>
      <Button asChild size="lg">
        <Link href="/">กลับไปหน้าหลัก</Link>
      </Button>
    </div>
  );
}
