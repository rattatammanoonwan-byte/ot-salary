import { useState } from "react";
import { formatTHB, formatOtType } from "@/lib/format";
import { 
  useListOtEntries, 
  useDeleteOtEntry,
  getListOtEntriesQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetYearlySummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, List as ListIcon, CalendarIcon, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import OtEntryDialog from "@/components/OtEntryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getCurrentPayMonth, getPayPeriod, payPeriodLabel, thaiShortDate } from "@/lib/payPeriod";

export default function Entries() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentPayMonth);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<any>(null);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const period = getPayPeriod(selectedMonth);

  const { data: entries, isLoading } = useListOtEntries({ month: selectedMonth });
  const deleteMutation = useDeleteOtEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!entryToDelete) return;
    deleteMutation.mutate(
      { id: entryToDelete },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOtEntriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetYearlySummaryQueryKey() });
          toast({ title: "ลบรายการสำเร็จ" });
          setEntryToDelete(null);
        },
        onError: () => {
          toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
        }
      }
    );
  };

  const getOtTypeBadgeColor = (type: string) => {
    switch(type) {
      case 'weekday': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'weekend': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'holiday': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">บันทึก OT</h1>
          <p className="text-muted-foreground mt-1">ประวัติการทำล่วงเวลาของคุณ</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex h-10 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{entry.date}</p>
                        <Badge variant="secondary" className={`font-normal ${getOtTypeBadgeColor(entry.otType)}`}>
                          {formatOtType(entry.otType)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        เวลาทำ: <span className="font-medium text-foreground">{entry.hours} ชม.</span>
                        {entry.note ? ` • ${entry.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-14 sm:pl-0">
                    <div className="text-xl font-bold text-accent">
                      +{formatTHB(entry.otPay)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEntryToEdit(entry)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEntryToDelete(entry.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ListIcon className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">ไม่มีข้อมูล</h3>
              <p className="text-muted-foreground mt-1 mb-6 max-w-sm mx-auto">
                ยังไม่มีรายการทำล่วงเวลาในรอบนี้ เริ่มบันทึก OT เพื่อคำนวณรายได้ของคุณ
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                บันทึก OT ครั้งแรก
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <OtEntryDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />

      {entryToEdit && (
        <OtEntryDialog 
          open={!!entryToEdit} 
          onOpenChange={(open) => !open && setEntryToEdit(null)} 
          entryToEdit={entryToEdit}
        />
      )}

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
            <AlertDialogDescription>
              รายการนี้จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้ การคำนวณเงินเดือนจะถูกอัปเดตใหม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
