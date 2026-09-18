import React from 'react';
import { WifiOff, Database, Check } from 'lucide-react';

interface OfflineBannerProps {
  pendingCount?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ pendingCount = 0 }) => {
  return (
    <div
      id="offline-banner"
      className="bg-[#EA580C] text-white px-4 py-3 shadow-md transition-all duration-300 border-b border-orange-700"
    >
      <div className="max-w-4xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl shrink-0 mt-0.5 sm:mt-0">
            <WifiOff className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-2">
              <span>MODO SIN CONEXIÓN ACTIVO</span>
              {pendingCount > 0 && (
                <span className="bg-white text-[#EA580C] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {pendingCount} {pendingCount === 1 ? 'reporte guardado' : 'reportes guardados'}
                </span>
              )}
            </p>
            <p className="text-xs sm:text-xs text-orange-100 mt-0.5 leading-relaxed">
              Estás trabajando sin conexión. Toda la información quedará guardada en el teléfono y se enviará sola al detectar señal.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-lg shrink-0">
          <Database className="w-3.5 h-3.5" />
          <span>IndexedDB Activo</span>
          <Check className="w-3.5 h-3.5 text-green-300" />
        </div>
      </div>
    </div>
  );
};
