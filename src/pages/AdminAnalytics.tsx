import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ShieldAlert, BarChart3, Users, Scan, AlertTriangle } from 'lucide-react';

interface AnalyticsData {
  summary: {
    total_events_last_7_days: number;
    total_scans_last_7_days: number;
    unique_users_last_7_days: number;
    anon_vs_logged_in: {
      anonymous: number;
      logged_in: number;
    };
    daily_limit_hits_last_7_days: number;
  };
  scans_per_day: Array<{ date: string; count: number }>;
  lens_usage: Array<{ lens: number; count: number }>;
  daily_limit_hits: Array<{ date: string; count: number }>;
  event_type_counts: Array<{ event_type: string; count: number }>;
}

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin role
  useEffect(() => {
    async function checkAdminRole() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });
        
        if (error) {
          console.error('Failed to check admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } catch (err) {
        console.error('Admin role check error:', err);
        setIsAdmin(false);
      }
    }

    if (!authLoading && user) {
      checkAdminRole();
    } else if (!authLoading && !user) {
      setIsAdmin(false);
    }
  }, [user, authLoading]);

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      if (!isAdmin) return;

      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('admin-analytics');

        if (error) {
          console.error('Analytics fetch error:', error);
          setError('Failed to load analytics data');
          return;
        }

        if (data?.success && data?.data) {
          setAnalytics(data.data);
        } else if (data?.error === 'FORBIDDEN') {
          setIsAdmin(false);
        } else {
          setError('Invalid analytics response');
        }
      } catch (err) {
        console.error('Analytics error:', err);
        setError('Analytics temporarily unavailable');
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin === true) {
      fetchAnalytics();
    } else if (isAdmin === false) {
      setLoading(false);
    }
  }, [isAdmin]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Loading state
  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // Access denied
  if (!user || isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is restricted to administrators only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading analytics
  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Loading analytics…</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lensLabels: Record<number, string> = {
    1: 'Higher-Welfare Omnivore',
    2: 'Lower Consumption',
    3: 'No Slaughter',
    4: 'No Animal Use'
  };

  const lensDataWithLabels = analytics.lens_usage.map(item => ({
    ...item,
    name: lensLabels[item.lens] || `Lens ${item.lens}`
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Usage statistics for the Food Welfare Explorer app.
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Scan className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.total_scans_last_7_days}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.unique_users_last_7_days}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anonymous vs Logged-in</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.summary.anon_vs_logged_in.anonymous} / {analytics.summary.anon_vs_logged_in.logged_in}
              </div>
              <p className="text-xs text-muted-foreground">Anon / Auth (7 days)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Limit Hits</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.daily_limit_hits_last_7_days}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scans per Day */}
          <Card>
            <CardHeader>
              <CardTitle>Scans per Day (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.scans_per_day}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(date) => date.slice(5)} // Show MM-DD
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lens Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Lens Usage (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lensDataWithLabels}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Event Types Table */}
        <Card>
          <CardHeader>
            <CardTitle>Event Type Breakdown (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground">Event Type</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.event_type_counts.map((item) => (
                    <tr key={item.event_type} className="border-b border-border/50">
                      <td className="py-2 px-4 font-mono text-foreground">{item.event_type}</td>
                      <td className="text-right py-2 px-4 text-foreground">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
