import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Lock,
  Key,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Laptop,
  HelpCircle,
  X,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuthUser, SyncStatusInfo } from '@/types/auth';
import {
  registerUserAccount,
  loginUserAccount,
  testAppsScriptEndpoint,
  sanitizeAppsScriptUrl,
} from '@/lib/sync/googleSheetsSync';
import { setStoredAuthSession, clearSyncQueue } from '@/lib/sync/syncQueue';
import { deriveEncryptionKey, deriveAuthVerifier } from '@/lib/crypto/clientCrypto';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  encryptionKey: CryptoKey | null;
  syncStatus: SyncStatusInfo;
  onUserAuthenticated: (user: AuthUser, key: CryptoKey, authVerifier: string) => void;
  onUserLoggedOut: () => void;
  onTriggerManualSync: () => void;
  onPushAllToCloud?: () => Promise<void>;
  onClearSyncQueue?: () => Promise<void>;
  onRecoverFromBackup: (file: File, newPassword: string) => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  encryptionKey,
  syncStatus,
  onUserAuthenticated,
  onUserLoggedOut,
  onTriggerManualSync,
  onPushAllToCloud,
  onClearSyncQueue,
  onRecoverFromBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'setup' | 'recovery'>('account');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [appsScriptUrl, setAppsScriptUrl] = useState(
    currentUser?.appsScriptUrl || localStorage.getItem('mapmind_apps_script_url') || ''
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Session Unlock state (when user reloads page and encryption key is locked in memory)
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Edit URL state
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState(currentUser?.appsScriptUrl || '');

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync URLs whenever currentUser or modal opens
  useEffect(() => {
    const activeUrl = currentUser?.appsScriptUrl || localStorage.getItem('mapmind_apps_script_url') || '';
    if (activeUrl) {
      setAppsScriptUrl(activeUrl);
      setNewUrlInput(activeUrl);
    }
  }, [currentUser, isOpen]);

  // Recovery state
  const [recoveryFile, setRecoveryFile] = useState<File | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!appsScriptUrl) {
      setTestResult({ success: false, message: 'Please enter a Google Apps Script Web App URL.' });
      return;
    }
    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await testAppsScriptEndpoint(appsScriptUrl);
      if (res.success) {
        setTestResult({ success: true, message: `Connected successfully! (Schema v${res.schemaVersion || 1})` });
        localStorage.setItem('mapmind_apps_script_url', appsScriptUrl);
      } else {
        setTestResult({ success: false, message: `Connection failed: ${res.error}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!appsScriptUrl.trim()) {
      setErrorMessage('Please provide your Google Apps Script Web App URL.');
      return;
    }
    if (!username.trim() || !password) {
      setErrorMessage('Please fill in both username and password.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    const cleanUrl = sanitizeAppsScriptUrl(appsScriptUrl);
    try {
      if (mode === 'register') {
        const res = await registerUserAccount(cleanUrl, username.trim(), password);
        if (res.success && res.user && res.encryptionKey && res.authVerifier) {
          localStorage.setItem('mapmind_apps_script_url', cleanUrl);
          await setStoredAuthSession(res.user);
          onUserAuthenticated(res.user, res.encryptionKey, res.authVerifier);
          onClose();
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      } else {
        const res = await loginUserAccount(cleanUrl, username.trim(), password);
        if (res.success && res.user && res.encryptionKey && res.authVerifier) {
          localStorage.setItem('mapmind_apps_script_url', cleanUrl);
          await setStoredAuthSession(res.user);
          onUserAuthenticated(res.user, res.encryptionKey, res.authVerifier);
          onClose();
        } else {
          setErrorMessage(res.error || 'Login failed. Check your username and password.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const lastUrl = currentUser?.appsScriptUrl || appsScriptUrl;
    await setStoredAuthSession(null);
    await clearSyncQueue();
    if (lastUrl) {
      localStorage.setItem('mapmind_apps_script_url', lastUrl);
      setAppsScriptUrl(lastUrl);
      setNewUrlInput(lastUrl);
    }
    onUserLoggedOut();
  };

  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword || !currentUser) return;
    setIsLoading(true);
    setUnlockError(null);
    try {
      const key = await deriveEncryptionKey(unlockPassword, currentUser.salt);
      const verifier = await deriveAuthVerifier(unlockPassword, currentUser.salt);
      onUserAuthenticated(currentUser, key, verifier);
      setUnlockPassword('');
      setTimeout(() => {
        onTriggerManualSync();
      }, 150);
    } catch (err: any) {
      setUnlockError(err.message || 'Incorrect password or failed to derive key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (onClearSyncQueue) {
      await onClearSyncQueue();
    } else {
      await clearSyncQueue();
    }
  };

  const handleSaveNewUrl = async () => {
    if (!newUrlInput.trim() || !currentUser) return;
    const sanitized = sanitizeAppsScriptUrl(newUrlInput);
    currentUser.appsScriptUrl = sanitized;
    setAppsScriptUrl(sanitized);
    localStorage.setItem('mapmind_apps_script_url', sanitized);
    await setStoredAuthSession({ ...currentUser, appsScriptUrl: sanitized });
    setIsEditingUrl(false);
  };

  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryFile) {
      setRecoveryStatus('Please select your plaintext backup (.mapnote / .json) file.');
      return;
    }
    if (!recoveryPassword || recoveryPassword !== recoveryConfirm) {
      setRecoveryStatus('Passwords do not match.');
      return;
    }
    if (recoveryPassword.length < 8) {
      setRecoveryStatus('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await onRecoverFromBackup(recoveryFile, recoveryPassword);
      setRecoveryStatus('Backup successfully imported and re-encrypted with your new key!');
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setRecoveryStatus(`Recovery failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAppsScriptCode = () => {
    const code = `// Paste the complete Code.gs from the MapMind repository into your Google Apps Script editor.`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Encrypted Cloud Storage & Multi-Device Sync
              </h2>
              <p className="text-xs text-slate-500">
                Zero-Knowledge AES-256-GCM client-side encryption via Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'account'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {currentUser ? 'Cloud Account' : 'Login / Register'}
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Apps Script Setup Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'recovery'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Emergency Recovery
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* TAB 1: Account / Auth */}
          {activeTab === 'account' && (
            <>
              {currentUser && !encryptionKey ? (
                /* Session Locked State - Enter password to unlock in-memory encryption key */
                <form onSubmit={handleUnlockSession} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-600" />
                      <span>Cloud Session Locked (@{currentUser.username})</span>
                    </div>
                    <p>
                      Enter your encryption password to re-activate client-side AES-256-GCM encryption and sync with Google Sheets.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Encryption Password
                    </label>
                    <div className="relative">
                      <input
                        type={showUnlockPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={unlockPassword}
                        onChange={(e) => setUnlockPassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title={showUnlockPassword ? 'Hide password' : 'Show password'}
                      >
                        {showUnlockPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {unlockError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium">
                      {unlockError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Unlocking...' : 'Unlock & Sync Cloud Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      Switch User
                    </button>
                  </div>
                </form>
              ) : currentUser ? (
                /* Authenticated State */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {currentUser.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          @{currentUser.username}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Client-Side AES-256-GCM Active</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/60 transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>

                  {/* Sync Status Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="text-xs text-slate-400 font-medium">Device Identifier</div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate mt-1 flex items-center gap-1">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentUser.deviceId}</span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 font-medium">Sync Queue</div>
                        {syncStatus.pendingCount > 0 && (
                          <button
                            type="button"
                            onClick={handleClearQueue}
                            className="text-[10px] text-red-500 hover:text-red-700 font-semibold underline"
                          >
                            Clear Queue
                          </button>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${syncStatus.pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span>{syncStatus.pendingCount} pending changes</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <strong>Google Apps Script Endpoint:</strong>
                      {!isEditingUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNewUrlInput(currentUser.appsScriptUrl);
                            setIsEditingUrl(true);
                          }}
                          className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                        >
                          Change URL
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleSaveNewUrl}
                            className="text-[10px] text-emerald-600 font-bold hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingUrl(false)}
                            className="text-[10px] text-slate-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditingUrl ? (
                      <input
                        type="url"
                        value={newUrlInput}
                        onChange={(e) => setNewUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                        autoFocus
                      />
                    ) : (
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {currentUser.appsScriptUrl}
                      </div>
                    )}
                  </div>

                  {/* Manual Sync Button */}
                  <div className="space-y-2">
                    <button
                      onClick={onTriggerManualSync}
                      disabled={syncStatus.state === 'syncing'}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>{syncStatus.state === 'syncing' ? 'Encrypting & Syncing...' : 'Sync Cloud Changes'}</span>
                    </button>

                    {onPushAllToCloud && (
                      <button
                        type="button"
                        onClick={onPushAllToCloud}
                        disabled={syncStatus.state === 'syncing'}
                        className="w-full py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        title="Upload all local notebooks, sections, and notes to cloud database"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Force Full Vault Backup (All Hierarchy)</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Login / Register Form */
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {/* Security Alert Banner */}
                  <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Zero-Knowledge Security Philosophy:</span> Your notes are encrypted with AES-256-GCM in your browser before upload. We have NO master key or password recovery backdoor. If you lose your password, encrypted cloud notes cannot be recovered without an unencrypted local backup (<kbd className="px-1 bg-amber-200/60 dark:bg-amber-800/60 rounded">Ctrl+S</kbd>).
                    </div>
                  </div>

                  {/* Mode Switcher */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        mode === 'login'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Log In Existing User
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        mode === 'register'
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Register New Account
                    </button>
                  </div>

                  {/* Google Apps Script URL */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Google Apps Script Web App URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={appsScriptUrl}
                        onChange={(e) => setAppsScriptUrl(e.target.value)}
                        required
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                      >
                        Test URL
                      </button>
                    </div>
                    {testResult && (
                      <div className={`text-[11px] mt-1.5 font-medium ${testResult.success ? 'text-emerald-600' : 'text-red-500'}`}>
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. alex"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Encryption Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Register mode) */}
                  {mode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Encryption Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Deriving Keys & Connecting...' : mode === 'register' ? 'Create Account & Enable Cloud Sync' : 'Log In & Sync Notes'}</span>
                  </button>
                </form>
              )}
            </>
          )}

          {/* TAB 2: Setup Guide */}
          {activeTab === 'setup' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm mb-1">
                    How to Set Up Your Private Google Sheet Cloud Backend
                  </h4>
                  <p>
                    You retain 100% control of your data. Follow these 4 quick steps to deploy your private Apps Script backend in Google Sheets.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    1. Create a Google Spreadsheet
                  </div>
                  <p>
                    Go to <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-purple-600 underline">sheets.new</a> and create a blank spreadsheet named <em>MapMind Database</em>.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    2. Open Apps Script Editor
                  </div>
                  <p>
                    In your spreadsheet menu, click <strong>Extensions → Apps Script</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      3. Paste the MapMind Code.gs Script
                    </div>
                    <button
                      type="button"
                      onClick={copyAppsScriptCode}
                      className="text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 font-semibold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied path' : 'google-apps-script/Code.gs'}</span>
                    </button>
                  </div>
                  <p className="mb-2">
                    Replace the default code in <code>Code.gs</code> with the full script provided in the MapMind repository.
                  </p>
                  <p className="text-slate-500">
                    In the toolbar, select function <code>setupDatabase</code> and click <strong>Run</strong> to automatically generate all schema tabs and headers.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    4. Deploy as Web App
                  </div>
                  <p className="mb-1">
                    Click <strong>Deploy → New deployment</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>Select type: <strong>Web app</strong></li>
                    <li>Execute as: <strong>Me</strong></li>
                    <li>Who has access: <strong>Anyone</strong> (guarded by client-side AES crypto + auth verification)</li>
                  </ul>
                  <p className="mt-2">
                    Copy the <strong>Web App URL</strong> and paste it into the MapMind Cloud Sync login tab!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Emergency Recovery */}
          {activeTab === 'recovery' && (
            <form onSubmit={handleExecuteRecovery} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Forgot Your Cloud Encryption Password?</span>
                </div>
                <p>
                  Because MapMind uses zero-knowledge encryption with no developer backdoors, you can recover your notes by importing an unencrypted local backup file (<kbd className="px-1 bg-blue-200/60 dark:bg-blue-800/60 rounded">.mapnote</kbd> or <kbd className="px-1 bg-blue-200/60 dark:bg-blue-800/60 rounded">.json</kbd>) and generating a new encryption password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Plaintext Backup File
                </label>
                <input
                  type="file"
                  accept=".mapnote,.json"
                  onChange={(e) => setRecoveryFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Encryption Password
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title={showRecoveryPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRecoveryPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryConfirm ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={recoveryConfirm}
                    onChange={(e) => setRecoveryConfirm(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryConfirm(!showRecoveryConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title={showRecoveryConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showRecoveryConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {recoveryStatus && (
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 text-purple-700 dark:text-purple-300 text-xs font-medium">
                  {recoveryStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Import Backup & Re-Encrypt Cloud Vault</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
