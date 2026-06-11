export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMonth(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatOtType(type: string): string {
  switch (type) {
    case "D":         return "กะกลางวัน";
    case "N":         return "กะกลางคืน";
    case "DS":        return "หยุด/สัปดาห์ D";
    case "NS":        return "หยุด/สัปดาห์ N";
    case "DH":        return "หยุด/ประจำปี D";
    case "NH":        return "หยุด/ประจำปี N";
    case "weekday":   return "วันธรรมดา";
    case "weekend":   return "วันเสาร์-อาทิตย์";
    case "holiday":   return "วันหยุดนักขัตฤกษ์";
    default:          return type;
  }
}

export function isSpecialOtType(type: string): boolean {
  return ["NS", "DS", "NH", "DH"].includes(type);
}
