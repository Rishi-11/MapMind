import React, { useState } from 'react';
import {
  FolderArchive,
  Plus,
  Download,
  Upload,
  Check,
  Trash2,
  X,
  FileText,
  BookOpen,
  Sparkles,
  HardDrive,
  ShieldAlert,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import { Workspace } from '@/types/notebook';
import { VaultMetadata } from '@/lib/notebook/storage';

interface VaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVault: Workspace;
  vaultList: VaultMetadata[];
  onSwitchVault: (vaultId: string) => void;
  onCreateVault: (name: string, template: 'empty' | 'guide') => void;
  onExportCurrentVault: () => void;
  onSaveVaultAs?: () => void;
  onOpenLocalVaultFile?: () => void;
  onExportAllVaultsBundle: () => void;
  onImportVaultFile: (file: File) => void;
  onDeleteVault: (vaultId: string) => void;
  onWipeDeviceData: () => void;
}

export const VaultManagerModal: React.FC<VaultManagerModalProps> = ({
  isOpen,
  onClose,
  currentVault,
  vaultList,
  onSwitchVault,
  onCreateVault,
  onExportCurrentVault,
  onSaveVaultAs,
  onOpenLocalVaultFile,
  onExportAllVaultsBundle,
  onImportVaultFile,
  onDeleteVault,
  onWipeDeviceData,
}) => {
  const [tab, setTab] = useState<'list' | 'create' | 'device'>('list');
  const [newVaultName, setNewVaultName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'empty' | 'guide'>('empty');
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultName.trim()) return;
    onCreateVault(newVaultName.trim(), selectedTemplate);
    setNewVaultName('');
    setTab('list');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportVaultFile(file);
      onClose();
    }
  };

  const handleConfirmWipe = () => {
    onWipeDeviceData();
    setShowWipeConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Knowledge Vaults & Device Privacy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Local-first private vaults & shared machine protection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => { setTab('list'); setShowWipeConfirm(false); }}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
              tab === 'list'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            My Vaults ({vaultList.length})
          </button>
          <button
            onClick={() => { setTab('create'); setShowWipeConfirm(false); }}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1 ${
              tab === 'create'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Vault</span>
          </button>
          <button
            onClick={() => { setTab('device'); setShowWipeConfirm(false); }}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1 ml-auto ${
              tab === 'device'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-red-500'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Device & Privacy</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {tab === 'list' ? (
            <div className="space-y-4">
              {/* Vaults List */}
              <div className="space-y-2">
                {vaultList.map((v) => {
                  const isActive = v.id === currentVault.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (!isActive) {
                          onSwitchVault(v.id);
                          onClose();
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-xs'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {v.name}
                            </h4>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{v.notebookCount} notebooks</span>
                            <span>•</span>
                            <span>{v.pageCount} notes</span>
                            <span>•</span>
                            <span>
                              Updated {new Date(v.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isActive ? (
                          <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onSwitchVault(v.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-lg transition-colors"
                          >
                            Open
                          </button>
                        )}

                        {!isActive && vaultList.length > 1 && (
                          <button
                            onClick={() => onDeleteVault(v.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                            title="Delete Vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions: Save JSON / Open JSON */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onExportCurrentVault}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
                    title="Save current active vault directly to local disk (Ctrl+S)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save to Disk (Ctrl+S)</span>
                  </button>

                  {onSaveVaultAs && (
                    <button
                      onClick={onSaveVaultAs}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Save current active vault to a new local file location (Ctrl+Shift+S)"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                      <span>Save As...</span>
                    </button>
                  )}

                  <button
                    onClick={onExportAllVaultsBundle}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Download all vaults and notes in a single master backup JSON"
                  >
                    <Archive className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Backup All Vaults</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenLocalVaultFile && (
                    <button
                      onClick={onOpenLocalVaultFile}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors"
                      title="Open and sync a vault file directly from disk (Ctrl+O)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Open Vault File (Ctrl+O)</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          ) : tab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vault Name
                </label>
                <input
                  type="text"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  placeholder="e.g. My Research Vault, Personal Notes..."
                  autoFocus
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Starter Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedTemplate('empty')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'empty'
                        ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-400 dark:border-purple-700 ring-2 ring-purple-500/20'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Empty Vault
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Clean slate with a single blank notebook ready for your notes.
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('guide')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate === 'guide'
                        ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-400 dark:border-purple-700 ring-2 ring-purple-500/20'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Include Guides
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Includes complete interactive MapMind tutorial notes and templates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newVaultName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors shadow-sm"
                >
                  Create Vault
                </button>
              </div>
            </form>
          ) : (
            /* Device & Privacy Tab (Shared Computer Protection) */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Using a Shared, School, or Work Computer?</span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                  MapMind stores all your knowledge notes and mind maps <strong>locally in this browser's IndexedDB database</strong>. If you are leaving this computer permanently, export your data as a backup file and wipe this device clean so nobody else can access your notes.
                </p>
              </div>

              {/* Action 1: Export Full Backup */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Step 1: Download All-Vaults Backup
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Save every vault, notebook, and note into a single portable <kbd>.json</kbd> file.
                    </p>
                  </div>
                  <button
                    onClick={onExportAllVaultsBundle}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All Vaults</span>
                  </button>
                </div>
              </div>

              {/* Action 2: Wipe Machine Data */}
              <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/60 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Step 2: Wipe All Local Data on this Computer</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Permanently deletes all IndexedDB vaults, notes, mind maps, local storage caches, and resets MapMind back to initial state.
                  </p>
                </div>

                {!showWipeConfirm ? (
                  <button
                    onClick={() => setShowWipeConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe All Data & Leave Computer</span>
                  </button>
                ) : (
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl border border-red-300 dark:border-red-700 space-y-2 animate-in fade-in">
                    <p className="text-xs font-bold text-red-900 dark:text-red-200 text-center">
                      ⚠️ Are you absolutely sure? This cannot be undone.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowWipeConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onExportAllVaultsBundle}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold"
                      >
                        Download Backup First
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmWipe}
                        className="px-3.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold"
                      >
                        Yes, Erase Everything
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            <span>IndexedDB Local Storage</span>
          </span>
          <span>Shortcuts: <kbd>Ctrl+Alt+N</kbd> New • <kbd>Ctrl+O</kbd> Open • <kbd>Ctrl+S</kbd> Save</span>
        </div>
      </div>
    </div>
  );
};
