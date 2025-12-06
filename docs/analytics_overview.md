# Analytics Overview

This document describes the lightweight, privacy-respecting analytics system in the Food Welfare Explorer app.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Event Types](#event-types)
- [Architecture](#architecture)
- [How to Add New Event Types](#how-to-add-new-event-types)
- [Admin Analytics Dashboard](#admin-analytics-dashboard)

---

## Overview

The analytics system tracks app usage without collecting PII (Personally Identifiable Information):

- **No cookies** or fingerprinting
- **No raw IP addresses** – only SHA-256 hashed IPs
- **No external services** – all data stays in the backend database
- Events are fire-and-forget (never block UI)

---

## Database Schema

### Table: `user_events`

| Column            | Type        | Nullable | Default            | Description |
|-------------------|-------------|----------|--------------------|-------------|
| `id`              | uuid        | No       | `gen_random_uuid()`| Unique event identifier |
| `timestamp`       | timestamptz | No       | `now()`            | When the event occurred |
| `user_id`         | uuid        | Yes      | —                  | Authenticated user's ID (null for anonymous) |
| `ip_hash`         | text        | Yes      | —                  | SHA-256 hash of client IP (never raw IP) |
| `event_type`      | text        | No       | —                  | Type of event (see Event Types below) |
| `event_properties`| jsonb       | Yes      | —                  | Additional event metadata |
| `user_agent`      | text        | Yes      | —                  | Browser user agent string |

### RLS Policies

- `Allow insert for authenticated users` – any authenticated user can insert events
- `Allow insert for anon` – anonymous users can also insert events
- **No SELECT policies** – data is read only via service role (admin functions)

### Data Flow

```
User Action → Frontend trackEvent() → Edge Function (log-event) → user_events table
```

### IP Hashing

For privacy, raw IP addresses are **never stored**. The `log-event` edge function hashes IPs using SHA-256:

```typescript
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
```

This one-way hash allows tracking unique anonymous visitors without storing identifiable data.

---

## Event Types

Currently tracked events:

| Event Type                 | Description                              | Properties                     |
|----------------------------|------------------------------------------|--------------------------------|
| `app_opened`               | User opens the app                       | `{ source: "web" }`           |
| `scan_started`             | User initiates an image/text scan        | `{ mode, language }`          |
| `scan_completed`           | Scan successfully returns results        | `{ mode, detectedItems }`     |
| `ethical_lens_changed`     | User adjusts the ethical lens slider     | `{ lens }`                    |
| `swap_suggestion_requested`| User requests ethical swap alternatives  | `{ lens, productCategory }`   |
| `swap_suggestion_completed`| Swap suggestions returned successfully   | `{ alternativesCount }`       |
| `daily_limit_block`        | User hits anonymous daily limit          | `{ mode, lens? }`             |
| `login_started`            | User clicks login button                 | —                             |
| `login_succeeded`          | Login successful                         | —                             |
| `signup_started`           | User starts signup flow                  | —                             |
| `signup_succeeded`         | Signup successful                        | —                             |
| `error_ai_failure`         | AI call failed                           | `{ mode, error }`             |
| `error_rate_limited`       | User was rate-limited                    | `{ mode? }`                   |

### Property Details

- **`mode`**: Either `"image"` or `"text"` depending on input method
- **`language`**: ISO language code (e.g., `"en"`, `"es"`)
- **`lens`**: Ethical lens value (1-4)
  - 1 = Higher-Welfare Omnivore
  - 2 = Lower Consumption
  - 3 = No Slaughter
  - 4 = No Animal Use
- **`detectedItems`**: Number of food items detected in the scan
- **`alternativesCount`**: Number of ethical alternatives returned
- **`error`**: Error message when AI call fails

---

## Architecture

### Frontend Helper

**File:** `src/integrations/analytics.ts`

```typescript
import { trackEvent } from '@/integrations/analytics';

// Example usage
trackEvent('scan_started', { mode: 'image', language: 'en' });
```

- Uses `supabase.functions.invoke('log-event', { body: {...} })`
- Fails silently – analytics never breaks the app
- Typed event names prevent typos

### Edge Function

**File:** `supabase/functions/log-event/index.ts`

- Accepts POST with `{ eventType, properties }`
- Extracts `user_id` from JWT if present
- Hashes IP using SHA-256
- Inserts into `user_events` table
- Always returns `{ success: true/false }`
- Config: `verify_jwt = false` (allows anonymous event logging)

### Server-Side Logging

AI edge functions also emit `[EVENT]` logs for debugging:

```typescript
console.log('[EVENT] scan_completed', { userId, mode, itemCount });
console.error('[EVENT] error_ai_failure', { userId, error });
```

These appear in edge function logs and help with operational debugging.

---

## How to Add New Event Types

### Step 1: Define the Event Type

Add the new event type to `src/integrations/analytics.ts`:

```typescript
type AnalyticsEventType =
  | "app_opened"
  | "scan_started"
  // ... existing types
  | "your_new_event";  // Add here
```

### Step 2: Define Properties (if any)

Document what properties your event will include:

```typescript
// Example properties
trackEvent('your_new_event', {
  someValue: 123,
  category: 'example'
});
```

### Step 3: Add the Tracking Call

In the appropriate component or function:

```typescript
import { trackEvent } from '@/integrations/analytics';

// Call when the event occurs
trackEvent('your_new_event', { someValue: 123 });
```

### Step 4: Update Documentation

Add your new event to the Event Types table in this document.

### Best Practices

- **Never log PII**: No emails, names, or identifiable data in properties
- **Keep properties minimal**: Only include what's needed for analysis
- **Use consistent naming**: Follow the existing `snake_case` convention
- **Fail silently**: Analytics should never break user experience
- **Document thoroughly**: Future developers need to understand each event

---

## Admin Analytics Dashboard

### Access

**Route:** `/admin/analytics`

**Requirements:**
1. User must be logged in
2. User must have `admin` role in `user_roles` table

### How Admin is Determined

The system uses the `has_role` database function:

```sql
SELECT has_role(user_id, 'admin');
```

To grant admin access, insert a row into `user_roles`:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_UUID', 'admin');
```

### Edge Function

**File:** `supabase/functions/admin-analytics/index.ts`

- **Config:** `verify_jwt = true` (requires authentication)
- Validates JWT and checks admin role
- Returns aggregated analytics (no raw events, no IP hashes)

### Response Format

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_events_last_7_days": 1234,
      "total_scans_last_7_days": 350,
      "unique_users_last_7_days": 47,
      "anon_vs_logged_in": {
        "anonymous": 280,
        "logged_in": 70
      },
      "daily_limit_hits_last_7_days": 15
    },
    "scans_per_day": [
      { "date": "2025-02-01", "count": 10 },
      { "date": "2025-02-02", "count": 15 }
    ],
    "lens_usage": [
      { "lens": 1, "count": 30 },
      { "lens": 2, "count": 25 },
      { "lens": 3, "count": 18 },
      { "lens": 4, "count": 7 }
    ],
    "daily_limit_hits": [
      { "date": "2025-02-01", "count": 3 },
      { "date": "2025-02-02", "count": 5 }
    ],
    "event_type_counts": [
      { "event_type": "scan_completed", "count": 350 },
      { "event_type": "app_opened", "count": 200 }
    ]
  }
}
```

### Dashboard UI

**File:** `src/pages/AdminAnalytics.tsx`

Features:
- 4 summary cards (scans, users, anon vs auth, daily limits)
- Line chart: scans per day (30 days)
- Bar chart: lens usage breakdown
- Table: event type counts (7 days)

Uses `recharts` for visualization.

### How Collaborators Access the Dashboard

1. Create an account on the app
2. Ask an existing admin to add their `user_id` to `user_roles` with `role = 'admin'`
3. Navigate to `/admin/analytics`

---

## Security Notes

- Analytics data is **never exposed** via public API
- Only aggregated stats are returned (no individual events)
- IP hashes cannot be reversed to original IPs
- Admin access requires both JWT and `admin` role verification
