const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function thaiShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
}

export function getCurrentPayMonth(): string {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  if (today.getDate() > 20) {
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export interface PayPeriod {
  start: string;
  end: string;
  payDate: string;
}

export function getPayPeriod(payMonth: string): PayPeriod {
  const [year, month] = payMonth.split("-").map(Number);

  let prevYear = year, prevMonth = month - 1;
  if (prevMonth === 0) { prevMonth = 12; prevYear--; }

  const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-21`;
  const end   = `${year}-${String(month).padStart(2, "0")}-20`;
  const lastDay = new Date(year, month, 0).getDate();
  const payDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  return { start, end, payDate };
}

export function payPeriodLabel(p: PayPeriod): string {
  return `${thaiShortDate(p.start)} – ${thaiShortDate(p.end)}`;
}
