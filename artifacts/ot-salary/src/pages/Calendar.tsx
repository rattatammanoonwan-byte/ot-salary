import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("ot_salary_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type ShiftType = "D" | "N" | "S" | "DS" | "NS" | "DH" | "NH" | "PL" | "SL" | "AL";

interface ShiftRecord {
  id: number;
  workDate: string;
  shiftType: ShiftType;
  otHours: number | null;
  note: string | null;
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Calculates the shift schedule for every day in the target month.
 *
 * Cycle = 28 calendar days (repeats forever from employment start):
 *   pos  0– 5  →  D  (6 day shift days)
 *   pos  6      →  S  (off)
 *   pos  7–12  →  D  (6 day shift days)
 *   pos  13     →  S  (off)
 *   pos  14–19  →  N  (6 night shift days)
 *   pos  20     →  S  (off)
 *   pos  21–26  →  N  (6 night shift days)
 *   pos  27     →  S  (off)
 *
 * Returns a map of dateStr → ShiftType for every day in the target month.
 */
function computeMonthAutoShifts(
  startDate: Date,
  year: number,
  month: number,
): Map<string, ShiftType> {
  const result = new Map<string, ShiftType>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = new Date(year, month, daysInMonth);
  const maxDiff = Math.floor(
    (lastDay.getTime() - startDate.getTime()) / 86400000,
  );

  if (maxDiff < 0) return result; // entire month is before employment start

  for (let d = 0; d <= maxDiff; d++) {
    const pos = d % 28;

    let shift: ShiftType;
    if (pos === 6 || pos === 13 || pos === 20 || pos === 27) {
      shift = "S";
    } else if (pos >= 14) {
      shift = "N"; // pos 14–19 and 21–26
    } else {
      shift = "D"; // pos 0–5 and 7–12
    }

    // Store only days that fall in the target month
    const dayMs = startDate.getTime() + d * 86400000;
    const dayDate = new Date(dayMs);
    if (dayDate.getFullYear() === year && dayDate.getMonth() === month) {
      result.set(formatDate(year, month, dayDate.getDate()), shift);
    }
  }

  return result;
}

const SHIFT_COLORS: Record<ShiftType, string> = {
  D: "bg-sky-500 text-white",
  N: "bg-violet-600 text-white",
  S: "bg-slate-400 text-white",
  DS: "bg-amber-500 text-white",
  NS: "bg-amber-700 text-white",
  DH: "bg-rose-500 text-white",
  NH: "bg-rose-700 text-white",
  PL: "bg-orange-500 text-white",
  SL: "bg-green-500 text-white",
  AL: "bg-teal-500 text-white",
};

const SHIFT_MUTED: Record<ShiftType, string> = {
  D: "bg-sky-100 text-sky-600",
  N: "bg-violet-100 text-violet-600",
  S: "bg-slate-100 text-slate-500",
  DS: "bg-amber-100 text-amber-700",
  NS: "bg-amber-200 text-amber-800",
  DH: "bg-rose-100 text-rose-700",
  NH: "bg-rose-200 text-rose-800",
  PL: "bg-orange-100 text-orange-600",
  SL: "bg-green-100 text-green-600",
  AL: "bg-teal-100 text-teal-600",
};

const SHIFT_LABEL: Record<ShiftType, string> = {
  D: "กะกลางวัน",
  N: "กะกลางคืน",
  S: "วันหยุด",
  DS: "หยุด/สัปดาห์ D",
  NS: "หยุด/สัปดาห์ N",
  DH: "หยุด/ประจำปี D",
  NH: "หยุด/ประจำปี N",
  PL: "ลากิจ",
  SL: "ลาป่วย",
  AL: "ลาพักร้อน",
};

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const today = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employmentStartDate, setEmploymentStartDate] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<string>("");
  const [formShift, setFormShift] = useState<ShiftType>("D");
  const [formOt, setFormOt] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, shiftsRes] = await Promise.all([
        fetch(`${BASE}/api/settings`, { headers: authHeaders() }),
        fetch(`${BASE}/api/shifts?month=${monthKey}`, {
          headers: authHeaders(),
        }),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setEmploymentStartDate(s.employmentStartDate ?? null);
      }
      if (shiftsRes.ok) {
        setShifts(await shiftsRes.json());
      } else {
        setShifts([]);
      }
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shiftMap = new Map<string, ShiftRecord>(
    shifts.map((s) => [s.workDate, s]),
  );

  const startDate = employmentStartDate
    ? new Date(employmentStartDate + "T00:00:00")
    : null;

  // Compute auto-schedule for the entire month in one simulation pass
  // คำนวณ autoShift ครอบคลุมทั้ง 2 เดือน เพื่อให้รอบ 21-20 ได้ข้อมูลครบ
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  const autoShiftMap = startDate
    ? new Map<string, ShiftType>([
        ...computeMonthAutoShifts(startDate, prevYear, prevMonth),
        ...computeMonthAutoShifts(startDate, year, month),
      ])
    : new Map<string, ShiftType>();

  function getDisplayShift(
    dateStr: string,
  ): { shift: ShiftType; isSaved: boolean } | null {
    const saved = shiftMap.get(dateStr);
    if (saved) return { shift: saved.shiftType as ShiftType, isSaved: true };
    const auto = autoShiftMap.get(dateStr);
    if (!auto) return null;
    return { shift: auto, isSaved: false };
  }

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const summary = (() => {
    let work = 0,
      d = 0,
      n = 0,
      s = 0,
      leave = 0;

    // คำนวณรอบเงินเดือน: 21 เดือนที่แล้ว → 20 เดือนนี้
    const periodStart = new Date(year, month - 1, 21);
    const periodEnd = new Date(year, month, 20);

    const current = new Date(periodStart);
    while (current <= periodEnd) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const saved = shiftMap.get(dateStr);
      const auto = autoShiftMap.get(dateStr);
      const shift = saved?.shiftType ?? auto;
      if (
        shift === "D" ||
        shift === "N" ||
        shift === "NS" ||
        shift === "NH" ||
        shift === "DS" ||
        shift === "DH"
      )
        work++;
      if (shift === "D" || shift === "DS" || shift === "DH") d++;
      else if (shift === "N" || shift === "NS" || shift === "NH") n++;
      else if (shift === "S") s++;
      else if (shift === "PL" || shift === "SL" || shift === "AL") leave++;
      current.setDate(current.getDate() + 1);
    }

    return { work, d, n, s, leave };
  })();

  function openDialog(day: number) {
    const dateStr = formatDate(year, month, day);
    const saved = shiftMap.get(dateStr);
    const autoInfo = getDisplayShift(dateStr);
    setDialogDate(dateStr);
    setFormShift((saved?.shiftType as ShiftType) ?? autoInfo?.shift ?? "D");
    setFormOt(saved?.otHours != null ? String(saved.otHours) : "");
    setFormNote(saved?.note ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/shifts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          workDate: dialogDate,
          shiftType: formShift,
          otHours: formOt ? parseFloat(formOt) : null,
          note: formNote || null,
        }),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      const saved = await res.json();
      setShifts((prev) => {
        const without = prev.filter((s) => s.workDate !== dialogDate);
        return [...without, saved];
      });
      setDialogOpen(false);
      toast({ title: "บันทึกสำเร็จ" });
    } catch (e: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/shifts/by-date?date=${dialogDate}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setShifts((prev) => prev.filter((s) => s.workDate !== dialogDate));
      setDialogOpen(false);
      toast({ title: "ลบข้อมูลสำเร็จ" });
    } catch {
      toast({ title: "ลบไม่สำเร็จ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const todayStr = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            ตารางกะ
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            คลิกวันเพื่อบันทึก OT และหมายเหตุ
          </p>
        </div>
        {!employmentStartDate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/settings")}
          >
            ตั้งค่าวันเริ่มงาน
          </Button>
        )}
      </div>

      {!employmentStartDate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ กรุณากำหนดวันเริ่มทำงานในหน้า <strong>ตั้งค่า</strong>{" "}
          เพื่อให้ระบบคำนวณตารางกะอัตโนมัติ
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          {
            label: "วันทำงาน (รอบนี้)",
            value: summary.work,
            color: "text-foreground",
          },
          { label: "กะกลางวัน (D)", value: summary.d, color: "text-sky-600" },
          {
            label: "กะกลางคืน (N)",
            value: summary.n,
            color: "text-violet-600",
          },
          { label: "วันหยุด (S)", value: summary.s, color: "text-slate-500" },
          { label: "วันลา (L)", value: summary.leave, color: "text-orange-500" },
        ].map((card) => (
          <Card key={card.label} className="bg-card">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          {THAI_MONTHS[month]} {year + 543}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0
                  ? "text-rose-500"
                  : i === 6
                    ? "text-blue-500"
                    : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            กำลังโหลด...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[72px] md:min-h-[90px] border-b border-r last:border-r-0 bg-muted/20"
                  />
                );
              }
              const dateStr = formatDate(year, month, day);
              const info = getDisplayShift(dateStr);
              const saved = shiftMap.get(dateStr);
              const isToday = dateStr === todayStr;
              const isSunday = idx % 7 === 0;
              const isSaturday = idx % 7 === 6;

              return (
                <div
                  key={dateStr}
                  onClick={() => openDialog(day)}
                  className={`min-h-[72px] md:min-h-[90px] border-b border-r last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-muted/50 flex flex-col gap-1 ${
                    isSunday
                      ? "bg-rose-50/50"
                      : isSaturday
                        ? "bg-blue-50/30"
                        : ""
                  }`}
                >
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isSunday
                          ? "text-rose-500"
                          : isSaturday
                            ? "text-blue-500"
                            : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>

                  {info && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded text-center ${
                        info.isSaved
                          ? SHIFT_COLORS[info.shift]
                          : SHIFT_MUTED[info.shift]
                      }`}
                    >
                      {info.shift}
                    </span>
                  )}

                  {saved?.otHours != null && saved.otHours > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium leading-tight">
                      OT {saved.otHours}ชม.
                    </span>
                  )}

                  {saved?.note && (
                    <span className="text-[10px] text-muted-foreground leading-tight truncate">
                      {saved.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-sky-500" /> D
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-violet-600" /> N
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-slate-400" /> S
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-amber-500" /> DS
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-amber-700" /> NS
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-rose-500" /> DH
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-rose-700" /> NH
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-4 rounded inline-block bg-sky-100 border border-sky-200" />{" "}
          = อัตโนมัติ
        </span>
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {dialogDate
                ? (() => {
                    const d = new Date(dialogDate + "T00:00:00");
                    return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
                  })()
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Shift Type */}
            <div className="space-y-2">
              <Label>ประเภทกะ</Label>
              <div className="flex gap-2">
                {(["D", "N", "S"] as ShiftType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormShift(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                      formShift === t
                        ? SHIFT_COLORS[t] + " border-transparent"
                        : "border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t}
                    <span className="block text-[10px] font-normal opacity-80">
                      {SHIFT_LABEL[t]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                {(["DS", "NS", "DH", "NH",] as ShiftType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormShift(t)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border-2 ${
                      formShift === t
                        ? SHIFT_COLORS[t] + " border-transparent"
                        : "border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t}
                    <span className="block text-[9px] font-normal opacity-80 leading-tight">
                      {SHIFT_LABEL[t]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                DS/NS = หยุดประจำสัปดาห์ · DH/NH = หยุดประจำปี 
              </p>
              <div className="flex gap-2 mt-1">
                {(["PL", "SL", "AL"] as ShiftType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormShift(t)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border-2 ${
                      formShift === t
                        ? SHIFT_COLORS[t] + " border-transparent"
                        : "border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t}
                    <span className="block text-[9px] font-normal opacity-80 leading-tight">{SHIFT_LABEL[t]}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">PL = ลากิจ · SL = ลาป่วย · AL = ลาพักร้อน</p>
            </div>

            {/* OT Hours */}
            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุ</Label>
              <Textarea
                id="note"
                placeholder="บันทึกเพิ่มเติม..."
                rows={2}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              {shiftMap.has(dialogDate) && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
