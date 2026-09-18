import React, { useState, useEffect } from 'react';
import {
  School,
  UserCheck,
  ArrowRight,
  Shield,
  Lock,
  Edit2,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { Sede } from '../types';
import { storage } from '../lib/storage';
import { AdminPinModal } from '../components/AdminPinModal';

interface LoginScreenProps {
  onSelectSede: (sede: Sede, currentManipuladora: string) => void;
  onOpenAdmin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSelectSede, onOpenAdmin }) => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<number | ''>('');
  const [manipuladoraName, setManipuladoraName] = useState<string>('');
  const [isEditingManipuladora, setIsEditingManipuladora] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>('2281');

  useEffect(() => {
    const rawActive = storage.getActiveSedes();
    const active = Array.from(new Map(rawActive.map((s) => [s.id, s])).values());
    setSedes(active);
    setAdminPin(storage.getConfig().adminPin || '2281');

    if (active.length > 0) {
      setSelectedSedeId(active[0].id);
      setManipuladoraName(active[0].manipuladoraName);
    }

    const handleUpdate = () => {
      const rawUpdated = storage.getActiveSedes();
      const updated = Array.from(new Map(rawUpdated.map((s) => [s.id, s])).values());
      setSedes(updated);
      setAdminPin(storage.getConfig().adminPin || '2281');
    };

    window.addEventListener('arthemah:data-updated', handleUpdate);
    return () => window.removeEventListener('arthemah:data-updated', handleUpdate);
  }, []);

  const handleSedeChange = (sedeId: number) => {
    setSelectedSedeId(sedeId);
    const found = sedes.find((s) => s.id === sedeId);
    if (found) {
      setManipuladoraName(found.manipuladoraName);
      setIsEditingManipuladora(false);
    }
  };

  const handleEnterSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSedeId) return;
    const found = sedes.find((s) => s.id === selectedSedeId);
    if (found) {
      onSelectSede(found, manipuladoraName || found.manipuladoraName);
    }
  };

  const selectedSede = sedes.find((s) => s.id === selectedSedeId);

  return (
    <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-4 py-6 sm:py-10">
      {/* Welcome & Card */}
      <div className="w-full bg-white rounded-[20px] border border-[#E2E8F0] shadow-xl p-5 sm:p-7">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F3863] text-[#CCFBF1] mb-3 shadow-md border-2 border-[#2563EB]/30">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A2342] tracking-tight">
            Ingreso a Sede Operativa
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] mt-1 max-w-xs mx-auto">
            Selecciona la institución educativa para registrar las planillas diarias del PAE
          </p>
        </div>

        <form onSubmit={handleEnterSede} className="space-y-5">
          {/* Sede Selector */}
          <div>
            <label className="block text-xs font-bold text-[#0F3863] uppercase tracking-wider mb-2">
              Sede Educativa Activa:
            </label>
            {sedes.length > 0 ? (
              <div className="space-y-2">
                <select
                  id="sede-selector-dropdown"
                  value={selectedSedeId}
                  onChange={(e) => handleSedeChange(Number(e.target.value))}
                  className="w-full min-h-[48px] px-3.5 py-3 rounded-[12px] border-2 border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] font-semibold text-sm focus:border-[#2563EB] focus:bg-white focus:outline-hidden transition shadow-xs"
                >
                  {sedes.map((sede) => (
                    <option key={`sede-opt-${sede.id}`} value={sede.id}>
                      {sede.name}
                    </option>
                  ))}
                </select>

                {/* Visual Cards of Sedes for quick touch selection */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {sedes.map((sede) => {
                    const isSelected = sede.id === selectedSedeId;
                    return (
                      <div
                        key={`sede-card-${sede.id}`}
                        onClick={() => handleSedeChange(sede.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#CCFBF1]/30 shadow-xs'
                            : 'border-[#E2E8F0] bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-[#0F3863] text-white'
                                : 'bg-slate-100 text-[#475569]'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-[#0F172A]">
                              {sede.name}
                            </p>
                            <p className="text-[11px] text-[#475569]">
                              Manipuladora: {sede.manipuladoraName}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#EA580C]">
                No hay sedes activas registradas. Usa el acceso administrador para crear una sede.
              </div>
            )}
          </div>

          {/* Manipuladora Name (Editable if shift change) */}
          {selectedSede && (
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#0F3863] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0D9488]" />
                  <span>Manipuladora Asignada:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingManipuladora(!isEditingManipuladora)}
                  className="text-[11px] text-[#2563EB] font-semibold hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingManipuladora ? 'Fijar' : 'Cambio de Turno'}</span>
                </button>
              </div>

              {isEditingManipuladora ? (
                <div>
                  <input
                    id="manipuladora-input-edit"
                    type="text"
                    value={manipuladoraName}
                    onChange={(e) => setManipuladoraName(e.target.value)}
                    placeholder="Nombre completo de la manipuladora"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[10px] border-2 border-[#2563EB] bg-white text-sm font-semibold text-[#0F172A] focus:outline-hidden"
                  />
                  <p className="text-[10px] text-[#475569] mt-1">
                    Modifica el nombre si hoy cubre una manipuladora sustituta.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1">
                  <span className="font-bold text-sm text-[#0F172A]">{manipuladoraName}</span>
                  <span className="text-[10px] bg-[#CCFBF1] text-[#0F3863] px-2 py-0.5 rounded-full font-bold">
                    Turno Actual
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Large Navy Blue Action Button */}
          <button
            id="enter-sede-btn"
            type="submit"
            disabled={!selectedSedeId || sedes.length === 0}
            className="w-full flex items-center justify-center gap-2 min-h-[50px] px-6 py-3.5 rounded-[12px] bg-[#0F3863] text-white font-bold text-base hover:bg-[#0A2342] active:scale-98 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Ingresar a Sede</span>
            <ArrowRight className="w-5 h-5 text-[#CCFBF1]" />
          </button>
        </form>
      </div>

      {/* Footer with Administrator Access button */}
      <footer className="w-full mt-8 text-center">
        <button
          id="admin-access-btn"
          type="button"
          onClick={() => setIsAdminModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-white border border-[#CBD5E1] text-xs sm:text-sm font-bold text-[#0F3863] hover:bg-slate-50 hover:border-[#2563EB] active:scale-95 transition shadow-sm"
        >
          <Lock className="w-4 h-4 text-[#0F3863]" />
          <span>Acceso Administrador (Auditoría / Sedes)</span>
          <Shield className="w-3.5 h-3.5 text-[#0D9488]" />
        </button>
        <p className="text-[11px] text-[#475569] mt-3 font-medium">
          Control Sedes PAE • Operado por Arthemah • 100% Offline
        </p>
      </footer>

      {/* Admin PIN Dialog */}
      <AdminPinModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          setIsAdminModalOpen(false);
          onOpenAdmin();
        }}
        expectedPin={adminPin}
      />
    </div>
  );
};
