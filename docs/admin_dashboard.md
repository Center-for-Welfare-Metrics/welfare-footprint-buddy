# Admin Analytics Dashboard

This document explains how to access and use the admin analytics dashboard for monitoring app usage.

## Table of Contents

- [What is the Admin Dashboard?](#what-is-the-admin-dashboard)
- [How to Access It](#how-to-access-it)
- [How to Promote a User to Admin](#how-to-promote-a-user-to-admin)
- [What the Dashboard Shows](#what-the-dashboard-shows)
- [Security Model](#security-model)

---

## What is the Admin Dashboard?

The Admin Analytics Dashboard provides a visual overview of how users interact with the Food Welfare Explorer app. It displays:

- Usage statistics (scans, users, limits)
- Time series data (trends over time)
- Feature adoption metrics (ethical lens usage)
- Error and limit tracking

**Purpose:** Help administrators understand app usage patterns, identify issues, and make data-driven decisions about the product.

**Location:** `/admin/analytics`

---

## How to Access It

### Requirements

1. **Must be logged in** – Anonymous users cannot access the dashboard
2. **Must have admin role** – User must have the `admin` role in the `user_roles` table

### Access Flow

1. Navigate to `/admin/analytics` in your browser
2. If not logged in → Redirected to `/auth` (login page)
3. If logged in but not admin → Shows "Access denied – admin only" message
4. If admin → Dashboard loads and displays analytics data

---

## How to Promote a User to Admin

### Step 1: Find the User's UUID

Using the backend dashboard (Auth → Users):

1. Open the backend management interface
2. Navigate to Authentication → Users
3. Find the user by email
4. Copy their `id` (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 2: Insert Admin Role

Run this SQL command in the SQL editor:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<USER_UUID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Example:**
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 3: Verify Access

1. Have the user log in to the app
2. Navigate to `/admin/analytics`
3. Confirm they can see the dashboard

### Removing Admin Access

```sql
DELETE FROM user_roles
WHERE user_id = '<USER_UUID>'
  AND role = 'admin';
```

---

## What the Dashboard Shows

### Summary Cards

Four cards at the top showing key metrics from the last 7 days:

| Card | Description |
|------|-------------|
| **Total Scans** | Number of `scan_completed` events |
| **Unique Users** | Count of distinct `user_id` values (authenticated users only) |
| **Anon vs Logged-in** | Ratio of anonymous to authenticated users |
| **Daily Limit Hits** | Number of `daily_limit_block` events |

### Scans Per Day (Line Chart)

- **Time range:** Last 30 days
- **Data:** Count of `scan_completed` events per day
- **Purpose:** Identify usage trends, peak days, and growth patterns

### Lens Usage (Bar Chart)

- **Time range:** Last 30 days
- **Data:** Count of `ethical_lens_changed` and `swap_suggestion_requested` events, grouped by lens value
- **Lens labels:**
  - 1 = Higher-Welfare Omnivore
  - 2 = Lower Consumption
  - 3 = No Slaughter
  - 4 = No Animal Use
- **Purpose:** Understand which ethical perspectives users prefer

### Daily Limit Hits (included in summary)

- **Time range:** Last 7 days
- **Data:** Count of `daily_limit_block` events
- **Purpose:** Monitor how often users hit rate limits, indicating potential need for quota adjustments

### Event Type Breakdown (Table)

- **Time range:** Last 7 days
- **Data:** Count of each event type
- **Purpose:** Overview of all tracked user actions

---

## Security Model

### Authentication

The `admin-analytics` edge function requires authentication:

```toml
# supabase/config.toml
[functions.admin-analytics]
verify_jwt = true
```

### Authorization Flow

1. **JWT Validation:** Function validates the JWT token using `supabase.auth.getUser()`
2. **Role Check:** Queries `user_roles` table via RPC:
   ```sql
   SELECT has_role(auth.uid(), 'admin');
   ```
3. **Access Decision:**
   - If `has_role` returns `true` → Allow access
   - If `has_role` returns `false` → Return 403 Forbidden

### What Anonymous Users See

- Anonymous users cannot access `/admin/analytics`
- They are redirected to the login page
- Even if they somehow call the edge function, it returns 401 Unauthorized

### Data Protection

- **No raw events returned** – Only aggregated counts and summaries
- **No IP addresses exposed** – Hashes are never included in response
- **No PII included** – User IDs are only counted, not listed
- **Service role access** – Queries use service role key, not user's token

### Role Storage Security

Admin roles are stored in a dedicated `user_roles` table:

```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,  -- enum: 'admin', 'moderator', 'user'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);
```

**Why a separate table?**
- Prevents privilege escalation attacks
- Roles cannot be self-assigned by users
- Follows security best practices for role-based access control

---

## Troubleshooting

### "Access denied – admin only"

**Cause:** User is logged in but doesn't have the `admin` role.

**Solution:** Have an existing admin add them to `user_roles`:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<USER_UUID>', 'admin');
```

### Dashboard shows "Loading analytics…" forever

**Possible causes:**
1. Edge function not deployed
2. Network error
3. Database connection issue

**Debug steps:**
1. Check browser console for errors
2. Check edge function logs in the backend
3. Verify `admin-analytics` is listed in `supabase/config.toml`

### No data appearing in charts

**Cause:** No events have been tracked yet.

**Solution:** Use the app (perform scans, change lenses) to generate event data, then refresh the dashboard.

---

## Related Documentation

- [Analytics Overview](./analytics_overview.md) – Event tracking system details
- [Quota and Rate Limits](./quota_and_rate_limits.md) – Usage limits and enforcement
