// src/components/RecoveryWizard.tsx

"use client";


import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

// Zod schema for step 1 intake form
const intakeSchema = z.object({
  caseType: z.enum([
    'credential_loss',
    'malicious_interception',
    'stuck_contract',
  ]),
  asset: z.enum(['SUM', 'BTC', 'ETH', 'USDT']),
  email: z.string().email(),
});

type IntakeForm = z.infer<typeof intakeSchema>;

export const RecoveryWizard: React.FC = () => {
  // Step and tab state
  const [step, setStep] = useState(1);
  const [kycTab, setKycTab] = useState(1);

  // File inputs
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submissionTime, setSubmissionTime] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IntakeForm>({ resolver: zodResolver(intakeSchema) });

  const onSubmit: SubmitHandler<IntakeForm> = (data) => {
    console.log('Intake data', data);
    setStep(2);
  };

  const btnBase = 'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors';

  // Submit KYC documents to the backend
  const submitKyc = async () => {
    if (!idFront || !idBack || !selfie) {
      alert('Please upload all required documents.');
      return;
    }
    const formData = new FormData();
    formData.append('idFront', idFront);
    formData.append('idBack', idBack);
    formData.append('selfie', selfie);
    try {
      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        console.error('Upload failed', err);
        alert('Upload failed: ' + (err.error || 'Unknown error'));
        return;
      }
      const result = await response.json();
      console.log('Upload success', result);
      setSubmissionTime(new Date());
      setStep(4); // advance to countdown timer step
    } catch (e) {
      console.error('Unexpected error', e);
      alert('An unexpected error occurred while uploading.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-[#111111] text-white rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-6 h-6 text-orange-500" />
        <h2 className="text-2xl font-bold">Asset Recovery & Forensic Ledger Hub</h2>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Case Type */}
              <label className="block">
                <span className="text-gray-300">Case Type</span>
                <select
                  {...register('caseType')}
                  className="mt-1 block w-full rounded-md bg-[#222] border-gray-600 text-white"
                >
                  <option value="credential_loss">Credential Oblivion (Paper Key Loss)</option>
                  <option value="malicious_interception">Malicious Interception (Hacked/Exploited)</option>
                  <option value="stuck_contract">Stuck Smart Contract</option>
                </select>
                {errors.caseType && <p className="text-red-500 text-sm">{errors.caseType.message}</p>}
              </label>

              {/* Asset */}
              <label className="block">
                <span className="text-gray-300">Asset</span>
                <select
                  {...register('asset')}
                  className="mt-1 block w-full rounded-md bg-[#222] border-gray-600 text-white"
                >
                  <option value="SUM">SUM</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="USDT">USDT (TRC‑10)</option>
                </select>
                {errors.asset && <p className="text-red-500 text-sm">{errors.asset.message}</p>}
              </label>

              {/* Email */}
              <label className="block">
                <span className="text-gray-300">Contact Email</span>
                <input
                  type="email"
                  {...register('email')}
                  className="mt-1 block w-full rounded-md bg-[#222] border-gray-600 text-white"
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </label>

              <button
                type="submit"
                className={`${btnBase} bg-orange-600 hover:bg-orange-700 text-white w-full justify-center`}
              >
                Continue to KYC
              </button>
            </form>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* KYC Tabs */}
            <div className="flex border-b border-gray-700 mb-4">
              <button
                type="button"
                onClick={() => setKycTab(1)}
                className={`px-4 py-2 ${kycTab === 1 ? 'border-b-2 border-orange-500 text-orange-400' : 'text-gray-400'}`}
              >
                Upload Documents
              </button>
              <button
                type="button"
                onClick={() => setKycTab(2)}
                className={`px-4 py-2 ${kycTab === 2 ? 'border-b-2 border-orange-500 text-orange-400' : 'text-gray-400'}`}
              >
                Review &amp; Submit
              </button>
            </div>

            {kycTab === 1 && (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-gray-300">ID Front</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => setIdFront(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-300">ID Back</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => setIdBack(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-300">Selfie (Live)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setSelfie(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setKycTab(2)}
                  className={`${btnBase} bg-orange-600 hover:bg-orange-700 text-white`}
                >
                  Proceed to Review
                </button>
              </div>
            )}

            {kycTab === 2 && (
              <div className="space-y-4">
                <p className="text-gray-300">[Review summary of uploaded documents]</p>
                <button
                  type="button"
                  onClick={submitKyc}
                  className={`${btnBase} bg-orange-600 hover:bg-orange-700 text-white`}
                >
                  Submit KYC Dossier
                </button>
              </div>
            )}
          </motion.section>
        )}

        {step === 4 && (
          <motion.section
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold mb-4">KYC Submitted Successfully</h3>
              {submissionTime && (
                <p className="text-gray-400 mb-6">Submitted at: {submissionTime.toLocaleString()}</p>
              )}
              <p className="text-gray-300">Your case is now under review. Please await further instructions.</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};
