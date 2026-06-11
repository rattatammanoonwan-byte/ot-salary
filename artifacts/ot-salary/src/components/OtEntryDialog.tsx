import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateOtEntry,
  useUpdateOtEntry,
  getListOtEntriesQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetYearlySummaryQueryKey,
  OtEntry,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatTHB, isSpecialOtType } from "@/lib/format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const OT_TYPES = [
  { value: "D",  label: "D — กะกลางวัน (OT ×1.5)" },
  { value: "N",  label: "N — กะกลางคืน (OT ×1.5)" },
  { value: "DS", label: "DS — หยุด/สัปดาห์ กะเช้า" },
  { value: "NS", label: "NS — หยุด/สัปดาห์ กะดึก" },
  { value: "DH", label: "DH — หยุด/ประจำปี กะเช้า" },
  { value: "NH", label: "NH — หยุด/ประจำปี กะดึก" },
] as const;

const formSchema = z.object({
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  hours: z.coerce.number().min(0.5, "ชั่วโมงทำ OT ต้องมากกว่า 0"),
  otType: z.enum(["D", "N", "DS", "NS", "DH", "NH", "PL", "SL", "AL", "weekday", "weekend", "holiday"], { required_error: "กรุณาเลือกประเภท OT" }),
  note: z.string().optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryToEdit?: OtEntry | null;
};

export default function OtEntryDialog({ open, onOpenChange, entryToEdit }: Props) {
  const isEditing = !!entryToEdit;
  const createMutation = useCreateOtEntry();
  const updateMutation = useUpdateOtEntry();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [baseSalary, setBaseSalary] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("ot_salary_token");
    fetch(`${BASE}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setBaseSalary(s.baseSalary || 0));
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      hours: 1,
      otType: "D",
      note: "",
    },
  });

  useEffect(() => {
    if (open && entryToEdit) {
      const t = entryToEdit.otType;
      const safeType = ["D","N","DS","NS","DH","NH"].includes(t) ? t as any : "D";
      form.reset({
        date: entryToEdit.date,
        hours: entryToEdit.hours,
        otType: safeType,
        note: entryToEdit.note || "",
      });
    } else if (open && !entryToEdit) {
      form.reset({ date: new Date().toISOString().split("T")[0], hours: 1, otType: "D", note: "" });
    }
  }, [open, entryToEdit, form]);

  const hours   = form.watch("hours");
  const otType  = form.watch("otType");

  const preview = useMemo(() => {
    if (!hours || !baseSalary || hours <= 0) return null;
    const rate = baseSalary / 30 / 8;
    if (isSpecialOtType(otType)) {
      const base8Pay  = Math.min(hours, 8) * rate;
      const extraPay  = Math.max(0, hours - 8) * 3 * rate;
      return { base8Pay, extraPay, total: base8Pay + extraPay, isSpecial: true };
    }
    return { total: hours * 1.5 * rate, isSpecial: false };
  }, [hours, otType, baseSalary]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListOtEntriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetYearlySummaryQueryKey() });
      toast({ title: isEditing ? "แก้ไขรายการสำเร็จ" : "บันทึก OT สำเร็จ" });
      onOpenChange(false);
    };
    const onError = () => toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });

    if (isEditing && entryToEdit) {
      updateMutation.mutate({ id: entryToEdit.id, data: values }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: values }, { onSuccess, onError });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "แก้ไขบันทึก OT" : "บันทึก OT ใหม่"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>วันที่</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภท OT</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs text-muted-foreground font-medium">กะปกติ (OT ×1.5)</div>
                      {OT_TYPES.filter(t => t.value === "D" || t.value === "N").map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs text-muted-foreground font-medium mt-1">วันหยุดพิเศษ (8ชม.×1 + ×3)</div>
                      {OT_TYPES.filter(t => !["D","N"].includes(t.value)).map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จำนวนชั่วโมง</FormLabel>
                  <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pay preview */}
            {preview && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm space-y-1">
                {preview.isSpecial ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{Math.min(hours, 8)} ชม. ×1.0</span>
                      <span>{formatTHB(preview.base8Pay!)}</span>
                    </div>
                    {preview.extraPay! > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{Math.max(0, hours - 8)} ชม. ×3.0</span>
                        <span>{formatTHB(preview.extraPay!)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{hours} ชม. ×1.5</span>
                    <span>{formatTHB(preview.total)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-emerald-700 border-t border-emerald-200 pt-1">
                  <span>ค่า OT รวม</span>
                  <span>{formatTHB(preview.total)}</span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ (ถ้ามี)</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น ทำสรุปรายงานประจำเดือน" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
