const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Map ASCII digits to Persian glyphs for display. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Normalize Persian/Arabic digits to ASCII for storage and validation. */
export function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/**
 * Wrap a digit run in LRI…PDI bidi isolates so grouped numbers
 * (e.g. «۰۹۱۲ ۳۴۵ ۶۷۸۹») keep left-to-right group order inside RTL text.
 */
export function ltrIsolate(s: string): string {
  return `⁦${s}⁩`;
}

const faDateTime = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const faDate = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatFaDateTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : faDateTime.format(t);
}

export function formatFaDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : faDate.format(t);
}
