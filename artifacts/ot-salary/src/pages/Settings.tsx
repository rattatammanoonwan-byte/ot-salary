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
  transportAllowance: z.coerce.number().min(0).default(0),
  mealAllowance: z.coerce.number().min(0).default(0),
  otMealAllowance: z.coerce.number().min(0).default(0),
  diligenceAllowance: z.coerce.number().min(0).default(0),
  shiftAllowance: z.coerce.number().min(0).default(0),
  extraAllowance: z.coerce.number().min(0).default(0),
  bonusAllowance: z.coerce.number().min(0).default(0),
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
      transportAllowance: 0,
      mealAllowance: 0,
      otMealAllowance: 0,
      diligenceAllowance: 0,
      shiftAllowance: 0,
      extraAllowance: 0,
      bonusAllowance: 0,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        baseSalary: settings.baseSalary,
        otRate: settings.otRate,
        hoursPerDay: settings.hoursPerDay,
        workingDaysPerMonth: settings.workingDaysPerMonth,
        transportAllowance: (settings as any).transportAllowance ?? 0,
        mealAllowance: (settings as any).mealAllowance ?? 0,
        otMealAllowance: (settings as any).otMealAllowance ?? 0,
        diligenceAllowance: (settings as any).diligenceAllowance ?? 0,
        shiftAllowance: (settings as any).shiftAllowance ?? 0,
        extraAllowance: (settings as any).extraAllowance ?? 0,
        bonusAllowance: (settings as any).bonusAllowance ?? 0,
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
          toast({ title: "บันทึกการตั้งค่าสำเร็จ" });
        },
        onError: () => {
          toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
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
          transportAllowance: currentValues.transportAllowance,
          mealAllowance: currentValues.mealAllowance,
          otMealAllowance: currentValues.otMealAllowance,
          diligenceAllowance: currentValues.diligenceAllowance,
          shiftAllowance: currentValues.shiftAllowance,
          extraAllowance: currentValues.extraAllowance,
          bonusAllowance: currentValues.bonusAllowance,
          employmentStartDate: startDate || null,
        }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      const data = await res.json();
      queryClient.setQueryData(getGetSettingsQueryKey(), data);
      toast({ title: "บันทึกวันเริ่มงานสำเร็จ" });
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
        <p className="text-muted-foreground mt-1">กำหนดฐานเงินเดือน สวัสดิการ</p>
      </div>

      {/* Salary Settings */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>ข้อมูลสำหรับการคำนวณ</CardTitle>
          <CardDescription>กรอกฐานเงินเดือนและสวัสดิการเพื่อคำนวณรายได้สุทธิ</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
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
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* สวัสดิการ */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-4">สวัสดิการ (บาท/วัน)</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="transportAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ค่าเดินทาง</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>จ่ายเมื่อมาทำงาน D, N, DS, NS, DH, NH</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="mealAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ค่าข้าว</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>จ่ายเมื่อมาทำงาน D, N, DS, NS, DH, NH</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="otMealAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ค่าข้าวโอที</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>จ่ายเมื่อมี OT (ชั่วโมง &gt; 0)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="diligenceAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>เบี้ยขยัน</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>รวมเข้าเงินเดือนสุทธิได้เลย</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="shiftAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ค่ากะ</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>จ่ายเมื่อเข้ากะดึก N, NS, NH</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <FormField control={form.control} name="extraAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>รางวัลพิเศษ</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>รวมเข้าเงินเดือนสุทธิได้เลย</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      <FormField control={form.control} name="bonusAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>โบนัสสิ้นปี</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormDescription>รวมเข้าเงินเดือนสุทธิได้เลย</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full sm:w-auto" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "กำลังบันทึก..." : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" /> บันทึกการตั้งค่า
                    </span>
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
