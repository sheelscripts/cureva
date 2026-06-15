import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface DrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function DrawerPanel({ isOpen, onClose, title, children }: DrawerPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-bg-surface border-l border-border-base shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-border-dim bg-bg-subtle flex items-center justify-between">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">{title}</h3>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1 text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
