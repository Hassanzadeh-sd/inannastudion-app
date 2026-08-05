import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { exportableLeads, type Lead } from '../db/leads.repo';
import { leadsToCsv } from './csv';

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

function writeAndReturn(name: string, contents: string | Uint8Array): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.write(contents);
  return file;
}

export async function shareCsv(): Promise<number> {
  const leads = await exportableLeads();
  const file = writeAndReturn(`inanna-leads-${stamp()}.csv`, leadsToCsv(leads));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'خروجی سرنخ‌ها (CSV)',
  });
  return leads.length;
}

function leadsToXlsx(leads: Lead[]): Uint8Array {
  const header = ['شماره تماس', 'نام', 'امتیاز', 'وضعیت', 'عضو کلوپ', 'یادداشت', 'برنامه پیگیری', 'تاریخ ثبت'];
  const rows = leads.map((l) => [
    l.phone,
    l.name ?? '',
    l.rating ?? '',
    l.status,
    l.verified_at ? 'بله' : '',
    l.note ?? '',
    l.followup ?? '',
    l.created_at,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 32 }, { wch: 32 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(buf);
}

export async function shareXlsx(): Promise<number> {
  const leads = await exportableLeads();
  const file = writeAndReturn(`inanna-leads-${stamp()}.xlsx`, leadsToXlsx(leads));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'خروجی سرنخ‌ها (Excel)',
  });
  return leads.length;
}
