import { useEffect } from "react";
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
import { Save } from "lucide-react";

const formSchema = z.object({
  baseSalary: z.coerce.number().min(0, "เงินเดือนต้องไม่ติดลบ"),
  otRate: z.coerce.number().min(1, "อัตราโอทีต้องมากกว่าหรือเท่ากับ 1"),
  hoursPerDay: z.coerce.number().min(1, "ชั่วโมงทำงานต้องมากกว่า 0").max(24, "ไม่เกิน 24 ชม."),
  workingDaysPerMonth: z.coerce.number().min(1, "วันทำงานต้องมากกว่า 0").max(31, "ไม่เกิน 31 วัน"),
});

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const upsertMutation = useUpsertSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    }
  }, [settings, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    upsertMutation.mutate(
      { data: values },
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ตั้งค่า</h1>
        <p className="text-muted-foreground mt-1">กำหนดฐานเงินเดือนและอัตราการคำนวณ</p>
      </div>

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
                <div className="grid gap-6 sm:grid-cols-2">
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
                  <FormField
                    control={form.control}
                    name="otRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>อัตราคูณ OT</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormDescription>ปกติคือ 1.5 หรือ 3.0</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workingDaysPerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันทำงานต่อเดือน (วัน)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>ใช้ 30 เพื่อหารเฉลี่ยตามกฎหมายแรงงาน</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hoursPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชั่วโมงทำงานต่อวัน (ชม.)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>ปกติคือ 8 ชั่วโมง</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
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
