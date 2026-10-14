import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-md animate-fade-in transition-all">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-[#14532d] text-white border-[#15803d]'
            : toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-700'
            : 'bg-stone-900 text-stone-100 border-stone-700'
        }`}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0" />}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
