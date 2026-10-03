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
    id: 'management',
    name: 'اینانا استادیو',
    latinName: 'Inanna Studio',
    role: 'مدیریت',
    company: COMPANY_NAME,
    phones: ['09913406919'],
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

/** Multi-select tags an employee attaches to a customer (pick any number). */
export const FOLLOWUP_CHIPS = [
  'همکاری',
  'مشتری ثابت قدیمی',
  'سفارش قطعی',
  'ارسال سایت',
  'مراجعه حضوری',
  'پیگیری',
  'تیشرت دست دوز',
  'تیشرت چاپ',
  'جوراب',
] as const;
