/**
 * Admin Analytics Endpoint
 * 
 * Provides aggregated analytics data for admin users:
 * - Summary stats (scans, users, daily limits)
 * - Time series (scans per day)
 * - Lens usage breakdown
 * - Daily limit hits
 * 
 * PROTECTED: Requires JWT authentication + admin role
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger, getRequestId, getClientIp, jsonErrorResponse, jsonSuccessResponse } from "../_shared/logger.ts";

const logger = createLogger({ functionName: 'admin-analytics' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  const requestId = getRequestId(req);
  const ip = getClientIp(req);
  const reqLogger = logger.withRequest({ requestId, ip });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    reqLogger.info('Request started');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      reqLogger.warn('No authorization header');
      return jsonErrorResponse(401, 'Unauthorized - No authorization header');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      reqLogger.error('Configuration error: Missing Supabase configuration');
      return jsonErrorResponse(500, 'Service configuration error');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT and get user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      reqLogger.warn('User verification failed', { error: userError?.message });
      return jsonErrorResponse(401, 'Unauthorized - Invalid token');
    }

    reqLogger.info('User authenticated', { userId: userData.user.id });

    // Check if user has admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });

    if (roleError) {
      reqLogger.error('Role check failed', { error: roleError.message });
      return jsonErrorResponse(500, 'Authorization check failed');
    }

    if (!isAdmin) {
      reqLogger.warn('Non-admin user attempted analytics access', { userId: userData.user.id });
      return jsonErrorResponse(403, 'FORBIDDEN');
    }

    reqLogger.info('Admin access granted, fetching analytics');

    // Calculate date boundaries
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for efficiency
    const [
      totalEventsResult,
      totalScansResult,
      uniqueUsersResult,
      anonVsLoggedResult,
      dailyLimitHitsResult,
      scansPerDayResult,
      lensUsageResult,
      dailyLimitsByDayResult,
      eventTypesResult
    ] = await Promise.all([
      // Total events last 7 days
      supabase
        .from('user_events')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', sevenDaysAgo.toISOString()),

      // Total scans last 7 days
      supabase
        .from('user_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'scan_completed')
        .gte('timestamp', sevenDaysAgo.toISOString()),

      // Unique users last 7 days (non-null user_ids)
      supabase
        .from('user_events')
        .select('user_id')
        .not('user_id', 'is', null)
        .gte('timestamp', sevenDaysAgo.toISOString()),

      // Anonymous vs logged-in events last 7 days
      supabase
        .from('user_events')
        .select('user_id')
        .gte('timestamp', sevenDaysAgo.toISOString()),

      // Daily limit hits last 7 days
      supabase
        .from('user_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'daily_limit_block')
        .gte('timestamp', sevenDaysAgo.toISOString()),

      // Scans per day for last 30 days
      supabase
        .from('user_events')
        .select('timestamp')
        .eq('event_type', 'scan_completed')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: true }),

      // Lens usage from swap requests last 30 days
      supabase
        .from('user_events')
        .select('event_properties')
        .in('event_type', ['ethical_lens_changed', 'swap_suggestion_requested'])
        .gte('timestamp', thirtyDaysAgo.toISOString()),

      // Daily limit blocks per day last 30 days
      supabase
        .from('user_events')
        .select('timestamp')
        .eq('event_type', 'daily_limit_block')
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: true }),

      // Event types breakdown last 7 days
      supabase
        .from('user_events')
        .select('event_type')
        .gte('timestamp', sevenDaysAgo.toISOString())
    ]);

    // Process unique users
    const uniqueUserIds = new Set<string>();
    if (uniqueUsersResult.data) {
      uniqueUsersResult.data.forEach((row: { user_id: string | null }) => {
        if (row.user_id) uniqueUserIds.add(row.user_id);
      });
    }

    // Process anonymous vs logged-in
    let anonymousCount = 0;
    let loggedInCount = 0;
    if (anonVsLoggedResult.data) {
      anonVsLoggedResult.data.forEach((row: { user_id: string | null }) => {
        if (row.user_id) {
          loggedInCount++;
        } else {
          anonymousCount++;
        }
      });
    }

    // Aggregate scans per day
    const scansPerDayMap = new Map<string, number>();
    if (scansPerDayResult.data) {
      scansPerDayResult.data.forEach((row: { timestamp: string }) => {
        const date = row.timestamp.split('T')[0];
        scansPerDayMap.set(date, (scansPerDayMap.get(date) || 0) + 1);
      });
    }
    const scansPerDay = Array.from(scansPerDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate lens usage
    const lensCountMap = new Map<number, number>();
    if (lensUsageResult.data) {
      lensUsageResult.data.forEach((row: { event_properties: Record<string, unknown> | null }) => {
        const lens = row.event_properties?.lens;
        if (typeof lens === 'number' && lens >= 1 && lens <= 4) {
          lensCountMap.set(lens, (lensCountMap.get(lens) || 0) + 1);
        }
      });
    }
    const lensUsage = [1, 2, 3, 4].map(lens => ({
      lens,
      count: lensCountMap.get(lens) || 0
    }));

    // Aggregate daily limit hits per day
    const dailyLimitsMap = new Map<string, number>();
    if (dailyLimitsByDayResult.data) {
      dailyLimitsByDayResult.data.forEach((row: { timestamp: string }) => {
        const date = row.timestamp.split('T')[0];
        dailyLimitsMap.set(date, (dailyLimitsMap.get(date) || 0) + 1);
      });
    }
    const dailyLimitHits = Array.from(dailyLimitsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate event types
    const eventTypeMap = new Map<string, number>();
    if (eventTypesResult.data) {
      eventTypesResult.data.forEach((row: { event_type: string }) => {
        eventTypeMap.set(row.event_type, (eventTypeMap.get(row.event_type) || 0) + 1);
      });
    }
    const eventTypeCounts = Array.from(eventTypeMap.entries())
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count);

    const response = {
      summary: {
        total_events_last_7_days: totalEventsResult.count || 0,
        total_scans_last_7_days: totalScansResult.count || 0,
        unique_users_last_7_days: uniqueUserIds.size,
        anon_vs_logged_in: {
          anonymous: anonymousCount,
          logged_in: loggedInCount
        },
        daily_limit_hits_last_7_days: dailyLimitHitsResult.count || 0
      },
      scans_per_day: scansPerDay,
      lens_usage: lensUsage,
      daily_limit_hits: dailyLimitHits,
      event_type_counts: eventTypeCounts
    };

    reqLogger.info('Analytics fetched successfully', { 
      totalEvents: response.summary.total_events_last_7_days,
      totalScans: response.summary.total_scans_last_7_days
    });

    return jsonSuccessResponse(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    reqLogger.error('Request failed', { error: errorMessage });
    return jsonErrorResponse(500, 'Analytics fetch failed');
  }
});
