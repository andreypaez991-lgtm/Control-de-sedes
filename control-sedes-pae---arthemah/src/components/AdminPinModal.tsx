import React, { useState } from 'react';
import { ShieldCheck, X, Delete, Lock } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expectedPin: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expectedPin,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === expectedPin) {
        setTimeout(() => {
          setPin('');
          onSuccess();
        }, 150);
      } else {
        setTimeout(() => {
          setError(true);
          // Haptic vibration if supported
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(200);
          }
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xs sm:max-w-sm rounded-[20px] bg-white p-6 shadow-2xl border border-[#E2E8F0] flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-2">
          <span className="text-xs font-bold text-[#475569] uppercase tracking-wider">
            Seguridad Arthemah
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#0F3863] text-[#CCFBF1] flex items-center justify-center shadow-lg my-2 border-2 border-[#2563EB]/40">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-[#0A2342] text-center">Acceso Administrador</h2>
        <p className="text-xs text-[#475569] text-center mt-1">
          Ingresa el PIN de 4 dígitos para gestionar sedes y auditar reportes
        </p>

        {/* PIN Indicators */}
        <div className={`flex items-center gap-3 my-5 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  error
                    ? 'bg-[#DC2626] scale-110'
                    : isFilled
                    ? 'bg-[#0F3863] scale-110 shadow-sm'
                    : 'bg-[#E2E8F0] border-2 border-[#CBD5E1]'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-[#DC2626] font-semibold -mt-2 mb-3 animate-pulse">
            PIN incorrecto. Intenta de nuevo.
          </p>
        )}

        <p className="text-[11px] text-[#475569] bg-slate-100 px-3 py-1 rounded-full mb-4">
          PIN por defecto: <strong className="text-[#0F3863]">2281</strong>
        </p>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-[12px] bg-[#F1F5F9] text-xl font-bold text-[#0F172A] hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition flex items-center justify-center shadow-xs"
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-[12px] bg-slate-100 text-xs font-bold text-[#475569] hover:bg-slate-200 active:scale-95 transition flex items-center justify-center uppercase tracking-wide"
          >
            Borrar
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-[12px] bg-[#F1F5F9] text-xl font-bold text-[#0F172A] hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-[12px] bg-slate-100 text-[#475569] hover:bg-slate-200 active:scale-95 transition flex items-center justify-center"
            title="Borrar último dígito"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
