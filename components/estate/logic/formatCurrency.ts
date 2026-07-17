/**
 * Formats a number with Nepali comma style:
 * last 3 digits grouped, then every 2 digits from the right.
 * e.g. 6800000 -> "68,00,000"
 */
export function formatNepaliComma(value: string | number): string {
  const str = String(value).replace(/[^0-9]/g, "");
  if (!str) return "";

  if (str.length <= 3) return str;

  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const pairs: string[] = [];
  let i = rest.length;

  while (i > 0) {
    pairs.unshift(rest.slice(Math.max(0, i - 2), i));
    i -= 2;
  }

  return [...pairs, last3].join(",");
}

const ARAB = 1_00_00_00_000;
const CRORE = 1_00_00_000;
const LAKH = 1_00_000;
const HAJAR = 1_000;

/**
 * Converts a number to a romanized Nepali/Indian place-value breakdown.
 * e.g. 23500000 -> "2 Crore 35 Lakh"
 */
export function toNepaliReadableWords(value: string | number): string {
  const num = Math.floor(typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value);
  if (!num || isNaN(num) || num <= 0) return "";

  const units = [
    { value: ARAB, label: "Arab" },
    { value: CRORE, label: "Crore" },
    { value: LAKH, label: "Lakh" },
    { value: HAJAR, label: "Hajar" },
  ];

  let remaining = num;
  const parts: string[] = [];

  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      parts.push(`${count} ${unit.label}`);
      remaining %= unit.value;
    }
  }

  if (remaining > 0 && parts.length < 3) {
    parts.push(remaining.toLocaleString());
  }

  return parts.join(" ");
}
