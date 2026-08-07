import { Redirect } from 'expo-router';
import { IS_EMPLOYEE_APP } from '../lib/variant';

export default function Index() {
  // The employee app has no kiosk: straight to the shared customers list.
  return <Redirect href={IS_EMPLOYEE_APP ? '/staff/leads' : '/kiosk'} />;
}
