import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import { FileText, Plus, Pencil, Trash2 } from "lucide-react";

interface SalarySlip {
  id: number;
  month: string;
  payDate: string;
  salary: number;
  pdfUrl: string;
}

const emptyForm = {
  month: "",
  payDate: "",
  salary: "",
  pdfUrl: "",
};

export default function SalarySlips() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [slipToEdit, setSlipToEdit] = useState<SalarySlip | null>(null);
  const [slipToDelete, setSlipToDelete] = useState<SalarySlip | null>(null);

  const [formData, setFormData] = useState(emptyForm);

  // โหลดข้อมูลสลิป
  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["salary-slips"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/salary-slips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      return res.json();
    },
  });

  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setSlipToEdit(null);
    setOpen(true);
  };

  const handleOpenEdit = (slip: SalarySlip) => {
    setFormData({
      month: slip.month,
      payDate: slip.payDate,
      salary: String(slip.salary),
      pdfUrl: slip.pdfUrl,
    });
    setSlipToEdit(slip);
    setOpen(true);
  };

  // เพิ่มสลิป
  const createSlipMutation = useMutation({
    mutationFn: async () => {
      if (!formData.month || !formData.payDate || !formData.salary) {
        throw new Error("กรุณากรอกข้อมูลให้ครบ");
      }
      const res = await fetch("/api/salary-slips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, salary: Number(formData.salary) }),
      });
      if (!res.ok) throw new Error("เพิ่มสลิปล้มเหลว");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      setOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  // แก้ไขสลิป
  const updateSlipMutation = useMutation({
    mutationFn: async () => {
      if (!formData.month || !formData.payDate || !formData.salary) {
        throw new Error("กรุณากรอกข้อมูลให้ครบ");
      }
      const res = await fetch(`/api/salary-slips/${slipToEdit!.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, salary: Number(formData.salary) }),
      });
      if (!res.ok) throw new Error("แก้ไขสลิปล้มเหลว");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      setOpen(false);
      setSlipToEdit(null);
      setFormData(emptyForm);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  // ลบสลิป
  const deleteSlipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/salary-slips/${slipToDelete!.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("ลบสลิปล้มเหลว");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-slips"] });
      setSlipToDelete(null);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const isPending = createSlipMutation.isPending || updateSlipMutation.isPending;

  if (isLoading) {
    return <div>กำลังโหลด...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
       <div>
         <h1 className="text-3xl font-bold">ประวัติสลิปเงินเดือน</h1>
           <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">ดูประวัติเงินเดือนย้อนหลัง</p>
            <img 
            src="https://adaymagazine.com/wp-content/uploads/2019/05/Knocking.gif" 
            alt="nyan cat"
            className="w-10 h-10"
            />
          </div>
         </div>
       <Button onClick={handleOpenAdd}>
         <Plus className="h-4 w-4 mr-2" />
         เพิ่มสลิป
       </Button>
      </div>

      {slips.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            ยังไม่มีสลิปเงินเดือน
          </CardContent>
        </Card>
      ) : (
        slips.map((slip: SalarySlip) => (
          <Card key={slip.id}>
            <CardContent className="p-5 flex justify-between items-center">

            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">{slip.month}</h2>
              <p className="text-sm text-muted-foreground">
               วันที่เงินเข้า : {new Date(slip.payDate).toLocaleDateString("th-TH", {
               day: "numeric",
               month: "long",
               year: "numeric"
              })}
              </p>
              <p className="text-sm">เงินสุทธิ : {Number(slip.salary).toLocaleString("th-TH")} บาท</p>
            </div>

              <div className="flex flex-col gap-2 items-end">
               <div className="flex gap-2">
                 <Button
                   variant="outline"
                   size="icon"
                   onClick={() => handleOpenEdit(slip)}
                   >
                   <Pencil className="h-4 w-4" />
                 </Button>

                 <Button
                   variant="outline"
                   size="icon"
                   className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                   onClick={() => setSlipToDelete(slip)}
                    >
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>

                 <Button
                   disabled={!slip.pdfUrl}
                   onClick={() => window.open(slip.pdfUrl, "_blank")}
                   >
                   <FileText className="mr-2 h-4 w-4" />
                    ดู PDF
                 </Button>
               </div>

            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog เพิ่ม / แก้ไข */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setSlipToEdit(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {slipToEdit ? "แก้ไขสลิปเงินเดือน" : "เพิ่มสลิปเงินเดือน"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="เดือน เช่น มิถุนายน 2569"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            />
            <Input
              type="date"
              value={formData.payDate}
              onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
            />
            <Input
              placeholder="เงินสุทธิ"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
            <Input
              placeholder="URL PDF"
              value={formData.pdfUrl}
              onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
            />
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() =>
                slipToEdit
                  ? updateSlipMutation.mutate()
                  : createSlipMutation.mutate()
              }
            >
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog ยืนยันลบ */}
      <AlertDialog open={!!slipToDelete} onOpenChange={(o) => !o && setSlipToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
            <AlertDialogDescription>
              สลิปเดือน {slipToDelete?.month} จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSlipMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}