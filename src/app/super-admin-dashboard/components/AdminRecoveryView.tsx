'use client';

import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle2, XCircle, FileText, AlertTriangle, Loader2, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Recovery {
  id: string;
  user_id: string;
  status: string;
  discovered_balance: number;
  recovered_amount: number | null;
  asset_type: string;
  recovery_type: string;
  created_at: string;
  kyc_full_name: string;
  kyc_tax_country: string;
  kyc_residential_address: string;
  kyc_files: any;
  admin_note: string | null;
  user?: { name: string; email: string };
}

export default function AdminRecoveryView() {
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRecovery, setSelectedRecovery] = useState<Recovery | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewerType, setReviewerType] = useState<'forensic' | 'organisation' | null>(null);
  const [recoveredAmount, setRecoveredAmount] = useState('');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny' | null>(null);

  const fetchRecoveries = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Session expired');
        return;
      }

      const res = await fetch('/api/admin/recovery', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveries(data.recoveries || []);
      } else {
        const msg = typeof data?.error === 'object'
          ? (data.error?.message || data.error?.hint || 'Failed to fetch recoveries')
          : (data?.error || 'Failed to fetch recoveries');
        toast.error(msg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Error fetching recoveries';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveries();
  }, []);

  const handleOpenReview = (recovery: Recovery) => {
    setSelectedRecovery(recovery);
    setRecoveredAmount('');
    setSubject('');
    setMessageBody('');
    setReviewerType(null);
    setReviewAction(null);
    setReviewModal(true);
  };

  const handleOpenAction = (recovery: Recovery, action: 'accept' | 'reject') => {
    setSelectedRecovery(recovery);
    setActionType(action);
    setActionTitle('');
    setActionMessage('');
    setActionAmount('');
    setActionModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRecovery || !actionType) return;
    if (!actionTitle.trim()) {
      toast.error('Please provide a title');
      return;
    }
    if (!actionMessage.trim()) {
      toast.error('Please provide a message');
      return;
    }
    if (actionType === 'accept' && (!actionAmount || parseFloat(actionAmount) <= 0)) {
      toast.error('Please enter a valid recovered amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const updatePayload: any = {
        status: actionType === 'accept' ? 'approved' : 'denied',
        admin_note: `${actionTitle}\n\n${actionMessage}`
      };
      if (actionType === 'accept') {
        updatePayload.recovered_amount = parseFloat(actionAmount);
      }

      const res = await fetch(`/api/admin/recovery/${selectedRecovery.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          actionType === 'accept'
            ? `Recovery accepted - User notified to claim funds`
            : `Recovery rejected - User has been notified`
        );
        setActionModal(false);
        setSelectedRecovery(null);
        fetchRecoveries();
      } else {
        const msg = typeof data?.error === 'object'
          ? (data.error?.message || data.error?.hint || 'Failed to process recovery')
          : (data?.error || 'Failed to process recovery');
        toast.error(msg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An error occurred';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedRecovery) return;
    if (!reviewerType) {
      toast.error('Please select reviewer type (Forensic or Organisation)');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please provide a subject');
      return;
    }
    if (!messageBody.trim()) {
      toast.error('Please provide a message body');
      return;
    }
    if (reviewAction === 'approve' && (!recoveredAmount || parseFloat(recoveredAmount) <= 0)) {
      toast.error('Please enter a valid recovered amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const updatePayload: any = {
        status: reviewAction === 'approve' ? 'approved' : 'denied',
        admin_note: `[${reviewerType.toUpperCase()}] ${subject}\n\n${messageBody}`
      };
      if (reviewAction === 'approve') {
        updatePayload.recovered_amount = parseFloat(recoveredAmount);
      }

      const res = await fetch(`/api/admin/recovery/${selectedRecovery.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(reviewAction === 'approve' ? 'Recovery approved & user notified' : 'Recovery denied & user notified');
        setReviewModal(false);
        setSelectedRecovery(null);
        fetchRecoveries();
      } else {
        const msg = typeof data?.error === 'object'
          ? (data.error?.message || data.error?.hint || 'Failed to process recovery')
          : (data?.error || 'Failed to process recovery');
        toast.error(msg);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An error occurred';
      toast.error(errMsg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = recoveries.filter((r) => {
    const matchesSearch = !search || r.user?.name?.toLowerCase().includes(search.toLowerCase()) || r.user?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Asset Recovery Requests</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{recoveries.length} total · {recoveries.filter(r => r.status === 'kyc_review').length} pending review</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="input-field pl-9 pr-4 py-2 text-sm w-full"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="kyc_pending">KYC Pending</option>
            <option value="kyc_review">KYC Review</option>
            <option value="settlement_countdown">Accepted</option>
            <option value="audit_block">Denied</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Recovery Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Recovered Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No recovery requests found
                  </td>
                </tr>
              ) : (
                filtered.map((recovery) => (
                  <tr key={recovery.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{recovery.user?.name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{recovery.user?.email || recovery.user_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{recovery.asset_type || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground text-xs">{recovery.recovery_type?.replace(/_/g, ' ') || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">${recovery.recovered_amount?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        recovery.status === 'settlement_countdown' ? 'bg-green-900/30 text-green-200' :
                        recovery.status === 'audit_block' ? 'bg-red-900/30 text-red-200' :
                        recovery.status === 'kyc_review' ? 'bg-yellow-900/30 text-yellow-200' :
                        recovery.status === 'completed' ? 'bg-teal-900/30 text-teal-200' :
                        'bg-blue-900/30 text-blue-200'
                      }`}>
                        {recovery.status === 'settlement_countdown'
                          ? 'Accepted'
                          : recovery.status === 'audit_block'
                          ? 'Denied'
                          : recovery.status === 'completed'
                          ? 'Completed'
                          : recovery.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(recovery.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenAction(recovery, 'accept')}
                          disabled={['settlement_countdown', 'audit_block', 'completed'].includes(recovery.status)}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-green-900/30 text-green-200 hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle2 size={12} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleOpenAction(recovery, 'reject')}
                          disabled={['settlement_countdown', 'audit_block', 'completed'].includes(recovery.status)}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-red-900/30 text-red-200 hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle size={12} />
                          Reject
                        </button>
                        <button
                          onClick={() => handleOpenReview(recovery)}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Eye size={12} />
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Review Modal */}
      {reviewModal && selectedRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/50 absolute inset-0" onClick={() => setReviewModal(false)} />
          <div className="bg-card rounded-lg p-6 z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail size={18} /> Asset Recovery Review
            </h3>

            {/* User & Recovery Info */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">User Name</p>
                <p className="font-medium">{selectedRecovery.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{selectedRecovery.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asset Type</p>
                <p className="font-medium">{selectedRecovery.asset_type || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recovery Reason</p>
                <p className="font-medium text-sm">{selectedRecovery.recovery_type?.replace(/_/g, ' ') || 'N/A'}</p>
              </div>
            </div>

            {/* KYC Info */}
            <div className="mb-4 p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText size={14} /> KYC Details
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Full Name:</span> {selectedRecovery.kyc_full_name || 'Not provided'}
                </div>
                <div>
                  <span className="text-muted-foreground">Tax Country:</span> {selectedRecovery.kyc_tax_country || 'Not provided'}
                </div>
                <div>
                  <span className="text-muted-foreground">Residential Address:</span> {selectedRecovery.kyc_residential_address || 'Not provided'}
                </div>
              </div>
            </div>

            {/* KYC Files */}
            {selectedRecovery.kyc_files && Object.keys(selectedRecovery.kyc_files).length > 0 && (
              <div className="mb-4 p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-semibold mb-2">KYC Files Uploaded</p>
                <div className="space-y-1 text-xs">
                  {Object.entries(selectedRecovery.kyc_files).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2 text-muted-foreground">
                      <Download size={12} />
                      {key}: {value?.toString() || 'uploaded'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Form */}
            {selectedRecovery.status === 'kyc_review' && (
              <div className="space-y-4 mb-4 bg-muted/30 p-4 rounded-lg border border-border">
                {/* Reviewer Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reviewed By</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReviewerType('forensic')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reviewerType === 'forensic'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-900/30 text-blue-200 hover:bg-blue-900/50'
                      }`}
                    >
                      Forensic Team
                    </button>
                    <button
                      onClick={() => setReviewerType('organisation')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reviewerType === 'organisation'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-900/30 text-purple-200 hover:bg-purple-900/50'
                      }`}
                    >
                      Organisation
                    </button>
                  </div>
                </div>

                {/* Approve/Deny Choice */}
                <div>
                  <label className="block text-sm font-medium mb-2">Decision</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setReviewAction('approve');
                        setRecoveredAmount('');
                        setSubject('');
                        setMessageBody('');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                        reviewAction === 'approve'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/30 text-green-200 hover:bg-green-900/50'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setReviewAction('deny');
                        setRecoveredAmount('');
                        setSubject('');
                        setMessageBody('');
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                        reviewAction === 'deny'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-900/30 text-red-200 hover:bg-red-900/50'
                      }`}
                    >
                      <XCircle size={14} />
                      Deny
                    </button>
                  </div>
                </div>

                {/* Recovered Amount (Approve only) */}
                {reviewAction === 'approve' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Recovered Amount *</label>
                    <input
                      type="number"
                      value={recoveredAmount}
                      onChange={(e) => setRecoveredAmount(e.target.value)}
                      className="input-field w-full"
                      placeholder="Enter amount to approve"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">This is what will be deposited to user's account</p>
                  </div>
                )}

                {/* Subject */}
                {reviewAction && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Subject *</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="input-field w-full"
                        placeholder={reviewAction === 'approve' ? 'e.g. Your Asset Recovery Approved' : 'e.g. Your Asset Recovery Request'}
                      />
                    </div>

                    {/* Message Body */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Message Body *</label>
                      <textarea
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        className="input-field w-full h-24 resize-none"
                        placeholder={reviewAction === 'approve' ? 'Explain the recovery details, funds transfer timeline, and next steps...' : 'Explain why the recovery was denied...'}
                      />
                    </div>

                    {/* Submit/Cancel */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmitReview}
                        disabled={isSubmitting}
                        className="flex-1 btn-primary px-3 py-2 rounded-lg font-medium"
                      >
                        {isSubmitting ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve & Notify' : 'Deny & Notify'}`}
                      </button>
                      <button
                        onClick={() => {
                          setReviewAction(null);
                          setRecoveredAmount('');
                          setSubject('');
                          setMessageBody('');
                        }}
                        className="flex-1 btn-secondary px-3 py-2 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedRecovery.status === 'settlement_countdown' && (
              <div className="mb-4 p-4 rounded-lg bg-green-900/20 border border-green-700/50">
                <p className="text-sm text-green-200">
                  <strong>✓ Accepted</strong> — Recovered Amount: ${selectedRecovery.recovered_amount?.toLocaleString()}
                </p>
                {selectedRecovery.admin_note && (
                  <p className="text-sm text-green-200 mt-2 whitespace-pre-wrap"><strong>Review Note:</strong>\n{selectedRecovery.admin_note}</p>
                )}
              </div>
            )}

            {selectedRecovery.status === 'audit_block' && (
              <div className="mb-4 p-4 rounded-lg bg-red-900/20 border border-red-700/50">
                <p className="text-sm text-red-200">
                  <strong>✗ Denied</strong>
                </p>
                {selectedRecovery.admin_note && (
                  <p className="text-sm text-red-200 mt-2 whitespace-pre-wrap"><strong>Reason:</strong>\n{selectedRecovery.admin_note}</p>
                )}
              </div>
            )}

            {/* Close Button */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setReviewModal(false)}
                className="flex-1 btn-secondary px-3 py-2 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept/Reject Action Modal */}
      {actionModal && selectedRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/50 absolute inset-0" onClick={() => setActionModal(false)} />
          <div className="bg-card rounded-lg p-6 z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail size={18} /> {actionType === 'accept' ? '✓ Accept Recovery' : '✕ Reject Recovery'}
            </h3>

            {/* User Info Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p className="font-medium text-sm">{selectedRecovery.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{selectedRecovery.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asset Type</p>
                <p className="font-medium text-sm">{selectedRecovery.asset_type || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Discovered Balance</p>
                <p className="font-medium text-sm">${selectedRecovery.discovered_balance?.toLocaleString()}</p>
              </div>
            </div>

            {/* Message Configuration */}
            <div className="space-y-4 mb-6 p-4 rounded-lg border border-border bg-muted/20">
              <h4 className="font-semibold text-sm">Message to User</h4>

              {/* Title/Subject */}
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="input-field w-full"
                  placeholder={
                    actionType === 'accept'
                      ? 'e.g., Your Asset Recovery Has Been Approved'
                      : 'e.g., Your Asset Recovery Request Status'
                  }
                />
              </div>

              {/* Recovered Amount (Accept only) */}
              {actionType === 'accept' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Recovered Amount *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={actionAmount}
                      onChange={(e) => setActionAmount(e.target.value)}
                      className="input-field flex-1"
                      placeholder="Enter the amount to be deposited"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This amount will be mentioned in the message to the user</p>
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-sm font-medium mb-1">Message Body *</label>
                <textarea
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  className="input-field w-full h-32 resize-none font-mono text-sm"
                  placeholder={
                    actionType === 'accept'
                      ? `Dear ${selectedRecovery.user?.name || 'User'},\n\nWe are pleased to inform you that your asset recovery request has been approved by our forensic verification team and compliance organization. The recovered amount of $${actionAmount || '___'} has been verified and is ready for claim.\n\nYour identity verification (KYC) has been successfully completed. To proceed with claiming your funds:\n\n1. Log in to your account\n2. Navigate to your Recovery Dashboard\n3. Click "Claim Funds" to transfer your recovered amount to your main investment account\n\nThe deposited funds will be available for your next investment cycle.\n\nThank you for your patience throughout this process.\n\nBest regards,\nAsset Recovery & Compliance Team`
                      : `Dear ${selectedRecovery.user?.name || 'User'},\n\nWe regret to inform you that your asset recovery request has undergone forensic review and verification by our compliance team.\n\nStatus: Not Approved\nReason: [Please provide specific reason for denial]\n\nOur team has determined that the recovery request does not meet our verification requirements at this time.\n\nIf you believe this decision should be reconsidered or if you have additional documentation to provide, please contact our support team within 30 days.\n\nBest regards,\nAsset Recovery & Compliance Team`
                  }
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-semibold text-sm mb-3">Preview - What User Will See</h4>
              <div className={`p-4 rounded-lg ${actionType === 'accept' ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
                {actionTitle && <p className="font-semibold text-white mb-2">{actionTitle}</p>}
                {actionMessage && <p className="text-sm text-gray-200 whitespace-pre-wrap">{actionMessage}</p>}
                {!actionTitle && !actionMessage && <p className="text-xs text-muted-foreground">Preview will appear here...</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitAction}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  actionType === 'accept'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
                }`}
              >
                {isSubmitting
                  ? 'Processing...'
                  : `${actionType === 'accept' ? 'Accept & Send' : 'Reject & Send'} Message`}
              </button>
              <button
                onClick={() => {
                  setActionModal(false);
                  setActionType(null);
                  setActionTitle('');
                  setActionMessage('');
                  setActionAmount('');
                }}
                className="flex-1 btn-secondary px-4 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
