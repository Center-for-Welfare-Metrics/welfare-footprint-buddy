# Analytics Overview

This document describes the lightweight, privacy-respecting analytics system in the Food Welfare Explorer app.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Event Types](#event-types)
- [Architecture](#architecture)
- [Admin Analytics Dashboard](#admin-analytics-dashboard)

---

## Overview

The analytics system tracks app usage without collecting PII (Personally Identifiable Information):

- **No cookies** or fingerprinting
- **No raw IP addresses** – only SHA-256 hashed IPs
- **No external services** – all data stays in Supabase
- Events are fire-and-forget (never block UI)

---

## Database Schema

### Table: `user_events`

| Column            | Type        | Nullable | Default            |
|-------------------|-------------|----------|--------------------|
| `id`              | uuid        | No       | `gen_random_uuid()`|
| `timestamp`       | timestamptz | No       | `now()`            |
| `user_id`         | uuid        | Yes      | —                  |
| `ip_hash`         | text        | Yes      | —                  |
| `event_type`      | text        | No       | —                  |
| `event_properties`| jsonb       | Yes      | —                  |
| `user_agent`      | text        | Yes      | —                  |

### RLS Policies

- `Allow insert for authenticated users` – any authenticated user can insert
- `Allow insert for anon` – anonymous users can also insert
- **No SELECT policies** – data is read only via service role (admin functions)

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

### Server-Side Logging

AI edge functions also emit `[EVENT]` logs for debugging:

```typescript
console.log('[EVENT] scan_completed', { userId, mode, itemCount });
console.error('[EVENT] error_ai_failure', { userId, error });
```

---

## Admin Analytics Dashboard

### Access

**Route:** `/admin/analytics`

**Requirements:**
1. User must be logged in
2. User must have `admin` role in `user_roles` table

### How Admin is Determined

The system uses the existing `has_role` database function:

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

Uses `recharts` for visualization (already in project dependencies).

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
