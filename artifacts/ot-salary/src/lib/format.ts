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
    case "weekday":
      return "วันธรรมดา";
    case "weekend":
      return "วันเสาร์-อาทิตย์";
    case "holiday":
      return "วันหยุดนักขัตฤกษ์";
    default:
      return type;
  }
}
