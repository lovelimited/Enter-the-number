import React from 'react';
import { RefreshCw } from 'lucide-react';

function LoadingOverlay({ message = "กำลังโหลด..." }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl px-10 py-8 shadow-xl flex flex-col items-center gap-4 border border-white/50">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
            <RefreshCw size={28} className="text-white animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        </div>
        <p className="text-text-main font-semibold text-lg">{message}</p>
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            style={{ animation: 'shimmer 1.5s ease-in-out infinite', backgroundSize: '200% 100%' }}
          />
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
