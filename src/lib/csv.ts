import type { Lead } from '../db/leads.repo';
import { formatFaDateTime } from './digits';

const HEADER = [
  'phone',
  'name',
  'rating',
  'status',
  'note',
  'followup',
  'created_at',
  'created_at_fa',
  'updated_at',
];

function cell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM + CRLF so Excel renders Persian text correctly. */
export function leadsToCsv(leads: Lead[]): string {
  const rows = [HEADER.join(',')];
  for (const l of leads) {
    rows.push(
      [
        cell(l.phone),
        cell(l.name),
        cell(l.rating),
        cell(l.status),
        cell(l.note),
        cell(l.followup),
        cell(l.created_at),
        cell(formatFaDateTime(l.created_at)),
        cell(l.updated_at),
      ].join(','),
    );
  }
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}
