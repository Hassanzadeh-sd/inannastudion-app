import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { checkForNewCustomers } from './notify';

export const NEW_CUSTOMER_TASK = 'inanna-new-customer-check';

TaskManager.defineTask(NEW_CUSTOMER_TASK, async () => {
  try {
    await checkForNewCustomers();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Android schedules this opportunistically; ~15 min is the OS minimum. */
export async function registerNewCustomerTask(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(NEW_CUSTOMER_TASK, { minimumInterval: 15 });
  } catch {
    // background tasks unavailable (Expo Go): foreground checks still work
  }
}
