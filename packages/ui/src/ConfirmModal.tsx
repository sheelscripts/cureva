import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-surface border border-border-base p-6 rounded-sm w-full max-w-sm shadow-xl flex flex-col space-y-4"
            >
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">{title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 border border-border-base hover:bg-bg-subtle text-xs font-semibold rounded-sm transition-all cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-text-primary text-bg-base hover:opacity-90 text-xs font-semibold rounded-sm transition-all cursor-pointer"
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
