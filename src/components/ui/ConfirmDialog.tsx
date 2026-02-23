'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

interface ConfirmDialogContextType {
    showConfirm: (options: ConfirmDialogOptions) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirm must be used within ConfirmDialogProvider');
    }
    return context;
};

export const ConfirmDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

    const showConfirm = (opts: ConfirmDialogOptions) => {
        setOptions(opts);
        setIsOpen(true);
    };

    const handleConfirm = async () => {
        if (options?.onConfirm) {
            await options.onConfirm();
        }
        setIsOpen(false);
        setOptions(null);
    };

    const handleCancel = () => {
        if (options?.onCancel) {
            options.onCancel();
        }
        setIsOpen(false);
        setOptions(null);
    };

    return (
        <ConfirmDialogContext.Provider value={{ showConfirm }}>
            {children}
            <AnimatePresence>
                {isOpen && options && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-10"
                        >
                            <div className="flex items-start gap-6">
                                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="text-yellow-600" size={32} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        {options.title || 'Confirm Action'}
                                    </h3>
                                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                        {options.message}
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={handleCancel}
                                            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            {options.cancelText || 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            className="px-6 py-2.5 bg-[#4D869C] text-white font-medium rounded-lg hover:bg-[#3d6b7d] transition-colors"
                                        >
                                            {options.confirmText || 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmDialogContext.Provider>
    );
};
