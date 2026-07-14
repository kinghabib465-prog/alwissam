/** تحويل الأرقام العربية/الفارسية إلى لاتينية غربية 0-9 */
export function toLatinDigits(input: string | number) {
  return String(input)
    .replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]!)
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]!);
}
