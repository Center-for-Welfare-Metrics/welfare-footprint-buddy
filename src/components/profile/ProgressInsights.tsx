import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressInsightsProps {
  userId: string;
}

interface CategoryStats {
  high: number;
  moderate: number;
  low: number;
  total: number;
}

const ProgressInsights = ({ userId }: ProgressInsightsProps) => {
  const [stats, setStats] = useState<CategoryStats>({
    high: 0,
    moderate: 0,
    low: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('welfare_category')
        .eq('user_id', userId);

      if (error) throw error;

      const categoryCount = {
        high: 0,
        moderate: 0,
        low: 0,
        total: data?.length || 0,
      };

      data?.forEach((scan) => {
        const category = scan.welfare_category?.toLowerCase() || '';
        if (category.includes('high')) categoryCount.high++;
        else if (category.includes('moderate') || category.includes('medium')) categoryCount.moderate++;
        else if (category.includes('low')) categoryCount.low++;
      });

      setStats(categoryCount);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Your Progress & Insights</CardTitle>
        <CardDescription className="text-muted-foreground">
          Summary of your scanned products and welfare awareness
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.total === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Start scanning products to see your progress!
          </p>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">{stats.total}</p>
              <p className="text-muted-foreground">Products Scanned</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border border-border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-500">{stats.high}</p>
                <p className="text-sm text-muted-foreground">High Welfare</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-yellow-500">{stats.moderate}</p>
                <p className="text-sm text-muted-foreground">Moderate</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-red-500">{stats.low}</p>
                <p className="text-sm text-muted-foreground">Low Welfare</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {stats.high > stats.low
                  ? "🎉 Great job! You're choosing more high-welfare products."
                  : stats.high === stats.low
                  ? "Keep exploring! Every scan helps you make more informed choices."
                  : "💡 Consider exploring more high-welfare alternatives for the products you use."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProgressInsights;
