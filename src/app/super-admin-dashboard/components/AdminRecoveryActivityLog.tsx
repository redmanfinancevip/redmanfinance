'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ActivityLog {
  id: string;
  recovery_id: string;
  action: string;
  status: string;
  notes: string | null;
  admin_note: string | null;
  created_at: string;
  created_by?: string;
}

export default function AdminRecoveryActivityLog({ recoveryId }: { recoveryId: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLog();
  }, [recoveryId]);

  const fetchActivityLog = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Session expired');
        return;
      }

      const res = await fetch(`/api/admin/recovery/${recoveryId}/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActivities(data.activities || []);
      } else {
        toast.error(data.error || 'Failed to fetch activity log');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error fetching activity log');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'denied':
        return <XCircle size={16} className="text-red-400" />;
      case 'submitted':
        return <FileText size={16} className="text-blue-400" />;
      default:
        return <Clock size={16} className="text-yellow-400" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      submitted: 'Recovery Submitted',
      kyc_review: 'KYC Review Started',
      under_review: 'Under Review',
      approved: 'Recovery Approved',
      denied: 'Recovery Denied',
      claimed: 'Funds Claimed',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock size={18} /> Recovery Activity Timeline
      </h3>
      
      {activities.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          No activity logged yet
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <div key={activity.id} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex flex-col items-center gap-2">
                {getStatusIcon(activity.action)}
                {idx < activities.length - 1 && (
                  <div className="w-0.5 h-8 bg-border" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm">{getActionLabel(activity.action)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()} {new Date(activity.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                {activity.admin_note && (
                  <div className="text-xs text-gray-300 mt-2 p-2 rounded bg-muted/50 whitespace-pre-wrap">
                    {activity.admin_note}
                  </div>
                )}
                
                {activity.notes && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Note: {activity.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
