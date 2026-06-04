/**
 * Nepali price utilities
 * - formatNepaliComma: formats a number with Devanagari-style commas (2,2,3 grouping)
 * - toNepaliWords: converts a number to Nepali word representation (e.g. 6800000 → "68 Lakhs")
 */

/**
 * Formats a number with Nepali comma style:
 * last 3 digits grouped, then every 2 digits from the right.
 * e.g. 6800000 → "68,00,000"
 */
export function formatNepaliComma(value: string | number): string {
  const str = String(value).replace(/[^0-9]/g, '');
  if (!str) return '';

  if (str.length <= 3) return str;

  // Last 3 digits
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);

  // Group remaining digits in pairs from the right
  const pairs: string[] = [];
  let i = rest.length;
  while (i > 0) {
    pairs.unshift(rest.slice(Math.max(0, i - 2), i));
    i -= 2;
  }

  return [...pairs, last3].join(',');
}

const ARAB   = 1_00_00_00_000; // 1,00,00,00,000
const KAROD  = 1_00_00_000;    // 1,00,00,000  (10 million)
const LAKH   = 1_00_000;       // 1,00,000     (100 thousand)
const HAJAR  = 1_000;          // 1,000

/**
 * Converts a number to a short Nepali word label.
 * e.g. 6800000 → "68 Lakhs", 150000000 → "15 Crores", 500000 → "5 Lakhs"
 * Returns empty string for 0 or invalid input.
 */
export function toNepaliWords(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (!num || isNaN(num) || num <= 0) return '';

  if (num >= ARAB) {
    const val = +(num / ARAB).toFixed(2);
    const display = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, '');
    return `${display} Arab${val !== 1 ? 's' : ''}`;
  }

  if (num >= KAROD) {
    const val = +(num / KAROD).toFixed(2);
    const display = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, '');
    return `${display} Crore${val !== 1 ? 's' : ''}`;
  }

  if (num >= LAKH) {
    const val = +(num / LAKH).toFixed(2);
    const display = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, '');
    return `${display} Lakh${val !== 1 ? 's' : ''}`;
  }

  if (num >= HAJAR) {
    const val = +(num / HAJAR).toFixed(2);
    const display = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(/\.?0+$/, '');
    return `${display} Hajar`;
  }

  return num.toLocaleString();
}

/**
 * Converts a number to a romanized Nepali/Indian place-value breakdown.
 * e.g. 23500000 -> "2 Crore 35 Lakh", 23550000 -> "2 Crore 35 Lakh 50 Hajar"
 */
export function toNepaliReadableWords(value: string | number): string {
  const num = Math.floor(typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value);
  if (!num || isNaN(num) || num <= 0) return '';

  const units = [
    { value: ARAB, label: 'Arab' },
    { value: KAROD, label: 'Crore' },
    { value: LAKH, label: 'Lakh' },
    { value: HAJAR, label: 'Hajar' },
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

  return parts.join(' ');
}
