# Study Participant Tracking & Research Analytics — Developer Guide

This document provides complete technical documentation for the study participant tracking and research analytics system used for IRB-compliant behavioral research.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
   - [study_participants Table](#study_participants-table)
   - [user_events Table Extensions](#user_events-table-extensions)
3. [Row-Level Security (RLS)](#row-level-security-rls)
4. [Edge Functions](#edge-functions)
   - [study-enroll](#study-enroll)
   - [study-withdraw](#study-withdraw)
   - [study-complete](#study-complete)
   - [study-anonymize](#study-anonymize)
   - [study-export](#study-export)
   - [log-event](#log-event)
5. [Event Logging](#event-logging)
   - [Frontend Integration](#frontend-integration)
   - [Study Event Fields](#study-event-fields)
   - [Allowed Event Properties (Whitelist)](#allowed-event-properties-whitelist)
6. [Admin Operations](#admin-operations)
   - [Running Exports](#running-exports)
   - [Completing a Study](#completing-a-study)
   - [Triggering Anonymization](#triggering-anonymization)
7. [Audit Logging](#audit-logging)

---

## Overview

The study tracking system enables researchers to:

- **Enroll participants** with randomized treatment group assignment
- **Track de-identified behavioral events** during the study period
- **Withdraw participants** upon request (preserving pre-withdrawal data)
- **Export anonymized data** for analysis
- **Automatically anonymize** data 90 days after study completion

### Key Privacy Principles

- No PII (name, email, location) is included in study data
- Participants are identified only by `participant_code` (format: `XXXX-XXXX`)
- IP addresses are hashed (SHA-256) before storage
- Full anonymization (nullifying `user_id`) occurs 90 days post-completion

---

## Database Schema

### study_participants Table

Stores enrollment records for study participants.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | Yes | - | References `auth.users`; nullified on anonymization |
| `treatment_group` | TEXT | No | - | Assigned group: `control`, `treatment_a`, `treatment_b` |
| `study_version` | TEXT | No | `'1.0'` | Study version identifier |
| `study_status` | TEXT | No | `'active'` | Status: `active`, `withdrawn`, `completed` |
| `participant_code` | TEXT | No | - | Unique export-safe identifier (`XXXX-XXXX`) |
| `contact_opt_in` | BOOLEAN | No | `false` | Consent for researcher contact |
| `consent_given_at` | TIMESTAMPTZ | No | `now()` | When consent was recorded |
| `enrolled_at` | TIMESTAMPTZ | No | `now()` | When enrollment occurred |
| `withdrawn_at` | TIMESTAMPTZ | Yes | - | When participant withdrew |
| `completed_at` | TIMESTAMPTZ | Yes | - | When study was marked complete |
| `anonymized_at` | TIMESTAMPTZ | Yes | - | When data was anonymized |
| `created_at` | TIMESTAMPTZ | Yes | `now()` | Record creation time |

**Constraints:**
- `UNIQUE (user_id, study_version)` — A user can only enroll once per study version
- `UNIQUE (participant_code)` — Export codes are globally unique

### user_events Table Extensions

The following columns were added to `user_events` for study tracking:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `participant_id` | UUID | Yes | References `study_participants.id` |
| `participant_code` | TEXT | Yes | Export-safe participant identifier |
| `treatment_group` | TEXT | Yes | Treatment group at time of event |
| `study_version` | TEXT | Yes | Study version at time of event |

**Note:** These fields are only populated for events from enrolled, active participants.

---

## Row-Level Security (RLS)

### study_participants Policies

| Policy | Command | Who | Condition |
|--------|---------|-----|-----------|
| Users can view their own study enrollment | SELECT | Users | `auth.uid() = user_id` |
| Admins can view all study participants | SELECT | Admins | `has_role(auth.uid(), 'admin')` |
| Admins can update study participants | UPDATE | Admins | `has_role(auth.uid(), 'admin')` |
| Service role can manage study participants | ALL | service_role | `auth.role() = 'service_role'` |

**Why no user UPDATE policy?**  
Withdrawal is handled exclusively through the `study-withdraw` edge function (using `service_role`) to ensure:
- Only `study_status` and `withdrawn_at` are modified
- `treatment_group`, `participant_code`, and other fields remain unchanged
- Audit logging is always performed

### user_events Policies

| Policy | Command | Who | Condition |
|--------|---------|-----|-----------|
| Admins can read study events | SELECT | Admins | `participant_id IS NOT NULL AND has_role(auth.uid(), 'admin')` |

---

## Edge Functions

All edge functions are located in `supabase/functions/`.

### study-enroll

**Path:** `POST /functions/v1/study-enroll`

**Purpose:** Enrolls an authenticated user in a study version with randomized treatment assignment.

**Auth Required:** User JWT (Bearer token)

**Request Body:**
```json
{
  "study_version": "1.0",      // Optional, defaults to "1.0"
  "contact_opt_in": false      // Optional, defaults to false
}
```

**Response (Success):**
```json
{
  "success": true,
  "participant_id": "uuid",
  "participant_code": "AB12-CD34",
  "treatment_group": "treatment_a",
  "study_version": "1.0"
}
```

**Side Effects:**
- Creates `study_participants` record
- Generates unique `participant_code`
- Randomly assigns `treatment_group`
- Logs `participant_enrolled` to `admin_audit_log`

**Error Cases:**
- 400: Already enrolled or previously withdrawn
- 401: Missing/invalid auth
- 500: Code generation failure

---

### study-withdraw

**Path:** `POST /functions/v1/study-withdraw`

**Purpose:** Withdraws an authenticated user from their active study enrollment.

**Auth Required:** User JWT (Bearer token)

**Request Body:**
```json
{
  "study_version": "1.0"  // Optional, defaults to "1.0"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "You have been withdrawn from the study. Data collected before withdrawal may be used in anonymized analysis."
}
```

**Side Effects:**
- Updates `study_status` to `'withdrawn'`
- Sets `withdrawn_at` timestamp
- Logs `participant_withdrawn` to `admin_audit_log`

**Security Notes:**
- Uses `service_role` client for database updates
- Validates `auth.uid()` matches `user_id` in the enrollment record
- Only allows withdrawal from `'active'` status

---

### study-complete

**Path:** `POST /functions/v1/study-complete`

**Purpose:** Marks all active participants in a study version as completed.

**Auth Required:** Admin JWT (user must have `admin` role in `user_roles`)

**Request Body:**
```json
{
  "study_version": "1.0"  // Required
}
```

**Response (Success):**
```json
{
  "success": true,
  "study_version": "1.0",
  "participants_completed": 42,
  "completed_at": "2025-12-08T20:00:00.000Z",
  "message": "Study version 1.0 has been marked as completed. Anonymization will be available 90 days from now."
}
```

**Side Effects:**
- Updates all `active` participants to `study_status = 'completed'`
- Sets `completed_at` timestamp
- Logs `study_completed` to `admin_audit_log`

---

### study-anonymize

**Path:** `POST /functions/v1/study-anonymize`

**Purpose:** Anonymizes participant and event data for completed studies (90+ days post-completion).

**Auth Required:** Admin JWT (user must have `admin` role)

**Request Body:**
```json
{
  "study_version": "1.0"  // Required
}
```

**Response (Success):**
```json
{
  "success": true,
  "participants_anonymized": 35,
  "events_anonymized": 1250,
  "study_version": "1.0"
}
```

**Anonymization Logic:**

```sql
-- Step 1: Anonymize participants
UPDATE study_participants
SET user_id = NULL, anonymized_at = NOW()
WHERE study_version = $1
  AND study_status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at + INTERVAL '90 days' < NOW()
  AND anonymized_at IS NULL;

-- Step 2: Anonymize associated events
UPDATE user_events
SET user_id = NULL
WHERE participant_id IN (
  SELECT id FROM study_participants
  WHERE study_version = $1 AND anonymized_at IS NOT NULL
);
```

**Side Effects:**
- Nullifies `user_id` in `study_participants` for eligible records
- Nullifies `user_id` in `user_events` for those participants
- Logs `study_anonymized` to `admin_audit_log`

---

### study-export

**Path:** `POST /functions/v1/study-export`

**Purpose:** Exports de-identified study data for research analysis.

**Auth Required:** Admin JWT (user must have `admin` role)

**Request Body:**
```json
{
  "study_version": "1.0",           // Required
  "format": "csv",                   // Optional: "json" (default) or "csv"
  "date_from": "2025-01-01",        // Optional: filter events from date
  "date_to": "2025-06-30",          // Optional: filter events to date
  "treatment_group": "treatment_a"   // Optional: filter by treatment group
}
```

**Response (JSON format):**
```json
{
  "success": true,
  "study_version": "1.0",
  "events_count": 500,
  "participants_count": 25,
  "data": [
    {
      "participant_code": "AB12-CD34",
      "treatment_group": "treatment_a",
      "study_version": "1.0",
      "event_type": "scan_completed",
      "event_timestamp": "2025-03-15T10:30:00.000Z",
      "contact_opt_in": false,
      "lens": "animal_welfare",
      "welfare_category": "high"
    }
  ]
}
```

**Response (CSV format):**
Returns a downloadable CSV file with headers matching the JSON fields.

**Exported Fields:**
- `participant_code` — De-identified participant ID
- `treatment_group` — Assigned treatment group
- `study_version` — Study version
- `event_type` — Type of event
- `event_timestamp` — When event occurred
- `contact_opt_in` — Whether participant opted in for contact
- Whitelisted `event_properties` fields (see below)

**NOT exported:** `user_id`, email, name, IP address, raw event properties

---

### log-event

**Path:** `POST /functions/v1/log-event`

**Purpose:** Logs analytics events from the frontend, with optional study tracking fields.

**Auth Required:** None (public endpoint), but user JWT is used if present

**Request Body:**
```json
{
  "eventType": "scan_completed",
  "properties": {
    "lens": "animal_welfare",
    "welfare_category": "medium"
  },
  // Optional study fields (only for enrolled active participants):
  "participant_id": "uuid",
  "participant_code": "AB12-CD34",
  "treatment_group": "treatment_a",
  "study_version": "1.0"
}
```

**Side Effects:**
- Inserts record into `user_events` table
- Hashes IP address (SHA-256) before storage
- Includes study fields only if `participant_id` is provided

---

## Event Logging

### Frontend Integration

Events are tracked using the `trackEvent()` function from `src/integrations/analytics.ts`:

```typescript
import { trackEvent } from "@/integrations/analytics";

// Basic event
await trackEvent("scan_completed", { welfare_category: "high" });

// With study fields (for enrolled participants)
await trackEvent(
  "ethical_lens_changed",
  { lens: "environmental" },
  {
    participant_id: "uuid",
    participant_code: "AB12-CD34",
    treatment_group: "control",
    study_version: "1.0"
  }
);
```

### Study Event Fields

For enrolled, active participants, the following fields should be passed to `trackEvent()`:

| Field | Source |
|-------|--------|
| `participant_id` | From `study_participants.id` |
| `participant_code` | From `study_participants.participant_code` |
| `treatment_group` | From `study_participants.treatment_group` |
| `study_version` | From `study_participants.study_version` |

Use the `useStudyParticipant()` hook to access these:

```typescript
import { useStudyParticipant } from "@/hooks/useStudyParticipant";

const { participant } = useStudyParticipant();

if (participant && participant.study_status === 'active') {
  trackEvent("some_event", { /* properties */ }, {
    participant_id: participant.id,
    participant_code: participant.participant_code,
    treatment_group: participant.treatment_group,
    study_version: participant.study_version,
  });
}
```

### Allowed Event Properties (Whitelist)

Only the following `event_properties` keys are included in exports:

| Key | Description |
|-----|-------------|
| `lens` | Selected ethical lens |
| `mode` | Input mode (camera, text, etc.) |
| `language` | UI language code |
| `items_count` | Number of items scanned |
| `welfare_category` | Welfare assessment category |
| `time_to_action_ms` | Time to user action in milliseconds |
| `has_alternatives` | Whether alternatives were shown |
| `alternatives_viewed` | Whether user viewed alternatives |
| `share_initiated` | Whether share was initiated |

Other properties are stored but not exported.

---

## Admin Operations

### Running Exports

**Via API (curl):**

```bash
# JSON export
curl -X POST \
  "https://bnzhymtlxqtwcwwoirdl.supabase.co/functions/v1/study-export" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"study_version": "1.0", "format": "json"}'

# CSV export with filters
curl -X POST \
  "https://bnzhymtlxqtwcwwoirdl.supabase.co/functions/v1/study-export" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "study_version": "1.0",
    "format": "csv",
    "date_from": "2025-01-01",
    "date_to": "2025-06-30",
    "treatment_group": "treatment_a"
  }' \
  -o export.csv
```

### Completing a Study

```bash
curl -X POST \
  "https://bnzhymtlxqtwcwwoirdl.supabase.co/functions/v1/study-complete" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"study_version": "1.0"}'
```

### Triggering Anonymization

**Important:** Anonymization only affects participants whose `completed_at` is more than 90 days ago.

```bash
curl -X POST \
  "https://bnzhymtlxqtwcwwoirdl.supabase.co/functions/v1/study-anonymize" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"study_version": "1.0"}'
```

---

## Audit Logging

All study operations are logged to `admin_audit_log` with the following actions:

| Action | When | Details |
|--------|------|---------|
| `participant_enrolled` | User enrolls | `participant_id`, `participant_code`, `treatment_group`, `study_version`, `contact_opt_in` |
| `participant_withdrawn` | User withdraws | `participant_id`, `participant_code`, `treatment_group`, `study_version`, `withdrawn_at` |
| `study_completed` | Admin completes study | `study_version`, `participants_marked_completed`, `completed_at` |
| `study_export` | Admin exports data | `study_version`, `format`, filters, `events_exported`, `participants_included` |
| `study_anonymized` | Admin runs anonymization | `study_version`, `participants_anonymized`, `participant_codes`, `events_anonymized` |

---

## Security Controls

This section documents the security measures implemented to protect the research system and user data.

### IP-Based Rate Limiting

All public edge functions are protected by in-memory IP-based rate limiting to prevent abuse:

| Function | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `analyze-image` | 20 req | 60 sec | Prevent AI API cost abuse |
| `generate-text` | 20 req | 60 sec | Prevent AI API cost abuse |
| `suggest-ethical-swap` | 20 req | 60 sec | Prevent AI API cost abuse |
| `enrich-description` | 20 req | 60 sec | Prevent AI API cost abuse |
| `log-event` | 120 req | 60 sec | Prevent analytics pollution |

**Implementation:** `supabase/functions/_shared/ip-rate-limiter.ts`

When rate limit is exceeded:
- HTTP 429 response with `Retry-After` header
- Server-side warning log with truncated IP

### Row-Level Security (RLS)

#### shared_results Table

Hardened RLS policies to prevent data enumeration:

| Policy | Command | Condition |
|--------|---------|-----------|
| `View shared results by token only` | SELECT | `expires_at IS NULL OR expires_at > now()` |
| `Users can create their own shares` | INSERT | `auth.uid() = user_id` |
| `Anonymous users can create temporary shares` | INSERT | `user_id IS NULL AND expires_at IS NOT NULL AND expires_at <= now() + '48 hours'` |
| `Allow public to update view count only` | UPDATE | Expiration check only |
| `Users can delete their own shares` | DELETE | `auth.uid() = user_id` |

**Note:** The `share-result` edge function uses `service_role` which bypasses RLS, ensuring proper validation at the application layer.

#### study_participants Table

| Policy | Command | Who |
|--------|---------|-----|
| `Users can view their own study enrollment` | SELECT | Own user_id |
| `Admins can view all study participants` | SELECT | Users with admin role |
| `Admins can update study participants` | UPDATE | Users with admin role |
| `Service role can manage study participants` | ALL | service_role only |

### Authentication Security

- **Leaked Password Protection**: Should be enabled in Supabase Auth settings (prevents use of known-breached passwords)
- **Auto-confirm email**: Enabled for development (disable in production)
- **Anonymous signups**: Disabled

### Study Data Anonymization

- Participant `user_id` is nullified 90 days after study completion
- Only `participant_code` remains for data analysis
- IP addresses are always hashed (SHA-256) before storage
- Event properties are filtered through a whitelist before export

---

## UI Components

| Component | Path | Description |
|-----------|------|-------------|
| `StudyParticipation` | `src/components/profile/StudyParticipation.tsx` | Consent form, enrollment, withdrawal UI |
| `useStudyParticipant` | `src/hooks/useStudyParticipant.ts` | Hook to fetch current user's study enrollment |

---

## Related Documentation

- [Analytics Overview](./analytics_overview.md) — General event tracking
- [Privacy & Data Flow](./privacy_data_flow.md) — Privacy protections
- [Admin Dashboard](./admin_dashboard.md) — Admin UI access

---

*Last updated: December 2025*
