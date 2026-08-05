/**
 * استودیو اینانا team: business cards + directory.
 * TODO(saji): replace placeholder people with the real team before the
 * exhibition. `phones[0]` is the primary number shown on the QR card.
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

export const COMPANY_NAME = 'استودیو اینانا';
export const COMPANY_NAME_LATIN = 'Inanna Studio';

export const TEAM: Person[] = [
  {
    id: 'owner',
    name: 'مدیر استودیو اینانا',
    latinName: 'Inanna Studio',
    role: 'مدیریت',
    company: COMPANY_NAME,
    phones: ['09120000000'],
    email: 'info@example.com',
    hasCard: true,
  },
  {
    id: 'colleague-1',
    name: 'همکار اول',
    role: 'کارشناس فروش',
    company: COMPANY_NAME,
    phones: ['09120000001'],
    hasCard: true,
  },
  {
    id: 'colleague-2',
    name: 'همکار دوم',
    role: 'پشتیبانی',
    company: COMPANY_NAME,
    phones: ['09120000002'],
    hasCard: false,
  },
];

export const FOLLOWUP_CHIPS = [
  'تماس هفته آینده',
  'ارسال کاتالوگ',
  'دعوت به دفتر',
  'پیگیری در تلگرام',
  'ارسال پیش‌فاکتور',
] as const;
