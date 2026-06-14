import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultData?: {
    fullName?: string;
    employmentStartDate?: string;
    profileImage?: string;
  };
  onSave: (data: any) => void;
}

export function UserProfileDialog({ isOpen, onClose, defaultData, onSave }: UserProfileDialogProps) {
  const [previewImage, setPreviewImage] = useState(defaultData?.profileImage || "");

  const form = useForm({
    defaultValues: {
      fullName: defaultData?.fullName || "",
      employmentStartDate: defaultData?.employmentStartDate || "",
      profileImage: defaultData?.profileImage || "",
    }
  });

  // ฟังก์ชันแปลงรูปภาพเป็น Base64 string เพื่อส่งไปเซฟในฐานข้อมูล
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        form.setValue("profileImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: any) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background p-6 rounded-lg border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">จัดการข้อมูลผู้ใช้งาน</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            
            {/* 📸 ส่วนเลือกรูปโปรไฟล์ */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full border border-dashed border-muted-foreground/30 overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {previewImage ? (
                  <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">ยังไม่มีรูป</span>
                )}
              </div>
              <label className="cursor-pointer text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-1.5 rounded border">
                เลือกรูปโปรไฟล์
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>

            {/* 👤 ช่องกรอกชื่อ-นามสกุลจริง */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-foreground">ชื่อ - นามสกุลจริง</FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น นายประยุทธ์ จันอังคารพุธ" {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 📅 ช่องเลือกวันที่เริ่มงาน */}
            <FormField
              control={form.control}
              name="employmentStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-foreground">วัน/เดือน/ปี ที่เริ่มงาน</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ปุ่มบันทึก */}
            <Button type="submit" className="w-full font-medium py-2 rounded-md">
              บันทึกข้อมูลยูสเซอร์
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}