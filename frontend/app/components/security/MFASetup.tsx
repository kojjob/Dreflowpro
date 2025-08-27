'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Smartphone, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MFASetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const initiateMFASetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/security/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to setup MFA');

      const data = await response.json();
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setBackupCodes(data.backup_codes);
      setStep('verify');
    } catch (err) {
      setError('Failed to initialize MFA setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/security/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: secret,
          backup_codes: backupCodes
        })
      });

      if (!response.ok) throw new Error('Invalid verification code');

      setStep('backup');
    } catch (err) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 3000);
  };

  const completeMFASetup = () => {
    if (onComplete) onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Two-Factor Authentication Setup
          </h2>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['Setup', 'Verify', 'Backup'].map((label, index) => {
            const stepNumber = index + 1;
            const currentStepNumber = step === 'setup' ? 1 : step === 'verify' ? 2 : 3;
            const isActive = stepNumber === currentStepNumber;
            const isComplete = stepNumber < currentStepNumber;

            return (
              <div key={label} className="flex items-center flex-1">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  ${isActive ? 'bg-blue-600 text-white' : 
                    isComplete ? 'bg-green-500 text-white' : 
                    'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                `}>
                  {isComplete ? <Check className="h-5 w-5" /> : stepNumber}
                </div>
                <span className={`ml-3 text-sm font-medium
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : 
                    'text-gray-500 dark:text-gray-400'}
                `}>
                  {label}
                </span>
                {index < 2 && (
                  <div className={`flex-1 h-0.5 mx-4
                    ${isComplete ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                  `} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center"
          >
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </motion.div>
        )}

        {/* Step Content */}
        {step === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Smartphone className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Secure Your Account
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Add an extra layer of security to your account by enabling two-factor authentication. 
                You'll need an authenticator app like Google Authenticator or Authy.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={initiateMFASetup}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Get Started'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'verify' && qrCode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Scan QR Code
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Scan this QR code with your authenticator app
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                {qrCode.startsWith('data:image') ? (
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                ) : (
                  <QRCodeSVG value={qrCode} size={192} />
                )}
              </div>

              {/* Manual Entry Option */}
              <details className="text-sm text-gray-500 dark:text-gray-400">
                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Can't scan? Enter manually
                </summary>
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <code className="text-xs break-all">{secret}</code>
                </div>
              </details>
            </div>

            {/* Verification Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter 6-digit code from your app
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep('setup')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={verifyMFA}
                disabled={loading || verificationCode.length !== 6}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'backup' && backupCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Key className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Save Your Backup Codes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Save these backup codes in a secure place. You can use them to access your account if you lose your phone.
              </p>
            </div>

            {/* Backup Codes Grid */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 px-4 py-2 rounded-md font-mono text-sm text-gray-900 dark:text-white text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>
              
              <button
                onClick={copyBackupCodes}
                className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
              >
                {copiedCodes ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Codes
                  </>
                )}
              </button>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Important:</strong> Each backup code can only be used once. 
                Store them securely and never share them with anyone.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={completeMFASetup}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Complete Setup
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}