import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", password: "", confirmPassword: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      login(data.token, data.user);
      setLocation("/calendar");
    } catch (err: any) {
      toast({ title: "ไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regForm.password !== regForm.confirmPassword) {
      toast({ title: "รหัสผ่านไม่ตรงกัน", description: "กรุณาตรวจสอบรหัสผ่านอีกครั้ง", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "สมัครสมาชิกไม่สำเร็จ");
      login(data.token, data.user);
      toast({ title: "สมัครสมาชิกสำเร็จ", description: `ยินดีต้อนรับ ${data.user.username}!` });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "ไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">โอทีเงินเดือน</h1>
          <p className="text-sm text-muted-foreground">ติดตามโอทีและคำนวณเงินเดือนของคุณ</p>
        </div>

        <div className="flex rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              tab === "login"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              tab === "register"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">ชื่อผู้ใช้</Label>
              <Input
                id="login-username"
                data-testid="input-username"
                placeholder="กรอกชื่อผู้ใช้"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">รหัสผ่าน</Label>
              <Input
                id="login-password"
                data-testid="input-password"
                type="password"
                placeholder="กรอกรหัสผ่าน"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              data-testid="button-login"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-username">ชื่อผู้ใช้</Label>
              <Input
                id="reg-username"
                data-testid="input-reg-username"
                placeholder="ตัวอักษร ตัวเลข หรือ _ เท่านั้น"
                value={regForm.username}
                onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">รหัสผ่าน</Label>
              <Input
                id="reg-password"
                data-testid="input-reg-password"
                type="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">ยืนยันรหัสผ่าน</Label>
              <Input
                id="reg-confirm"
                data-testid="input-reg-confirm"
                type="password"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            <Button
              data-testid="button-register"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
