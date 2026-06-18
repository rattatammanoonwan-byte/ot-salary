import { useState } from "react";
import { formatTHB } from "@/lib/format";
import {
  useGetMonthlySummary,
  useGetYearlySummary,
  useListOtEntries,
  getGetMonthlySummaryQueryKey,
  getListOtEntriesQueryKey,
  getGetYearlySummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CreditCard, TrendingUp, Calendar, AlertCircle, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import OtEntryDialog from "@/components/OtEntryDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { getCurrentPayMonth, getPayPeriod, payPeriodLabel, thaiShortDate } from "@/lib/payPeriod";
import { formatOtType } from "@/lib/format";

export default function Dashboard() {
  const defaultPayMonth = getCurrentPayMonth();
  const currentYearStr = defaultPayMonth.split("-")[0];

  const [selectedMonth, setSelectedMonth] = useState(defaultPayMonth);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const period = getPayPeriod(selectedMonth);

  const { data: monthlySummary, isLoading: isSummaryLoading, error: summaryError } = useGetMonthlySummary({ month: selectedMonth });
  const { data: yearlySummary, isLoading: isYearlyLoading } = useGetYearlySummary({ year: currentYearStr });
  const { data: recentEntries, isLoading: isEntriesLoading } = useListOtEntries({ month: selectedMonth });

  const isLoading = isSummaryLoading || isYearlyLoading || isEntriesLoading;

  const s = monthlySummary as any;

  if (summaryError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>ไม่สามารถโหลดข้อมูลได้ โปรดลองอีกครั้ง</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">ภาพรวม</h1>
          <p className="text-muted-foreground mt-1">สรุปข้อมูลเงินเดือนและโอทีของคุณ</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> <span>บันทึก OT</span>
          </Button>
        </div>
      </div>

      {/* Pay period banner */}
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <span className="font-medium text-foreground">รอบ OT: </span>
          <span className="text-muted-foreground">{payPeriodLabel(period)}</span>
          <span className="mx-2 text-muted-foreground/40">•</span>
          <span className="font-medium text-foreground">วันจ่าย: </span>
          <span className="text-muted-foreground">{thaiShortDate(period.payDate)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เงินเดือนสุทธิ (รอบนี้)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold text-primary">{formatTHB(s?.totalSalary || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">ฐานเงินเดือน: {formatTHB(s?.baseSalary || 0)}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่า OT รวม (รอบนี้)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold text-accent">{formatTHB(s?.totalOtPay || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">จากทั้งหมด {s?.entriesCount || 0} รายการ</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ชั่วโมง OT (รอบนี้)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[80px]" /> : (
              <>
                <div className="text-2xl font-bold">{s?.totalOtHours || 0} ชม.</div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>ปกติ: {s?.regularOtHours || 0}</span>
                  <span>หยุด: {((s?.holidayBase8Hours || 0) + (s?.holidayExtraHours || 0)).toFixed(1)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่า สวัสดิการ รวม (รอบนี้)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold text-primary">{formatTHB(s?.totalAllowances || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1"></p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OT Breakdown */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">สรุปค่า OT แยกประเภท</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {/* Regular OT × 1.5 */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-muted-foreground">OT กะปกติ (D/N) ×1.5</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="text-muted-foreground w-16">{s?.regularOtHours || 0} ชม.</span>
                  <span className="font-semibold w-24">{formatTHB(s?.regularOtPay || 0)}</span>
                </div>
              </div>
              {/* Holiday × 1.0 (first 8h) */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-muted-foreground">วันหยุดพิเศษ (8ชม.แรก) รายเดือน×1.0 / รายเดือน×2.0</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="text-muted-foreground w-16">{s?.holidayBase8Hours || 0} ชม.</span>
                  <span className="font-semibold w-24">{formatTHB(s?.holidayBase8Pay || 0)}</span>
                </div>
              </div>
              {/* Holiday × 3.0 (beyond 8h) */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-muted-foreground">วันหยุดพิเศษ (ชม.ที่ 9+) ×3.0</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="text-muted-foreground w-16">{s?.holidayExtraHours || 0} ชม.</span>
                  <span className="font-semibold w-24">{formatTHB(s?.holidayExtraPay || 0)}</span>
                </div>
              </div>
              {/* Total */}
              <div className="flex items-center justify-between py-2 pt-3">
                <span className="font-semibold text-foreground">รวมค่า OT ทั้งหมด</span>
                <span className="font-bold text-lg text-accent w-24 text-right">{formatTHB(s?.totalOtPay || 0)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welfare Breakdown */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">สรุปค่าสวัสดิการแยกประเภท</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {/* 1. ค่าเดินทาง */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">ค่าเดินทาง</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  {/* เปลี่ยนจาก transportAllowance เป็น totalTransport */}
                  <span className="font-semibold w-24">{formatTHB(s?.totalTransport || 0)}</span>
                </div>
              </div>

              {/* 2. ค่าข้าว */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="text-muted-foreground">ค่าข้าว</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  {/* เปลี่ยนจาก mealAllowance เป็น totalMeal */}
                  <span className="font-semibold w-24">{formatTHB(s?.totalMeal || 0)}</span>
                </div>
              </div>

              {/* 3. ค่าข้าวโอที */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-muted-foreground">ค่าข้าวโอที</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  {/* เปลี่ยนจาก otMealAllowance เป็น totalOtMeal */}
                  <span className="font-semibold w-24">{formatTHB(s?.totalOtMeal || 0)}</span>
                </div>
              </div>

              {/* 4. เบี้ยขยัน */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-muted-foreground">เบี้ยขยัน</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="font-semibold w-24">{formatTHB(s?.diligenceAllowance || 0)}</span>
                </div>
              </div>

              {/* 5. ค่ากะ */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-muted-foreground">ค่ากะ</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  {/* เปลี่ยนจาก shiftAllowance เป็น totalShiftAllowance */}
                  <span className="font-semibold w-24">{formatTHB(s?.totalShiftAllowance || 0)}</span>
                </div>
              </div>

              {/* 6. เบี้ยเลี้ยงพิเศษ */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-muted-foreground">เบี้ยเลี้ยงพิเศษ</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="font-semibold w-24">{formatTHB(s?.extraAllowance || 0)}</span>
                </div>
              </div>

              {/* 7. โบนัสเบี้ยเลี้ยง */}
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-muted-foreground">โบนัสเบี้ยเลี้ยง</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <span className="font-semibold w-24">{formatTHB(s?.bonusAllowance || 0)}</span>
                </div>
              </div>

              {/* Total Welfare */}
              <div className="flex items-center justify-between py-2 pt-3">
                <span className="font-semibold text-foreground">รวมค่าสวัสดิการทั้งหมด</span>
                <span className="font-bold text-lg text-emerald-600 w-24 text-right">
                  {/* ปรับมาใช้ตัวแปรสรุปยอดรวมจากหลังบ้านโดยตรง */}
                  {formatTHB(s?.totalAllowances || 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent entries */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>รายการ OT ล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentEntries && recentEntries.length > 0 ? (
              <div className="space-y-4">
                {recentEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium leading-none">{entry.date}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.hours} ชม. • {formatOtType(entry.otType)}
                        {entry.note ? ` • ${entry.note}` : ""}
                      </p>
                    </div>
                    <div className="font-medium text-accent">+{formatTHB(entry.otPay)}</div>
                  </div>
                ))}
                {recentEntries.length > 5 && (
                  <Button variant="link" className="w-full mt-2" asChild>
                    <Link href="/entries">ดูทั้งหมด</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 opacity-20 mb-3" />
                <p>ยังไม่มีบันทึก OT ในรอบนี้</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                  เพิ่มรายการแรก
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OtEntryDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}
