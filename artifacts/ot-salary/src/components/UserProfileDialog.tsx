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

  // ✨ ซ่อมจุดบกพร่อง: บังคับอัปเดตค่าในฟอร์มเมื่อข้อมูลโหลดมาจาก Database สำเร็จ
  React.useEffect(() => {
    if (defaultData) {
      form.reset({
        fullName: defaultData.fullName || "",
        employmentStartDate: defaultData.employmentStartDate || "",
        profileImage: defaultData.profileImage || "",
      });
      setPreviewImage(defaultData.profileImage || "");
    }
  }, [defaultData, form]);

  // 📸 ฟังก์ชันเวอร์ชันอัปเกรด: ย่อขนาดและบีบอัดรูปภาพอัตโนมัติก่อนส่งไปเซฟ กันปัญหา Payload Too Large
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;  // กำหนดความกว้างสูงสุด 400px (เพียงพอสำหรับรูป avatar เล็กๆ)
          const MAX_HEIGHT = 400; // กำหนดความสูงสูงสุด 400px
          let width = img.width;
          let height = img.height;

          // คำนวณอัตราส่วน (Aspect Ratio) เพื่อไม่ให้รูปเบี้ยว
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // บีบอัดรูปภาพให้เป็นฟอร์แมต jpeg และลดคุณภาพเหลือ 70% (0.7) เพื่อลดขนาดไฟล์ให้เบาที่สุด
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          
          setPreviewImage(compressedBase64);
          form.setValue("profileImage", compressedBase64);
        };
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