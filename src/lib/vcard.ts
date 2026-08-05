import type { Person } from '../constants/team';
import { toE164 } from './phone';

/** Escape per RFC 2426: backslash, comma, semicolon, newline. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Lean vCard 3.0 (CRLF line endings, UTF-8). Kept to a handful of fields so
 * the QR stays low-density and scans instantly from a screen.
 */
export function buildVCard(person: Person): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(person.latinName ?? person.name)};;;;`,
    `FN:${esc(person.name)}`,
    `ORG:${esc(person.company)}`,
  ];
  if (person.role) lines.push(`TITLE:${esc(person.role)}`);
  for (const phone of person.phones.slice(0, 2)) {
    lines.push(`TEL;TYPE=CELL:${toE164(phone)}`);
  }
  if (person.email) lines.push(`EMAIL:${esc(person.email)}`);
  if (person.website) lines.push(`URL:${esc(person.website)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
