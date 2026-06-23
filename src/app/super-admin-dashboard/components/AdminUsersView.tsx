'use client';

import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2, Lock, UserCheck, Eye, Ban, ChevronDown, ChevronUp, ChevronsUpDown, UserPlus, X, DollarSign, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import PaymentModal from './AdminUsersView.payment-modal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type SortKey = 'name' | 'totalDeposited' | 'balance' | 'riskScore' | 'joined';
type SortDir = 'asc' | 'desc';
type TransactionType = 'deposit' | 'withdrawal';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'status-active',
    flagged: 'status-flagged',
    locked: 'status-locked',
    pending: 'status-pending',
  };
  const icons: Record<string, React.ElementType> = {
    active: CheckCircle2,
    flagged: AlertTriangle,
    locked: Lock,
  };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${map[status] ?? 'status-locked'}`}>
      {Icon && <Icon size={10} />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function KycBadge({ kycStatus }: { kycStatus: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: 'Verified', cls: 'status-active' },
    approved: { label: 'Approved', cls: 'status-active' },
    pending: { label: 'Pending', cls: 'status-pending' },
    not_submitted: { label: 'None', cls: 'status-locked' },
    rejected: { label: 'Rejected', cls: 'status-rejected' },
  };
  const entry = map[kycStatus] ?? { label: kycStatus, cls: 'status-locked' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

export default function AdminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalDeposited');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Subadmin Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubadmin, setNewSubadmin] = useState({ name: '', email: '', role: 'subadmin' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment update modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('USDT');
  const [paymentAddress, setPaymentAddress] = useState('');
  const [paymentQrFile, setPaymentQrFile] = useState<File | null>(null);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);

  // Unified Transaction Adjustment States (Deposit & Withdrawal)
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [txType, setTxType] = useState<TransactionType>('deposit');
  const [amountInput, setAmountInput] = useState('');
  const [isProcessingTx, setIsProcessingTx] = useState(false);
  const [isBackdating, setIsBackdating] = useState(false);
  const [backdateDate, setBackdateDate] = useState('');
  const [txNotes, setTxNotes] = useState('');
  
  // Bulk Transaction States
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkTxType, setBulkTxType] = useState<TransactionType>('deposit');
  const [bulkNotes, setBulkNotes] = useState('');
  const [isBulkBackdating, setIsBulkBackdating] = useState(false);
  const [bulkBackdateDate, setBulkBackdateDate] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const closeTxModal = () => {
    setAdjustingUser(null);
    setTxType('deposit');
    setAmountInput('');
    setTxNotes('');
    setIsBackdating(false);
    setBackdateDate('');
  };

  const closeBulkModal = () => {
    setIsBulkMode(false);
    setBulkAmount('');
    setBulkTxType('deposit');
    setBulkNotes('');
    setIsBulkBackdating(false);
    setBulkBackdateDate('');
  };

  // Payment update handler (uploads QR via supabase storage then calls admin API)  const handleSubmitPaymentUpdate = async () => {    setIsUploadingPayment(true);    try {      const { data: { session } } = await supabase.auth.getSession();      const token = session?.access_token;      if (!token) {        toast.error('Not authenticated');        setIsUploadingPayment(false);        return;      }
      let qrPath: string | undefined;      if (paymentQrFile) {        // attempt upload using client-side supabase
        try {          const bucket = 'payment-qr';          const key = `payment-qr/${Date.now()}_${paymentQrFile.name}`;          const { error } = await supabase.storage.from(bucket).upload(key, paymentQrFile as File);          if (error) {            console.error('QR upload error:', error);            toast.error('QR upload failed');          } else {            qrPath = key;          }        } catch (e) {          console.error('QR upload exception', e);        }      }
      // call admin API to update users payment info (selectedRows or all users)      const body: any = {        action: 'update-payment',        payment_method: paymentMethod,        payment_address: paymentAddress,      };      if (qrPath) body.payment_qr_url = qrPath;      if (selectedRows.size > 0) body.userIds = Array.from(selectedRows);
      const res = await fetch('/api/admin/users', {        method: 'POST',        headers: {          'Content-Type': 'application/json',          'Authorization': `Bearer ${token}`        },        body: JSON.stringify(body)      });
      const data = await res.json();      if (res.ok) {        toast.success(data.message || 'Payment info updated');        setIsPaymentModalOpen(false);        fetchUsers();      } else {        toast.error(data.error || 'Failed to update payment info');      }    } catch (e) {      console.error(e);      toast.error('An error occurred while updating payment info');    } finally {      setIsUploadingPayment(false);    }  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An error occurred loading users list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = users
    .filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(search.toLowerCase()) ?? false;
      const emailMatch = u.email?.toLowerCase().includes(search.toLowerCase()) ?? false;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return (nameMatch || emailMatch) && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map((u) => u.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'locked' | 'flagged', reason?: string) => {
    if (selectedRows.size === 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const userIds = Array.from(selectedRows);
      const res = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds, status, flagReason: reason })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Successfully updated status to '${status}'`);
        setSelectedRows(new Set());
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('An error occurred during bulk status update');
    }
  };

  const handleIndividualStatusUpdate = async (userId: string, status: 'active' | 'locked' | 'flagged', reason?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/users/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds: [userId], status, flagReason: reason })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Successfully updated status to '${status}'`);
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (err) {
      toast.error('An error occurred during status update');
    }
  };

  const handleCreateSubadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const tempPassword = Math.random().toString(36).slice(-8) + 'Ab1!';

      const res = await fetch('/api/admin/subadmin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSubadmin.name,
          email: newSubadmin.email,
          role: newSubadmin.role,
          password: tempPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Subadmin created for ${newSubadmin.name}. Temp password is: ${tempPassword}`);
        setIsCreateModalOpen(false);
        setNewSubadmin({ name: '', email: '', role: 'subadmin' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to create subadmin account');
      }
    } catch (err) {
      toast.error('An error occurred during subadmin creation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number for the amount.');
      return;
    }

    if (txType === 'withdrawal' && amount > (adjustingUser?.balance || 0)) {
      toast.error('Insufficient balance to complete this manual withdrawal adjustment.');
      return;
    }

    setIsProcessingTx(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const payload: any = { 
        userId: adjustingUser.id, 
        amount, 
        type: txType,
        notes: txNotes || undefined
      };
      
      const toLocalISO = (s: string) => {
        if (!s) return undefined;
        const dt = new Date(s);
        return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
      };
      if (isBackdating && backdateDate) {
        payload.backdateDate = toLocalISO(backdateDate);
      }

      const res = await fetch('/api/admin/users/adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Successfully executed ${txType} of $${amount.toLocaleString()} for user.`);
        closeTxModal();
        fetchUsers();
      } else {
        toast.error(data.error || `Failed to process ${txType}`);
      }
    } catch (err) {
      toast.error('An error occurred during transaction processing');
    } finally {
      setIsProcessingTx(false);
    }
  };

  const handleConfirmBulkTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bulkAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive number for the amount.');
      return;
    }

    if (selectedRows.size === 0) {
      toast.error('Please select at least one user.');
      return;
    }

    if (bulkTxType === 'withdrawal') {
      const insufficientUsers = filtered.filter(u => selectedRows.has(u.id) && (u.balance || 0) < amount);
      if (insufficientUsers.length > 0) {
        toast.error(`${insufficientUsers.length} user(s) have insufficient balance for withdrawal.`);
        return;
      }
    }

    setIsProcessingBulk(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const payload: any = {
        userIds: Array.from(selectedRows),
        amount,
        type: bulkTxType,
        notes: bulkNotes || undefined
      };

      const toLocalISO = (s: string) => {
        if (!s) return undefined;
        const dt = new Date(s);
        return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
      };
      if (isBulkBackdating && bulkBackdateDate) {
        payload.backdateDate = toLocalISO(bulkBackdateDate);
      }

      const res = await fetch('/api/admin/users/bulk-adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Successfully ${bulkTxType}ed $${amount.toLocaleString()} for ${selectedRows.size} user(s).`);
        closeBulkModal();
        setSelectedRows(new Set());
        fetchUsers();
      } else {
        toast.error(data.error || `Failed to process bulk ${bulkTxType}`);
      }
    } catch (err) {
      toast.error('An error occurred during bulk transaction processing');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-muted-foreground" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />;
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} total users · {users.filter(u => u.status === 'flagged').length} flagged</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="input-field pl-9 pr-4 py-2 text-sm w-52"
            />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            <UserPlus size={16} />
            Create Subadmin
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm font-medium"
          >
            Update Payment
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl slide-up"
          style={{ backgroundColor: 'rgba(232,80,10,0.1)', border: '1px solid rgba(232,80,10,0.3)' }}
        >
          <span className="text-sm font-medium text-primary">{selectedRows.size} users selected</span>
          <div className="flex gap-3">
            <button
              onClick={() => setIsBulkMode(true)}
              className="btn-primary flex items-center gap-2 px-3 py-1.5 text-xs font-medium"
            >
              <DollarSign size={12} />
              Bulk Adjust
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('locked')}
              className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs font-medium"
            >
              <Lock size={12} />
              Lock Selected
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('flagged', 'Bulk Flagged by Admin')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              <AlertTriangle size={12} />
              Flag Selected
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('active')}
              className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs font-medium"
            >
              <CheckCircle2 size={12} />
              Activate Selected
            </button>
          </div>
        </div>
      )}

      {/* Payment update modal */}
      <PaymentModal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={handleSubmitPaymentUpdate}
        isUploading={isUploadingPayment}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentAddress={paymentAddress}
        setPaymentAddress={setPaymentAddress}
        paymentQrFile={paymentQrFile}
        setPaymentQrFile={setPaymentQrFile}
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                {[
                  { label: 'User', key: 'name' as SortKey },
                  { label: 'Grade', key: null },
                  { label: 'KYC', key: null },
                  { label: 'Status', key: null },
                  { label: 'Total Deposited', key: 'totalDeposited' as SortKey },
                  { label: 'Balance', key: 'balance' as SortKey },
                  { label: 'Risk Score', key: 'riskScore' as SortKey },
                  { label: 'Subadmin', key: null },
                  { label: 'Joined', key: 'joined' as SortKey },
                  { label: 'Actions', key: null },
                ].map((col) => (
                  <th
                    key={`ucol-${col.label}`}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.key ? (
                      <button
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        onClick={() => handleSort(col.key!)}
                      >
                        {col.label}
                        <SortIcon col={col.key} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-sm font-semibold">Loading live database users...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="table-row-hover transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                        checked={selectedRows.has(user.id)}
                        onChange={() => toggleRow(user.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #E8500A, #FF6B35)' }}
                        >
                          {user.name ? user.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground whitespace-nowrap">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.tier}
                        onChange={async (e) => {
                          const newTier = e.target.value;
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const token = session?.access_token;
                            if (!token) {
                              toast.error('Not authenticated');
                              return;
                            }
                            const res = await fetch('/api/admin/users', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ action: 'update-tier', userIds: [user.id], tier: newTier })
                            });
                            const json = await res.json();
                            if (res.ok) {
                              toast.success('Tier updated');
                              fetchUsers();
                            } else {
                              toast.error(json?.error || 'Failed to update tier');
                            }
                          } catch (err) {
                            console.error(err);
                            toast.error('Error updating tier');
                          }
                        }}
                        className="rounded-md bg-[#111] border border-neutral-700 p-1 text-xs text-white"
                      >
                        <option value="tier_1">I</option>
                        <option value="tier_2">II</option>
                        <option value="tier_3">III</option>
                        <option value="tier_4">IV</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <KycBadge kycStatus={user.kycStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 font-mono-nums text-sm font-semibold text-foreground">
                      ${Number(user.totalDeposited || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono-nums text-sm font-semibold text-foreground">
                      ${Number(user.balance || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden w-16">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${user.riskScore}%`,
                              background: user.riskScore >= 60
                                ? 'var(--danger)'
                                : user.riskScore >= 30
                                ? 'var(--warning)'
                                : 'var(--success)',
                            }}
                          />
                        </div>
                        <span className="font-mono-nums text-xs text-muted-foreground">{user.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{user.subadmin}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{user.joined}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="btn-ghost p-1.5 text-success hover:bg-success/10 rounded-lg"
                          title="Adjust ledger transaction balance"
                          onClick={() => setAdjustingUser(user)}
                        >
                          <DollarSign size={14} />
                        </button>
                        <button className="btn-ghost p-1.5" title={`View ${user.name}'s profile`} aria-label="View user">
                          <Eye size={14} />
                        </button>
                        <button className="btn-ghost p-1.5" title={`Verify KYC for ${user.name}`} aria-label="KYC verify">
                          <UserCheck size={14} />
                        </button>
                        {user.status === 'locked' ? (
                          <button
                            className="btn-ghost p-1.5 text-success hover:bg-success/10 rounded-lg"
                            title={`Unlock ${user.name}'s account`}
                            aria-label="Unlock account"
                            onClick={() => handleIndividualStatusUpdate(user.id, 'active')}
                          >
                            <UserCheck size={14} className="text-success" />
                          </button>
                        ) : (
                          <button
                            className="btn-ghost p-1.5 text-warning hover:bg-warning/10 rounded-lg"
                            title={`Lock ${user.name}'s account`}
                            aria-label="Lock account"
                            onClick={() => handleIndividualStatusUpdate(user.id, 'locked')}
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {user.status === 'flagged' ? (
                          <button
                            className="btn-ghost p-1.5 text-success hover:bg-success/10 rounded-lg"
                            title={`Unflag ${user.name}`}
                            aria-label="Unflag user"
                            onClick={() => handleIndividualStatusUpdate(user.id, 'active')}
                          >
                            <CheckCircle2 size={14} className="text-success" />
                          </button>
                        ) : (
                          <button
                            className="btn-ghost p-1.5 text-danger hover:bg-danger/10 rounded-lg"
                            title={`Flag ${user.name} for review`}
                            aria-label="Flag user"
                            onClick={() => handleIndividualStatusUpdate(user.id, 'flagged', 'Compliance Review')}
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Showing {filtered.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Unified Balance Adjustment Modal (Deposit & Withdrawal) */}
      {adjustingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isProcessingTx && closeTxModal()} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <DollarSign className="text-primary" size={20} />
                Manual Balance Adjustment
              </h3>
              <button onClick={closeTxModal} className="btn-ghost p-1" disabled={isProcessingTx}>
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 text-muted-foreground">
              <p>User Identity: <span className="text-foreground font-semibold">{adjustingUser.name}</span></p>
              <p>Email Context: <span className="text-foreground font-semibold">{adjustingUser.email}</span></p>
              <p>Current Balance: <span className="text-foreground font-semibold">${Number(adjustingUser.balance || 0).toLocaleString()}</span></p>
            </div>

            <form onSubmit={handleConfirmTransaction} className="space-y-4">
              {/* Type Selection Tabs */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                  <button
                    type="button"
                    disabled={isProcessingTx}
                    onClick={() => setTxType('deposit')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      txType === 'deposit'
                        ? 'bg-card text-success shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    Deposit (+)
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingTx}
                    onClick={() => setTxType('withdrawal')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      txType === 'withdrawal'
                        ? 'bg-card text-danger shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Withdrawal (-)
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Transaction Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  <input
                    required
                    autoFocus
                    disabled={isProcessingTx}
                    type="number"
                    step="any"
                    min="0.01"
                    className="input-field w-full pl-7 pr-4 py-2.5 text-sm font-mono text-foreground"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Reason/Notes Field */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason or Notes (Optional)</label>
                <textarea
                  disabled={isProcessingTx}
                  className="input-field w-full px-3 py-2 text-xs text-foreground resize-none"
                  rows={2}
                  placeholder="e.g., Customer complaint resolution, periodic adjustment, etc."
                  value={txNotes}
                  onChange={e => setTxNotes(e.target.value)}
                />
              </div>

              {/* Backdating Configuration */}
              <div className="border border-border/60 bg-muted/20 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="backdate-toggle"
                    type="checkbox"
                    disabled={isProcessingTx}
                    checked={isBackdating}
                    onChange={e => {
                      setIsBackdating(e.target.checked);
                      if (e.target.checked && !backdateDate) {
                        const now = new Date();
                        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setBackdateDate(localDateTime);
                      }
                    }}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <label htmlFor="backdate-toggle" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Backdate this transaction
                  </label>
                </div>

                {isBackdating && (
                  <div className="slide-down space-y-1">
                    <label className="block text-[10px] font-semibold text-muted-foreground">Select Transaction Time (Local)</label>
                    <input
                      required={isBackdating}
                      type="datetime-local"
                      disabled={isProcessingTx}
                      className="input-field w-full px-3 py-2 text-xs font-mono text-foreground bg-card"
                      value={backdateDate}
                      onChange={e => setBackdateDate(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                      💡 This overrides the record placement date in the ledger history to reflect the selected time.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" disabled={isProcessingTx} onClick={closeTxModal} className="btn-secondary flex-1 py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessingTx} className="btn-primary flex-1 py-2.5 text-white flex items-center justify-center gap-2 font-medium">
                  {isProcessingTx ? 'Processing...' : 'Confirm Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Balance Adjustment Modal */}
      {isBulkMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isProcessingBulk && closeBulkModal()} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <DollarSign className="text-primary" size={20} />
                Bulk Adjustment
              </h3>
              <button onClick={closeBulkModal} className="btn-ghost p-1" disabled={isProcessingBulk}>
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 text-muted-foreground">
              <p>Selected Users: <span className="text-foreground font-semibold">{selectedRows.size}</span></p>
              <p>Adjustment Mode: <span className="text-foreground font-semibold capitalize">{bulkTxType}</span></p>
            </div>

            <form onSubmit={handleConfirmBulkTransaction} className="space-y-4">
              {/* Type Selection Tabs */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                  <button
                    type="button"
                    disabled={isProcessingBulk}
                    onClick={() => setBulkTxType('deposit')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      bulkTxType === 'deposit'
                        ? 'bg-card text-success shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    Deposit (+)
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingBulk}
                    onClick={() => setBulkTxType('withdrawal')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      bulkTxType === 'withdrawal'
                        ? 'bg-card text-danger shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Withdrawal (-)
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount Per User</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  <input
                    required
                    autoFocus
                    disabled={isProcessingBulk}
                    type="number"
                    step="any"
                    min="0.01"
                    className="input-field w-full pl-7 pr-4 py-2.5 text-sm font-mono text-foreground"
                    placeholder="0.00"
                    value={bulkAmount}
                    onChange={e => setBulkAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Reason/Notes Field */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason or Notes (Optional)</label>
                <textarea
                  disabled={isProcessingBulk}
                  className="input-field w-full px-3 py-2 text-xs text-foreground resize-none"
                  rows={2}
                  placeholder="e.g., Monthly bonus distribution, platform promotion, etc."
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                />
              </div>

              {/* Backdating Configuration */}
              <div className="border border-border/60 bg-muted/20 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="bulk-backdate-toggle"
                    type="checkbox"
                    disabled={isProcessingBulk}
                    checked={isBulkBackdating}
                    onChange={e => {
                      setIsBulkBackdating(e.target.checked);
                      if (e.target.checked && !bulkBackdateDate) {
                        const now = new Date();
                        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setBulkBackdateDate(localDateTime);
                      }
                    }}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <label htmlFor="bulk-backdate-toggle" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Backdate these transactions
                  </label>
                </div>

                {isBulkBackdating && (
                  <div className="slide-down space-y-1">
                    <label className="block text-[10px] font-semibold text-muted-foreground">Select Transaction Time (Local)</label>
                    <input
                      required={isBulkBackdating}
                      type="datetime-local"
                      disabled={isProcessingBulk}
                      className="input-field w-full px-3 py-2 text-xs font-mono text-foreground bg-card"
                      value={bulkBackdateDate}
                      onChange={e => setBulkBackdateDate(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                      💡 All transactions will be recorded with this timestamp.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" disabled={isProcessingBulk} onClick={closeBulkModal} className="btn-secondary flex-1 py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={isProcessingBulk} className="btn-primary flex-1 py-2.5 text-white flex items-center justify-center gap-2 font-medium">
                  {isProcessingBulk ? 'Processing...' : `Confirm (${selectedRows.size})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Subadmin Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isSubmitting && setIsCreateModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Provision New Subadmin</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="btn-ghost p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubadmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name</label>
                <input
                  required
                  type="text"
                  className="input-field w-full px-4 py-2.5 text-sm"
                  placeholder="e.g. Daniel Richards"
                  value={newSubadmin.name}
                  onChange={e => setNewSubadmin({...newSubadmin, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address</label>
                <input
                  required
                  type="email"
                  className="input-field w-full px-4 py-2.5 text-sm"
                  placeholder="subadmin@redmanfinance.com"
                  value={newSubadmin.email}
                  onChange={e => setNewSubadmin({...newSubadmin, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Account Role</label>
                <select 
                  className="input-field w-full px-4 py-2.5 text-sm"
                  value={newSubadmin.role}
                  onChange={e => setNewSubadmin({...newSubadmin, role: e.target.value})}
                >
                  <option value="subadmin">Sub-Administrator</option>
                  <option value="super_admin">Super Administrator</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  Note: An automated secure password will be generated and sent to the provided email. The user will be required to change it upon first login.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1 py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}