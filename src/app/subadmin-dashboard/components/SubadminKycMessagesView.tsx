'use client';

import React, { useState } from 'react';
import {
  FileCheck, MessageSquare, CheckCircle2, XCircle, Clock,
  Eye, Send, AlertTriangle, User,
} from 'lucide-react';
import { toast } from 'sonner';

// Backend: SELECT * FROM kyc_submissions WHERE user_id IN (SELECT id FROM users WHERE assigned_to = auth.uid())
const kycSubmissions = [
  { id: 'kyc-001', user: 'Lena Hoffmann', email: 'lena.h@gmail.de', grade: 'II', submittedAt: 'Jun 12, 2026 14:30', status: 'pending', docType: 'Passport', note: '' },
  { id: 'kyc-002', user: 'Kwame Asante', email: 'k.asante@gmail.com', grade: 'I', submittedAt: 'Jun 11, 2026 09:15', status: 'pending', docType: 'National ID', note: '' },
  { id: 'kyc-003', user: 'Amara Kessler', email: 'amara.k@email.com', grade: 'III', submittedAt: 'Mar 10, 2026 11:00', status: 'approved', docType: 'Passport', note: 'All documents verified' },
  { id: 'kyc-004', user: 'Yuki Tanaka', email: 'ytanaka@outlook.jp', grade: 'II', submittedAt: 'Feb 25, 2026 08:45', status: 'approved', docType: 'Driver License', note: '' },
  { id: 'kyc-005', user: 'Marcus Webb', email: 'm.webb@proton.me', grade: 'III', submittedAt: 'Jan 28, 2026 16:20', status: 'rejected', docType: 'Passport', note: 'Document expired — resubmit required' },
];

// Backend: SELECT * FROM messages WHERE (sender_id IN assigned_users OR receiver_id IN assigned_users) ORDER BY created_at DESC
const messages = [
  { id: 'msg-001', user: 'Amara Kessler', userId: 'usr-001', content: 'Hi, I made a deposit 2 hours ago but it hasn\'t been confirmed yet. Can you check?', time: '2h ago', unread: true, type: 'incoming' },
  { id: 'msg-002', user: 'Raj Patel', userId: 'usr-007', content: 'My withdrawal request has been pending for 3 days. Please update me.', time: '5h ago', unread: true, type: 'incoming' },
  { id: 'msg-003', user: 'Yuki Tanaka', userId: 'usr-005', content: 'Thank you for approving my transaction!', time: '1d ago', unread: false, type: 'incoming' },
  { id: 'msg-004', user: 'Kwame Asante', userId: 'usr-009', content: 'I need help completing my KYC verification. What documents do I need?', time: '1d ago', unread: false, type: 'incoming' },
  { id: 'msg-005', user: 'Lena Hoffmann', userId: 'usr-011', content: 'When will my account grade upgrade be processed?', time: '2d ago', unread: false, type: 'incoming' },
];

type TabType = 'kyc' | 'messages';

export default function SubadminKycMessagesView() {
  const [activeTab, setActiveTab] = useState<TabType>('kyc');
  const [kycStatuses, setKycStatuses] = useState<Record<string, string>>({});
  const [kycNotes, setKycNotes] = useState<Record<string, string>>({});
  const [processingKyc, setProcessingKyc] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const getKycStatus = (sub: typeof kycSubmissions[0]) => kycStatuses[sub.id] ?? sub.status;

  const handleKycAction = (id: string, action: 'approve' | 'reject', user: string) => {
    setProcessingKyc(id);
    // Backend: UPDATE kyc_submissions SET status=action, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=id
    setTimeout(() => {
      setKycStatuses((prev) => ({ ...prev, [id]: action === 'approve' ? 'approved' : 'rejected' }));
      setProcessingKyc(null);
      if (action === 'approve') {
        toast.success(`KYC approved for ${user}`);
      } else {
        toast.error(`KYC rejected for ${user} — user notified`);
      }
    }, 1000);
  };

  const handleSendReply = (msgId: string, user: string) => {
    if (!replyText.trim()) return;
    // Backend: INSERT INTO messages (sender_id, receiver_id, content, created_at)
    toast.success(`Reply sent to ${user}`);
    setReplyText('');
    setSelectedMessage(null);
  };

  const pendingKyc = kycSubmissions.filter((k) => (kycStatuses[k.id] ?? k.status) === 'pending').length;
  const unreadMessages = messages.filter((m) => m.unread).length;

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">KYC & Messages</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pendingKyc} KYC pending · {unreadMessages} unread messages · Scoped to your assigned users
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {([
          { id: 'kyc' as TabType, label: 'KYC Reviews', icon: FileCheck, count: pendingKyc },
          { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare, count: unreadMessages },
        ] as const).map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">KYC Submissions</h3>
              <span className="text-xs text-muted-foreground">{kycSubmissions.length} total</span>
            </div>
            <div className="divide-y divide-border">
              {kycSubmissions.map((sub) => {
                const currentStatus = getKycStatus(sub);
                return (
                  <div key={sub.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                          style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                        >
                          {sub.user.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{sub.user}</span>
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                            >
                              {sub.grade}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                              currentStatus === 'approved' ? 'status-active'
                                : currentStatus === 'pending' ? 'status-pending' : 'status-rejected'
                            }`}>
                              {currentStatus === 'pending' && <Clock size={10} />}
                              {currentStatus === 'approved' && <CheckCircle2 size={10} />}
                              {currentStatus === 'rejected' && <XCircle size={10} />}
                              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{sub.email}</div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">Doc: <span className="text-foreground">{sub.docType}</span></span>
                            <span className="text-xs text-muted-foreground">Submitted: <span className="text-foreground">{sub.submittedAt}</span></span>
                          </div>
                          {sub.note && (
                            <div className="mt-2 text-xs px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                              {sub.note}
                            </div>
                          )}
                          {/* Rejection note input */}
                          {currentStatus === 'pending' && (
                            <div className="mt-2">
                              <input
                                type="text"
                                value={kycNotes[sub.id] ?? ''}
                                onChange={(e) => setKycNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                                placeholder="Add rejection reason (optional)..."
                                className="input-field w-full px-3 py-1.5 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button className="btn-ghost p-1.5" aria-label="View documents">
                          <Eye size={14} />
                        </button>
                        {currentStatus === 'pending' && (
                          <>
                            {processingKyc === sub.id ? (
                              <span className="text-xs text-muted-foreground">Processing...</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleKycAction(sub.id, 'approve', sub.user)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
                                  aria-label="Approve KYC"
                                >
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button
                                  onClick={() => handleKycAction(sub.id, 'reject', sub.user)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
                                  aria-label="Reject KYC"
                                >
                                  <XCircle size={11} /> Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Unread notice */}
          {unreadMessages > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: 'rgba(232,80,10,0.08)', border: '1px solid rgba(232,80,10,0.2)' }}
            >
              <AlertTriangle size={14} className="text-primary" />
              <span className="text-sm text-primary font-medium">{unreadMessages} unread messages from your users</span>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">User Messages</h3>
            </div>
            <div className="divide-y divide-border">
              {messages.map((msg) => (
                <div key={msg.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                    >
                      {msg.user.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{msg.user}</span>
                          {msg.unread && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: 'var(--primary)' }}
                            />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{msg.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{msg.content}</p>

                      {/* Reply section */}
                      {selectedMessage === msg.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${msg.user}...`}
                            rows={3}
                            className="input-field w-full px-3 py-2 text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendReply(msg.id, msg.user)}
                              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                            >
                              <Send size={11} /> Send Reply
                            </button>
                            <button
                              onClick={() => { setSelectedMessage(null); setReplyText(''); }}
                              className="btn-secondary px-3 py-1.5 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedMessage(msg.id)}
                          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent transition-colors"
                        >
                          <MessageSquare size={11} /> Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
