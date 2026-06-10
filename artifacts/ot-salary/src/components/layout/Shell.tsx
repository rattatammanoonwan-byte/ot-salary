import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { Home, List, Settings as SettingsIcon, LogOut, Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ภาพรวม", icon: Home },
  { href: "/entries", label: "บันทึก OT", icon: List },
  { href: "/settings", label: "ตั้งค่า", icon: SettingsIcon },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
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
              <Button variant="outline" className="w-full justify-start gap-2 text-destructive" onClick={() => signOut({ redirectUrl: "/" })}>
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
          <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => signOut({ redirectUrl: "/" })}>
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
    </div>
  );
}
