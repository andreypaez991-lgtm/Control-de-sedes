import React, { useState } from 'react';
import { Download, Share, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions modal
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-btn"
        onClick={handleInstallClick}
        disabled={installing}
        title="Instalar App en el dispositivo"
        className={`flex items-center gap-2 rounded-[12px] transition-all font-medium active:scale-95 ${
          compact
            ? 'px-3 py-1.5 text-xs bg-[#CCFBF1] text-[#0F3863] hover:bg-[#99F6E4] border border-[#0D9488]/30 shadow-sm'
            : 'px-4 py-2 text-sm bg-gradient-to-r from-[#0D9488] to-[#0F3863] text-white hover:opacity-95 shadow-md min-h-[44px]'
        }`}
      >
        <Download className="w-4 h-4 text-white shrink-0" />
        <span className="whitespace-nowrap">Instalar App</span>
      </button>

      {/* Guide Modal for iOS Safari / Unsupported prompt */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 shadow-2xl border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0F3863] flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A] text-base leading-tight">Instalar en tu Celular</h3>
                  <p className="text-xs text-[#475569]">Para uso 100% offline</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm text-[#0F172A]">
              <div className="flex items-start gap-3 bg-[#F1F5F9] p-3 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#0F3863] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">En Safari o Chrome móvil:</p>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Toca el botón <span className="font-semibold text-[#2563EB]">Compartir</span> <Share className="inline w-3.5 h-3.5" /> (en iPhone) o los <span className="font-semibold text-[#2563EB]">tres puntos (⋮)</span> (en Android).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#F1F5F9] p-3 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-[#0D9488] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Agregar a pantalla de inicio:</p>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Desliza hacia abajo y pulsa <strong className="text-[#0F172A]">"Agregar a pantalla de inicio"</strong> o <strong className="text-[#0F172A]">"Instalar aplicación"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#16A34A] bg-[#DCFCE7] p-2.5 rounded-xl">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>La app abrirá en pantalla completa y funcionará sin internet en todo momento.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-[12px] bg-[#0F3863] py-3 text-sm font-semibold text-white hover:bg-[#0A2342] shadow-sm transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
