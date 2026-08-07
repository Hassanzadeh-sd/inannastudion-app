/**
 * استادیو اینانا team: business cards + directory.
 * `phones[0]` is the primary number shown on the QR card.
 */
export interface Person {
  id: string;
  /** Display name in Persian. */
  name: string;
  /** Latin name for the vCard N field (helps foreign phones sort). */
  latinName?: string;
  role?: string;
  company: string;
  phones: string[];
  email?: string;
  website?: string;
  /** true → gets a QR business card page. */
  hasCard: boolean;
}

export const COMPANY_NAME = 'استادیو اینانا';
export const COMPANY_NAME_LATIN = 'Inanna Studio';

export const TEAM: Person[] = [
  {
    id: 'azin',
    name: 'آذین',
    latinName: 'Azin - Inanna Studio',
    role: 'مدیر استادیو اینانا',
    company: COMPANY_NAME,
    phones: ['09354674923'],
    hasCard: true,
  },
  {
    id: 'sajjad',
    name: 'سجاد حسن‌زاده',
    latinName: 'Sajjad Hassanzadeh - Inanna Studio',
    role: 'همکار',
    company: COMPANY_NAME,
    phones: ['09378228100'],
    hasCard: true,
  },
  {
    id: 'parisa',
    name: 'پریسا فیض',
    latinName: 'Parisa Feyz - Inanna Studio',
    role: 'همکار',
    company: COMPANY_NAME,
    phones: ['09359341543'],
    hasCard: true,
  },
];

export const FOLLOWUP_CHIPS = [
  'تماس هفته آینده',
  'ارسال کاتالوگ',
  'دعوت به دفتر',
  'پیگیری در تلگرام',
  'ارسال پیش‌فاکتور',
] as const;
