import React from 'react';

// Small helper component for payment modal will be imported by AdminUsersView dynamically if needed
export default function PaymentModal({ open, onClose, onSubmit, isUploading, paymentMethod, setPaymentMethod, paymentAddress, setPaymentAddress, paymentQrFile, setPaymentQrFile }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-black/50 absolute inset-0" onClick={onClose}></div>
      <div className="bg-card rounded-lg p-6 z-10 w-[420px]">
        <h3 className="text-lg font-semibold mb-3">Update Payment Info</h3>
        <div className="space-y-3">
          <label className="block text-sm">Method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field w-full">
            <option>USDT</option>
            <option>BTC</option>
            <option>ETH</option>
            <option>Bank</option>
          </select>
          <label className="block text-sm">Address</label>
          <input value={paymentAddress} onChange={(e) => setPaymentAddress(e.target.value)} className="input-field w-full" />
          <label className="block text-sm">QR Image (optional)</label>
          <input type="file" onChange={(e) => setPaymentQrFile(e.target.files?.[0] || null)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary px-3 py-1.5" onClick={onClose}>Cancel</button>
          <button className="btn-primary px-3 py-1.5" onClick={onSubmit} disabled={isUploading}>{isUploading ? 'Uploading...' : 'Update'}</button>
        </div>
      </div>
    </div>
  );
}