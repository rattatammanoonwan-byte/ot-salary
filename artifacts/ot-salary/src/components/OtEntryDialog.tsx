import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateOtEntry, 
  useUpdateOtEntry,
  getListOtEntriesQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetYearlySummaryQueryKey,
  OtEntry
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  hours: z.coerce.number().min(0.5, "ชั่วโมงทำ OT ต้องมากกว่า 0"),
  otType: z.enum(["weekday", "weekend", "holiday"], { required_error: "กรุณาเลือกประเภท OT" }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      hours: 1,
      otType: "weekday",
      note: "",
    },
  });

  useEffect(() => {
    if (open && entryToEdit) {
      form.reset({
        date: entryToEdit.date,
        hours: entryToEdit.hours,
        otType: entryToEdit.otType as "weekday" | "weekend" | "holiday",
        note: entryToEdit.note || "",
      });
    } else if (open && !entryToEdit) {
      form.reset({
        date: new Date().toISOString().split("T")[0],
        hours: 1,
        otType: "weekday",
        note: "",
      });
    }
  }, [open, entryToEdit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListOtEntriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetYearlySummaryQueryKey() });
      toast({ title: isEditing ? "แก้ไขรายการสำเร็จ" : "บันทึก OT สำเร็จ" });
      onOpenChange(false);
    };

    const onError = () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    };

    if (isEditing && entryToEdit) {
      updateMutation.mutate(
        { id: entryToEdit.id, data: values },
        { onSuccess, onError }
      );
    } else {
      createMutation.mutate(
        { data: values },
        { onSuccess, onError }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "แก้ไขบันทึก OT" : "บันทึก OT ใหม่"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>วันที่</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนชั่วโมง</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ประเภท</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekday">วันธรรมดา</SelectItem>
                        <SelectItem value="weekend">วันเสาร์-อาทิตย์</SelectItem>
                        <SelectItem value="holiday">วันหยุดนักขัตฤกษ์</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <DialogFooter className="pt-4">
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
