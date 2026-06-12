import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetSettings, 
  useUpsertSettings,
  getGetSettingsQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetYearlySummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, CalendarDays } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("ot_salary_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const formSchema = z.object({
  baseSalary: z.coerce.number().min(0, "เงินเดือนต้องไม่ติดลบ"),
  otRate: z.coerce.number().default(1.5),
  hoursPerDay: z.coerce.number().default(8),
  workingDaysPerMonth: z.coerce.number().default(30),
});

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const upsertMutation = useUpsertSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState("");
  const [savingStartDate, setSavingStartDate] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseSalary: 15000,
      otRate: 1.5,
      hoursPerDay: 8,
      workingDaysPerMonth: 30,
    },
  });
  useEffect(() => {
    if (settings) {
      form.reset({
        baseSalary: settings.baseSalary,
        otRate: settings.otRate,
        hoursPerDay: settings.hoursPerDay,
        workingDaysPerMonth: settings.workingDaysPerMonth,
      });
      const s = settings as any;
      if (s.employmentStartDate) setStartDate(s.employmentStartDate);
    }
  }, [settings, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    upsertMutation.mutate(
      { data: { ...values, employmentStartDate: startDate || null } as any },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetSettingsQueryKey(), data);
          queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetYearlySummaryQueryKey() });
          toast({
            title: "บันทึกการตั้งค่าสำเร็จ",
            description: "ข้อมูลจะถูกนำไปใช้คำนวณ OT ของคุณ",
          });
        },
        onError: () => {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถบันทึกการตั้งค่าได้",
            variant: "destructive",
          });
        },
      }
    );
  }

  async function saveStartDateOnly() {
    setSavingStartDate(true);
    try {
      const currentValues = form.getValues();
      const res = await fetch(`${BASE}/api/settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          baseSalary: currentValues.baseSalary,
          otRate: currentValues.otRate,
          hoursPerDay: currentValues.hoursPerDay,
          workingDaysPerMonth: currentValues.workingDaysPerMonth,
          employmentStartDate: startDate || null,
        }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      const data = await res.json();
      queryClient.setQueryData(getGetSettingsQueryKey(), data);
      toast({ title: "บันทึกวันเริ่มงานสำเร็จ", description: "ระบบจะคำนวณตารางกะอัตโนมัติ" });
    } catch (e: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: e.message, variant: "destructive" });
    } finally {
      setSavingStartDate(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ตั้งค่า</h1>
        <p className="text-muted-foreground mt-1">กำหนดฐานเงินเดือน อัตราการคำนวณ และตารางกะอัตโนมัติ</p>
      </div>

      {/* Shift Schedule Settings */}
      <Card className="bg-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            ตารางกะอัตโนมัติ
          </CardTitle>
          <CardDescription>
            ระบบจะคำนวณกะ D/N/S อัตโนมัติ — ทำงาน 6 วัน หยุด 1 วัน, กะกลางวัน 14 วัน → กะกลางคืน 14 วัน สลับกัน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium" htmlFor="start-date">
                  วันเริ่มทำงาน (วันแรกที่เข้าทำงาน)
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  ระบบจะนับวันกะตั้งแต่วันนี้เป็นต้นไป
                </p>
              </div>
              <Button onClick={saveStartDateOnly} disabled={savingStartDate || !startDate} className="shrink-0">
                {savingStartDate ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Settings */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>ข้อมูลสำหรับการคำนวณ</CardTitle>
          <CardDescription>สูตรคำนวณ: (ฐานเงินเดือน ÷ วันทำงาน ÷ ชั่วโมงทำงาน) × อัตรา OT</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="baseSalary"
      render={({ field }) => (
        <FormItem>
          <FormLabel>ฐานเงินเดือน (บาท)</FormLabel>
          <FormControl>
            <Input type="number" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit" className="w-full sm:w-auto" disabled={upsertMutation.isPending}>
      {upsertMutation.isPending ? (
        <span className="flex items-center gap-2">กำลังบันทึก...</span>
      ) : (
        <span className="flex items-center gap-2"><Save className="h-4 w-4" /> บันทึกการตั้งค่า</span>
      )}
    </Button>
  </form>
</Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
