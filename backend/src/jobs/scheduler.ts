import cron from 'node-cron';
import { performDailyScan } from './scan.js';

/**
 * Initialize job scheduler
 * Schedules daily scan at 4 PM ET (16:00 ET = 13:00 PT / 21:00 UTC depending on DST)
 */
export function initializeScheduler(): void {
  // Cron pattern for 4 PM ET every weekday
  // 0 16 * * 1-5 = 4 PM ET Monday-Friday
  // For daily including weekends: 0 16 * * *
  
  const scanTask = cron.schedule('0 16 * * *', async () => {
    console.log('[Scheduler] Starting daily scan at 4 PM ET...');
    try {
      await performDailyScan('scheduled');
      console.log('[Scheduler] Daily scan completed successfully');
    } catch (error) {
      console.error('[Scheduler] Daily scan failed:', error);
    }
  });

  console.log('Job scheduler initialized. Daily scan scheduled for 4 PM ET.');
  return scanTask.start();
}

/**
 * Manually trigger a scan
 */
export async function triggerManualScan(): Promise<void> {
  console.log('[Manual] Triggering manual scan...');
  try {
    await performDailyScan('manual');
    console.log('[Manual] Scan completed successfully');
  } catch (error) {
    console.error('[Manual] Scan failed:', error);
    throw error;
  }
}

/**
 * Stop the scheduler
 */
export function stopScheduler(task: any): void {
  if (task) {
    task.stop();
    console.log('Scheduler stopped');
  }
}
