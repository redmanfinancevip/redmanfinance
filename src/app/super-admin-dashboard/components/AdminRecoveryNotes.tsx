'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AdminNote {
  id: string;
  recovery_id: string;
  content: string;
  admin_name: string;
  created_at: string;
}

export default function AdminRecoveryNotes({ recoveryId }: { recoveryId: string }) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [recoveryId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/admin/recovery/${recoveryId}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const res = await fetch(`/api/admin/recovery/${recoveryId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newNote })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Note added');
        setNewNote('');
        fetchNotes();
      } else {
        toast.error(data.error || 'Failed to add note');
      }
    } catch (err) {
      toast.error('Error adding note');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MessageCircle size={18} /> Admin Notes (Internal)
      </h3>

      {/* Notes List */}
      <div className="space-y-2 max-h-64 overflow-y-auto p-3 rounded-lg bg-muted/20 border border-border">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-2 rounded bg-muted/50 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-blue-400">{note.admin_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-300 break-words">{note.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add internal note..."
          className="input-field flex-1 text-sm"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
