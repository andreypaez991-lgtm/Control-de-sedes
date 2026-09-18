import React from 'react';
import { RefreshCw, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  sedeName?: string;
  manipuladoraName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  pendingCount,
  isSyncing,
  onSync,
  sedeName,
  manipuladoraName,
}) => {
  return (
    <header className="bg-[#0F3863] text-white shadow-lg sticky top-0 z-40 border-b border-[#0A2342]">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-gradient-to-br from-[#0D9488] to-[#0A2342] p-0.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
            <div className="w-full h-full rounded-[10px] bg-[#0F3863] flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6 text-[#CCFBF1]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#CCFBF1] uppercase">
                ARTHEMAH • PAE
              </span>
            </div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white truncate leading-tight">
              Control Sedes PAE
            </h1>
            {sedeName && (
              <p className="text-[11px] sm:text-xs text-blue-200 truncate flex items-center gap-1">
                <span className="font-semibold">{sedeName}</span>
                {manipuladoraName && <span className="opacity-75">• {manipuladoraName}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Status badges & Sync & Install */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Real-time Connectivity Badge */}
          {isOnline ? (
            <div
              id="online-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#16A34A]/20 text-emerald-300 border border-[#16A34A]/40 shadow-xs"
              title="Dispositivo conectado a internet"
            >
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span className="hidden xs:inline text-xs">🟢 En Línea</span>
              <span className="xs:hidden text-[11px]">En Línea</span>
            </div>
          ) : (
            <div
              id="offline-status-badge"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EA580C]/25 text-orange-300 border border-[#EA580C]/50 shadow-xs animate-pulse"
              title="Dispositivo trabajando sin conexión"
            >
              <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
              <span className="hidden xs:inline text-xs">🟠 Sin Conexión</span>
              <span className="xs:hidden text-[11px]">Offline</span>
            </div>
          )}

          {/* Pending Reports Counter Badge */}
          {pendingCount > 0 && (
            <button
              id="pending-reports-header-btn"
              onClick={onSync}
              disabled={!isOnline || isSyncing}
              title={
                isOnline
                  ? 'Tocar para sincronizar reportes pendientes'
                  : 'Reportes guardados localmente. Se sincronizarán al recuperar señal.'
              }
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-xs ${
                isOnline
                  ? 'bg-amber-400 text-[#0F3863] hover:bg-amber-300 active:scale-95 cursor-pointer'
                  : 'bg-orange-500/30 text-orange-200 border border-orange-400/40 cursor-default'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              <span>{pendingCount}</span>
              <span className="hidden sm:inline">pend.</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton compact={true} />
        </div>
      </div>
    </header>
  );
};
