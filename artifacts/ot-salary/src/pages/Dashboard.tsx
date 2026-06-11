import { useState } from "react";
import { formatTHB } from "@/lib/format";
import { 
  useGetMonthlySummary, 
  useGetYearlySummary, 
  useListOtEntries,
  getGetMonthlySummaryQueryKey,
  getListOtEntriesQueryKey,
  getGetYearlySummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CreditCard, TrendingUp, Calendar, AlertCircle, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import OtEntryDialog from "@/components/OtEntryDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { getCurrentPayMonth, getPayPeriod, payPeriodLabel, thaiShortDate } from "@/lib/payPeriod";

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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เงินเดือนสุทธิ (รอบนี้)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold text-primary">{formatTHB(monthlySummary?.totalSalary || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ฐานเงินเดือน: {formatTHB(monthlySummary?.baseSalary || 0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่า OT (รอบนี้)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold text-accent">{formatTHB(monthlySummary?.totalOtPay || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  จากทั้งหมด {monthlySummary?.entriesCount || 0} รายการ
                </p>
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
                <div className="text-2xl font-bold">{monthlySummary?.totalOtHours || 0} ชม.</div>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <span>ปกติ: {monthlySummary?.weekdayOtHours || 0}</span>
                  <span>หยุด: {((monthlySummary?.weekendOtHours || 0) + (monthlySummary?.holidayOtHours || 0))}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รวมค่า OT (ปี {currentYearStr})</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <>
                <div className="text-2xl font-bold">{formatTHB(yearlySummary?.totalOtPay || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  รวม {yearlySummary?.totalOtHours || 0} ชม.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

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
                <Skeleton className="h-12 w-full" />
              </div>
            ) : recentEntries && recentEntries.length > 0 ? (
              <div className="space-y-4">
                {recentEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium leading-none">{entry.date}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.hours} ชม. • {entry.otType === 'weekday' ? 'วันธรรมดา' : entry.otType === 'weekend' ? 'วันเสาร์-อาทิตย์' : 'วันหยุดนักขัตฤกษ์'}
                        {entry.note ? ` • ${entry.note}` : ''}
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

      <OtEntryDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
}
