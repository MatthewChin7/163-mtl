'use client';

import { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';

interface PasswordConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<void>;
    actionName: string; // e.g., "Delete User" or "Change Role"
}

export default function PasswordConfirmModal({ isOpen, onClose, onConfirm, actionName }: PasswordConfirmModalProps) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await onConfirm(password);
            // If successful, onConfirm typically closes the modal or triggers refresh
            // But we can reset password here just in case
            setPassword('');
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold flex items-center gap-2 text-gray-800">
                        <Lock size={18} className="text-red-600" /> Security Verification
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-amber-50 text-amber-800 border-l-4 border-amber-500 p-3 mb-4 text-sm">
                        You are about to perform a sensitive action: <strong>{actionName}</strong>.
                        Please confirm your admin password to proceed.
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Admin Password</label>
                            <input
                                type="password"
                                autoFocus
                                className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                placeholder="Enter password..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm bg-red-50 p-2 rounded flex items-center gap-2 animate-pulse">
                                <X size={14} /> {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Proceed'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
