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

  // เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธชเธฅเธดเธ
  const { data: slips = [], isLoading } = useQuery({
    queryKey: ["salary-slips"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/salary-slips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ");
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

  // เน€เธเธดเนเธกเธชเธฅเธดเธ
  const createSlipMutation = useMutation({
    mutationFn: async () => {
      if (!formData.month || !formData.payDate || !formData.salary) {
        throw new Error("เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ");
      }
      const res = await fetch("/api/salary-slips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, salary: Number(formData.salary) }),
      });
      if (!res.ok) throw new Error("เน€เธเธดเนเธกเธชเธฅเธดเธเธฅเนเธกเน€เธซเธฅเธง");
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

  // เนเธเนเนเธเธชเธฅเธดเธ
  const updateSlipMutation = useMutation({
    mutationFn: async () => {
      if (!formData.month || !formData.payDate || !formData.salary) {
        throw new Error("เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ");
      }
      const res = await fetch(`/api/salary-slips/${slipToEdit!.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, salary: Number(formData.salary) }),
      });
      if (!res.ok) throw new Error("เนเธเนเนเธเธชเธฅเธดเธเธฅเนเธกเน€เธซเธฅเธง");
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

  // เธฅเธเธชเธฅเธดเธ
  const deleteSlipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/salary-slips/${slipToDelete!.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("เธฅเธเธชเธฅเธดเธเธฅเนเธกเน€เธซเธฅเธง");
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
    return <div>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>;
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">เธเธฃเธฐเธงเธฑเธ•เธดเธชเธฅเธดเธเน€เธเธดเธเน€เธ”เธทเธญเธ</h1>
          <p className="text-muted-foreground">เธ”เธนเธเธฃเธฐเธงเธฑเธ•เธดเน€เธเธดเธเน€เธ”เธทเธญเธเธขเนเธญเธเธซเธฅเธฑเธ</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="h-4 w-4 mr-2" />
          เน€เธเธดเนเธกเธชเธฅเธดเธ
        </Button>
      </div>

      {slips.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            เธขเธฑเธเนเธกเนเธกเธตเธชเธฅเธดเธเน€เธเธดเธเน€เธ”เธทเธญเธ
          </CardContent>
        </Card>
      ) : (
        slips.map((slip: SalarySlip) => (
          <Card key={slip.id}>
            <CardContent className="p-5 flex justify-between items-center">

              <div>
                <h2 className="font-semibold">{slip.month}</h2>
                <p className="text-sm text-muted-foreground">
                  เธงเธฑเธเธ—เธตเนเน€เธเธดเธเน€เธเนเธฒ : {slip.payDate}
                </p>
                <p>เน€เธเธดเธเธชเธธเธ—เธเธด : {slip.salary} เธเธฒเธ—</p>
              </div>

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

                <Button
                  disabled={!slip.pdfUrl}
                  onClick={() => window.open(slip.pdfUrl, "_blank")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  เธ”เธน PDF
                </Button>
              </div>

            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog เน€เธเธดเนเธก / เนเธเนเนเธ */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setSlipToEdit(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {slipToEdit ? "เนเธเนเนเธเธชเธฅเธดเธเน€เธเธดเธเน€เธ”เธทเธญเธ" : "เน€เธเธดเนเธกเธชเธฅเธดเธเน€เธเธดเธเน€เธ”เธทเธญเธ"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="เน€เธ”เธทเธญเธ เน€เธเนเธ เธกเธดเธ–เธธเธเธฒเธขเธ 2569"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            />
            <Input
              type="date"
              value={formData.payDate}
              onChange={(e) => setFormData({ ...formData, payDate: e.target.value })}
            />
            <Input
              placeholder="เน€เธเธดเธเธชเธธเธ—เธเธด"
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
              {isPending ? "เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ..." : "เธเธฑเธเธ—เธถเธ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog เธขเธทเธเธขเธฑเธเธฅเธ */}
      <AlertDialog open={!!slipToDelete} onOpenChange={(o) => !o && setSlipToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธ?</AlertDialogTitle>
            <AlertDialogDescription>
              เธชเธฅเธดเธเน€เธ”เธทเธญเธ {slipToDelete?.month} เธเธฐเธ–เธนเธเธฅเธเธญเธขเนเธฒเธเธ–เธฒเธงเธฃเนเธฅเธฐเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธนเนเธเธทเธเนเธ”เน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>เธขเธเน€เธฅเธดเธ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSlipMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              เธฅเธเธฃเธฒเธขเธเธฒเธฃ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}"
