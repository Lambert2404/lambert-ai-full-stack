import { prisma } from '../lib/prisma.js';

export type NotificationType =
  | 'study_reminder'
  | 'quiz_result'
  | 'study_plan'
  | 'new_material'
  | 'achievement'
  | 'system';

function isValidType(type: string): type is NotificationType {
  return ['study_reminder', 'quiz_result', 'study_plan', 'new_material', 'achievement', 'system'].includes(type);
}

/**
 * Create an in-app notification. Preferences are respected: if the user has
 * turned a notification category off, we skip storing delivery-events.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    // Only "off" preferences suppress in-app notifications currently.
    if (pref && pref.push === false && pref.email === false) return null;
  } catch {
    // default to storing
  }
  return prisma.notification.create({
    data: { userId, type, title, body, data: (data ?? undefined) as never },
  });
}

/** Notification used when FE Prefs type list is external; validated here. */
export { isValidType }; // eslint-disable-line -- keep validation reusable