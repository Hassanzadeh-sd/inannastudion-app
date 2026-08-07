import Constants from 'expo-constants';

/** true when running the dedicated employee build («اینانا همکار»). */
export const IS_EMPLOYEE_APP = Constants.expoConfig?.extra?.variant === 'employee';

export const DEFAULT_SYNC_URL = 'https://opendevtalk.com/lead-api';
