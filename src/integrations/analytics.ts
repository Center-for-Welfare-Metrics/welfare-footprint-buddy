/**
 * Lightweight analytics helper for tracking user events.
 * Events are logged to Supabase user_events table via the log-event edge function.
 * 
 * Privacy-respecting: No cookies, no fingerprinting, no PII stored.
 * IP addresses are hashed server-side before storage.
 */

import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType =
  | "app_opened"
  | "scan_started"
  | "scan_completed"
  | "ethical_lens_changed"
  | "swap_suggestion_requested"
  | "swap_suggestion_completed"
  | "daily_limit_block"
  | "login_started"
  | "login_succeeded"
  | "signup_started"
  | "signup_succeeded"
  | "error_ai_failure"
  | "error_rate_limited";

export type AnalyticsProperties = Record<string, unknown>;

/**
 * Track an analytics event. This function is fire-and-forget -
 * it will never block UI or throw errors.
 * 
 * @param eventType - The type of event to track
 * @param properties - Optional properties to attach to the event
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  properties: AnalyticsProperties = {}
): Promise<void> {
  try {
    // Use supabase.functions.invoke for proper auth header forwarding
    await supabase.functions.invoke('log-event', {
      body: {
        eventType,
        properties,
      },
    });
  } catch (_err) {
    // Fail silently – analytics must never break the app
    // Only log in development for debugging
    if (import.meta.env.DEV) {
      console.debug('[Analytics] Failed to track event:', eventType, _err);
    }
  }
}
