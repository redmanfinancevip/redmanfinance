'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, UserPlus, DollarSign, ShieldAlert, 
  CheckCircle2, Trash2, Eye, Terminal, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  title: string;
  message: string;
  category: 'user' | 'transaction' | 'kyc' | 'system';
  time: string;
  read: boolean;
};

export default function AdminNotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'user' | 'transaction' | 'kyc' | 'system'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Play crisp administrative chime audio on live incoming stream payload events
  const playAlertChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Simple premium double beep synth block
      const playBeep = (timeOffset: number, frequency: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + timeOffset);
        
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + timeOffset + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + timeOffset);
        osc.stop(audioCtx.currentTime + timeOffset + duration);
      };

      playBeep(0, 880, 0.1);    // Tone A
      playBeep(0.12, 1200, 0.15); // Tone B
    } catch (e) {
      console.warn('Audio Context interaction context not initialized or supported yet:', e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          category: n.category,
          read: n.read ?? false,
          time: new Date(n.created_at).toLocaleString()
        })));
      }
    } catch (err: any) {
      console.error('Error fetching data logs:', err);
      toast.error(err.message || 'Failed to pull system notification matrix');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Mount highly resilient real-time channel pipeline stream listener hooks
    const channel = supabase
      .channel('admin-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const raw = payload.new as any;
          const newNotif: Notification = {
            id: raw.id,
            title: raw.title,
            message: raw.message,
            category: raw.category || 'system',
            read: raw.read ?? false,
            time: new Date(raw.created_at).toLocaleString()
          };
          
          setNotifications((prev) => [newNotif, ...prev]);
          playAlertChime();
          toast.info(`Engine Event: ${newNotif.title}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, playAlertChime]);

  const toggleSingleRead = async (id: string, currentReadState: boolean) => {
    if (currentReadState) return; // Already optimization skip
    
    // Optimistic state update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      toast.error('Failed to update ledger read state tracking flags');
      fetchNotifications(); // Rollback to source truth on failure
    }
  };

  const purgeSingleNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Alert record dropped from system memory');
    } catch (err) {
      toast.error('Reversal exception: Failed to flush notification row');
      fetchNotifications();
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All pipeline notifications set to read');

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;
    } catch (err) {
      toast.error('Database connection timed out syncing bulk records status');
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    
    setNotifications([]);
    toast.warning('Flushing historical alert log cache rows...');

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .match({}); // Matches all remaining entries

      if (error) throw error;
      toast.success('Notification database completely wiped');
    } catch (err) {
      toast.error('Failed to broadcast global truncate purge');
      fetchNotifications();
    }
  };

  const CategoryIcon = ({ cat }: { cat: string }) => {
    switch (cat) {
      case 'user': return <UserPlus size={14} className="text-blue-400" />;
      case 'transaction': return <DollarSign size={14} className="text-green-500" />;
      case 'kyc': return <ShieldAlert size={14} className="text-yellow-500" />;
      case 'system': return <Terminal size={14} className="text-purple-400" />;
      default: return <Bell size={14} className="text-primary" />;
    }
  };

  const filtered = notifications.filter(n => filter === 'all' || n.category === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="animate-spin text-primary" size={36} />
        <span className="text-xs text-muted-foreground font-semibold tracking-wider uppercase">Syncing live event streaming engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Operational Notification Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {unreadCount === 0 ? 'All pipelines secure' : `${unreadCount} unread system flags require supervisor acknowledgement`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={markAllRead} 
            disabled={unreadCount === 0}
            className="flex-1 sm:flex-initial text-xs font-semibold px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-all disabled:opacity-40"
          >
            Acknowledge All
          </button>
          <button 
            onClick={clearAll} 
            disabled={notifications.length === 0}
            className="flex-1 sm:flex-initial text-xs font-semibold px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} /> Purge Ledger
          </button>
        </div>
      </div>

      {/* Fully Configured Filters Segment Map */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted/60 border border-border/40 w-fit">
        {(['all', 'user', 'transaction', 'kyc', 'system'] as const).map((f) => {
          const count = f === 'all' ? notifications.length : notifications.filter(n => n.category === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                filter === f 
                  ? 'bg-card text-foreground shadow-sm border border-border/50' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${filter === f ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Alert Feed Output Render Frame */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center mb-4">
              <Bell size={18} className="text-muted-foreground/60" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Zero Broadcast Flags Located</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
              Resilient listener hooks active. Any new financial mutations or user state alterations will reflect here immediately without viewport resets.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((n) => (
              <div 
                key={n.id} 
                onClick={() => toggleSingleRead(n.id, n.read)}
                className={`p-4 flex items-start gap-4 transition-all duration-150 relative group ${
                  !n.read ? 'bg-primary/[0.03] hover:bg-primary/[0.05]' : 'hover:bg-muted/20'
                } ${!n.read ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="w-8 h-8 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-sm">
                  <CategoryIcon cat={n.category} />
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className={`text-sm tracking-tight truncate ${!n.read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground/70">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-medium">{n.message}</p>
                </div>

                {/* Status indicator flags & contextual actions */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary ring-4 ring-primary/10" title="Unread Alert Item" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering card read click bubbles
                      purgeSingleNotification(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Remove item record from stream view"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}