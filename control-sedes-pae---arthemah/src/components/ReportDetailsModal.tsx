import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Calendar, User, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Report } from '../types';

interface ReportDetailsModalProps {
  report: Report | null;
  onClose: () => void;
}

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ report, onClose }) => {
  const [zoom, setZoom] = useState<number>(1);

  if (!report) return null;

  const dateFormatted = new Date(report.createdAt).toLocaleString('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-[20px] shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-[#0F3863] text-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#CCFBF1] uppercase tracking-wider">
              Auditoría de Planilla Digital
            </span>
            <h3 className="text-base sm:text-lg font-bold truncate leading-tight">
              {report.sedeName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[10px] text-[#475569] font-semibold uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#2563EB]" /> Fecha de Reporte
              </span>
              <p className="text-xs font-bold text-[#0F172A] mt-1 capitalize">{dateFormatted}</p>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[10px] text-[#475569] font-semibold uppercase flex items-center gap-1">
                <User className="w-3 h-3 text-[#0D9488]" /> Manipuladora
              </span>
              <p className="text-xs font-bold text-[#0F172A] mt-1">{report.manipuladoraName}</p>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <span className="text-[10px] text-[#475569] font-semibold uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#EA580C]" /> Estado Sincronización
              </span>
              <div className="mt-1">
                {report.syncStatus === 'SYNCED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> 🟢 Firebase Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#EA580C] bg-orange-100 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> 🟠 Pendiente Sincronizar
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Arthemah AI Visual Audit & Authenticity Banner */}
          <div className="bg-gradient-to-r from-[#0F3863]/5 to-[#0D9488]/10 p-3.5 rounded-xl border border-[#0D9488]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F3863] flex items-center gap-1.5">
                <span>🤖 Arthemah Visión & AI</span>
                <span className="text-[10px] bg-[#CCFBF1] text-[#0F3863] font-mono px-2 py-0.5 rounded-md border border-[#0D9488]/30">
                  {report.aiModel || 'google/gemini-2.5-flash'}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#0D9488]">Auditoría Visual PAE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-medium">
                <span>🏛️</span>
                <span>Sello Institucional Válido</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-medium">
                <span>✍️</span>
                <span>Firmas Verificadas en Planilla</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-emerald-200 text-emerald-800 font-medium">
                <span>📑</span>
                <span>Planilla Oficial Auténtica</span>
              </div>
            </div>
          </div>

          {/* Rations breakdown if available */}
          {report.rations && (
            <div className="bg-[#CCFBF1]/30 p-3.5 rounded-xl border border-[#0D9488]/30">
              <h4 className="text-xs font-bold text-[#0F3863] uppercase mb-2">
                Conteo de Raciones Reportadas:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-[#0D9488]/20">
                  <span className="text-[10px] text-[#475569] block">Desayunos</span>
                  <strong className="text-sm text-[#0F3863]">{report.rations.desayunos || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#0D9488]/20">
                  <span className="text-[10px] text-[#475569] block">Almuerzos</span>
                  <strong className="text-sm text-[#0F3863]">{report.rations.almuerzos || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#0D9488]/20">
                  <span className="text-[10px] text-[#475569] block">Refrigerios</span>
                  <strong className="text-sm text-[#0F3863]">{report.rations.refrigerios || 0}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#0D9488]/20">
                  <span className="text-[10px] text-[#475569] block">Faltantes</span>
                  <strong className="text-sm text-[#DC2626]">{report.rations.faltantes || 0}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Notes & AI Transcription */}
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#0F3863] uppercase tracking-wider mb-1.5">
              Notas y Transcripción de Planilla:
            </h4>
            <div className="text-xs text-[#0F172A] whitespace-pre-wrap leading-relaxed font-mono bg-white p-3 rounded-lg border border-[#E2E8F0] max-h-48 overflow-y-auto">
              {report.notes || 'Sin observaciones registradas.'}
            </div>
          </div>

          {/* Scanned Planilla Photo Viewer with Zoom for signature audit */}
          {report.photoBase64 ? (
            <div className="border border-[#CBD5E1] rounded-xl overflow-hidden bg-neutral-950">
              <div className="bg-neutral-900 px-3 py-2 flex items-center justify-between text-xs text-white">
                <span className="font-semibold text-slate-300">
                  Auditoría Visual de Firma y Sellos (Filtro: {report.filterApplied})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
                    className="p-1 rounded hover:bg-white/20 text-white"
                    title="Alejar"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    className="p-1 rounded hover:bg-white/20 text-white"
                    title="Acercar"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="p-1 rounded hover:bg-white/20 text-white ml-1"
                    title="Restablecer Zoom"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[420px] p-2 flex items-center justify-center bg-neutral-900/60">
                <img
                  src={report.photoBase64}
                  alt="Planilla auditada"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                  className="transition-transform duration-150 max-w-full h-auto rounded shadow-lg"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-[#475569]">
              Este reporte fue registrado sin captura de imagen.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[12px] bg-[#0F3863] text-white font-semibold text-sm hover:bg-[#0A2342] transition"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};
