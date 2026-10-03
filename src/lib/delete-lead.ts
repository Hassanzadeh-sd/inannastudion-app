import { Alert, ToastAndroid } from 'react-native';
import { softDeleteLead } from '../db/leads.repo';
import { bumpLeadsVersion } from '../store/leads-version';
import { useServerLeads } from '../store/server-leads';
import { deleteServerLead } from './server-leads';
import { pushSoon } from './sync';

/**
 * Ask for confirmation, then remove one customer: on the shared server list in
 * server mode, otherwise a local soft delete that the next sync pushes up.
 * Shared by the customer list (per-row trash icon) and the detail screen.
 */
export function confirmDeleteLead(id: string, serverMode: boolean, onDeleted?: () => void): void {
  Alert.alert('حذف مشتری', 'اطلاعات این مشتری حذف شود؟', [
    { text: 'انصراف', style: 'cancel' },
    {
      text: 'حذف',
      style: 'destructive',
      onPress: async () => {
        if (serverMode) {
          const ok = await deleteServerLead(id);
          if (!ok) {
            ToastAndroid.show('حذف روی سرور ناموفق بود', ToastAndroid.LONG);
            return;
          }
          void useServerLeads.getState().refresh();
        } else {
          await softDeleteLead(id);
          bumpLeadsVersion();
          pushSoon();
        }
        ToastAndroid.show('حذف شد', ToastAndroid.SHORT);
        onDeleted?.();
      },
    },
  ]);
}
