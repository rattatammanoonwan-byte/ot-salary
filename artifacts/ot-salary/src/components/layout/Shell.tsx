import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Home, List, Settings as SettingsIcon, LogOut, Moon, Sun, Menu, CalendarDays, User } from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
// 🟢 เปลี่ยนเป็นแบบนี้ครับ ถอย 1 ชั้นพ้นจากโฟลเดอร์ layout จะเจอไฟล์ทันที
import { UserProfileDialog } from "../UserProfileDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 🟢 เพิ่มหน้า "ข้อมูลผู้ใช้งาน" เข้ามาเป็นหนึ่งในเมนูหลักอย่างเป็นทางการ
const NAV_ITEMS = [
  { href: "/calendar", label: "ตารางกะ", icon: CalendarDays },
  { href: "/dashboard", label: "ภาพรวม", icon: Home },
  { href: "/entries", label: "บันทึก OT", icon: List },
  { href: "/settings", label: "ตั้งค่า", icon: SettingsIcon },
  { href: "#user-profile", label: "ข้อมูลผู้ใช้งาน", icon: User }, 
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // 🟢 State สำหรับควบคุมการเปิด-ปิดหน้าต่าง Popup
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // 🟢 ดึงข้อมูลการตั้งค่า/โปรไฟล์จากหลังบ้าน
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/salary-settings"],
  });

  // 🟢 Mutation สั่งบันทึกข้อมูลอัปเดตลงฐานข้อมูล
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const finalPayload = {
        ...settings,
        fullName: updatedData.fullName,
        employmentStartDate: updatedData.employmentStartDate,
        profileImage: updatedData.profileImage,
      };

      const res = await fetch("/api/salary-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
      // รีเฟรชข้อมูลให้แสดงผลชื่อและรูปภาพล่าสุดทันทีแบบ Realtime
      queryClient.invalidateQueries({ queryKey: ["/api/salary-settings"] });
    },
  });

  // 🟢 ฟังก์ชัน Render รายการเมนู
  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
        
        // 🟢 ถ้าเป็นเมนู ข้อมูลผู้ใช้งาน ดักจับการคลิกเพื่อสั่งเปิด Dialog แทนการเปลี่ยนหน้าเว็บ
        if (item.href === "#user-profile") {
          return (
            <div
              key={item.href}
              onClick={() => setIsUserDialogOpen(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-primary transition-all cursor-pointer font-medium"
            >
              <div className="w-4 h-4 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                {settings?.profileImage ? (
                  <img src={settings.profileImage} alt="Miniprofile" className="w-full h-full object-cover" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span>{settings?.fullName || item.label}</span>
            </div>
          );
        }

        // เมนูทั่วไป เปลี่ยนหน้าตามปกติ
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="flex h-14 items-center border-b px-4">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <span className="text-xl text-primary font-bold">โอทีเงินเดือน</span>
              </Link>
            </div>
            <nav className="grid gap-2 px-2 py-4">
              <NavLinks />
            </nav>
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
              <Button variant="outline" className="w-full justify-start gap-2" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                เปลี่ยนธีม
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 text-destructive" onClick={logout}>
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg text-primary font-bold">โอทีเงินเดือน</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-xl text-primary font-bold">โอทีเงินเดือน</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-2 px-4">
            <NavLinks />
          </nav>
        </div>
        <div className="border-t p-4 flex flex-col gap-2">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>

      {/* 🟢 แสดงหน้าต่างจัดการข้อมูลผู้ใช้งานเมื่อมีการกดปุ่มเมนู */}
      <UserProfileDialog
        isOpen={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        defaultData={{
          fullName: settings?.fullName,
          employmentStartDate: settings?.employmentStartDate,
          profileImage: settings?.profileImage,
        }}
        onSave={(data: any) => updateProfileMutation.mutate(data)}
      />
    </div>
  );
}