import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Scan {
  id: string;
  product_name: string;
  welfare_category: string;
  created_at: string;
  analysis_result: any;
}

interface ScanHistoryProps {
  userId: string;
}

const ScanHistory = ({ userId }: ScanHistoryProps) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScans();
  }, [userId]);

  const loadScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error: any) {
      toast.error('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('scans').delete().eq('id', id);
      if (error) throw error;
      setScans(scans.filter((scan) => scan.id !== id));
      toast.success('Scan deleted');
    } catch (error: any) {
      toast.error('Failed to delete scan');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all scan history?')) return;

    try {
      const { error } = await supabase.from('scans').delete().eq('user_id', userId);
      if (error) throw error;
      setScans([]);
      toast.success('All scans deleted');
    } catch (error: any) {
      toast.error('Failed to clear history');
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scan History</CardTitle>
            <CardDescription>
              {scans.length} scan{scans.length !== 1 ? 's' : ''} total
            </CardDescription>
          </div>
          {scans.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No scans yet. Start scanning products to build your history!
          </p>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{scan.product_name || 'Unknown Product'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(scan.created_at), 'PPp')}
                  </p>
                  {scan.welfare_category && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-muted">
                      {scan.welfare_category}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(scan.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanHistory;
