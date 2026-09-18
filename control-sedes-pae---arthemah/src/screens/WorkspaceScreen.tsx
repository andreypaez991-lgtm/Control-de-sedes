import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Wifi,
  WifiOff,
  LogOut,
  Check,
  PenLine,
  ScanLine,
  Camera,
  Image as ImageIcon,
  Sparkles,
  CloudUpload,
  History,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Sede, Report, FilterType, RationsBreakdown, AuditDetails } from '../types';
import { storage } from '../lib/storage';
import { processImage } from '../lib/imageProcessing';
import { transcribeWithArthemahVision, VisionAuditResult } from '../lib/visionService';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { ReportDetailsModal } from '../components/ReportDetailsModal';

interface WorkspaceScreenProps {
  sede: Sede;
  manipuladoraName: string;
  isOnline: boolean;
  onBackToLogin: () => void;
}

function formatReportDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month} • ${hoursStr}:${minutes} ${ampm}`;
}

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  sede,
  manipuladoraName,
  isOnline,
  onBackToLogin,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Scanner states
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('magic_color');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.15);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);

  // Submit states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);
  const [inspectedReport, setInspectedReport] = useState<Report | null>(null);

  // Arthemah AI Vision state
  const [lastAuditResult, setLastAuditResult] = useState<VisionAuditResult | null>(null);
  const [lastExtractedRations, setLastExtractedRations] = useState<RationsBreakdown | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => storage.getOfflineVisionQueue().length);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rawImgRef = useRef<HTMLImageElement | null>(null);

  const loadSedeReports = () => {
    const rawList = storage.getReports(sede.id);
    const uniqueList = Array.from(new Map(rawList.map((r) => [r.id, r])).values());
    setReports(uniqueList);
    setOfflineQueueCount(storage.getOfflineVisionQueue().length);
  };

  useEffect(() => {
    loadSedeReports();
    const handleUpdate = () => {
      loadSedeReports();
    };
    const handleVisionSynced = (e: Event) => {
      loadSedeReports();
      const customEvt = e as CustomEvent;
      const count = customEvt.detail?.count || 1;
      setToastMessage({
        text: `✨ ${count} planilla(s) transcrita(s) con Arthemah y sincronizada(s) con Firebase`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 5000);
    };

    window.addEventListener('arthemah:data-updated', handleUpdate);
    window.addEventListener('arthemah:vision-synced', handleVisionSynced);
    return () => {
      window.removeEventListener('arthemah:data-updated', handleUpdate);
      window.removeEventListener('arthemah:vision-synced', handleVisionSynced);
    };
  }, [sede.id]);

  // Apply filters whenever image, filter, brightness, or contrast changes
  const applyFilters = useCallback(async () => {
    if (!rawImgRef.current) return;
    setIsProcessing(true);
    try {
      const result = await processImage(rawImgRef.current, {
        filter: currentFilter,
        brightness,
        contrast,
      });
      setProcessedImage(result);
    } catch (err) {
      console.error('Error applying filter:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [currentFilter, brightness, contrast]);

  useEffect(() => {
    if (originalImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        rawImgRef.current = img;
        applyFilters();
      };
      img.src = originalImage;
    } else {
      rawImgRef.current = null;
      setProcessedImage(null);
    }
  }, [originalImage, applyFilters]);

  // Handle image upload from gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setOriginalImage(base64);
      setAiFeedback(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle capture from Camera modal
  const handleCameraCapture = (capturedBase64: string) => {
    setOriginalImage(capturedBase64);
    setIsCameraOpen(false);
    setAiFeedback(null);
  };

  // Load sample demo document for instant testing
  const loadDemoPlanilla = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 750, 1000);

    // Header border
    ctx.fillStyle = '#0F3863';
    ctx.fillRect(30, 30, 690, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('PROGRAMA DE ALIMENTACIÓN ESCOLAR (PAE)', 50, 65);
    ctx.font = '16px sans-serif';
    ctx.fillText('CONTROL DIARIO DE RACIONES Y MINUTA - ARTHEMAH', 50, 95);

    // Metadata lines
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`INSTITUCIÓN: ${sede.name.toUpperCase()}`, 40, 150);
    ctx.fillText(`MANIPULADORA: ${(manipuladoraName || sede.manipuladoraName).toUpperCase()}`, 40, 180);
    ctx.fillText(`FECHA: 16 DE SEPTIEMBRE DE 2026`, 40, 210);

    // Table outline
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 240, 670, 320);

    // Table rows
    const rows = [
      ['RACIÓN / TIEMPO', 'PROGRAMADO', 'RACIONADO', 'ESTADO'],
      ['☕ DESAYUNOS', '140', '140', 'COMPLETO'],
      ['🍲 ALMUERZOS', '280', '280', 'COMPLETO'],
      ['🥪 REFRIGERIOS', '140', '138', '2 FALTANTES'],
      ['🌡️ TEMP. TRANSPORTE', '68°C', 'ALIMENTOS CALIENTES', 'CONFORME'],
    ];

    rows.forEach((row, idx) => {
      const y = 240 + idx * 64;
      if (idx === 0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(40, 240, 670, 64);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
      } else {
        ctx.fillStyle = '#334155';
        ctx.font = '14px sans-serif';
      }
      ctx.fillText(row[0], 55, y + 40);
      ctx.fillText(row[1], 260, y + 40);
      ctx.fillText(row[2], 420, y + 40);
      ctx.fillText(row[3], 560, y + 40);
      ctx.strokeRect(40, y, 670, 64);
    });

    // Notes area
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('OBSERVACIONES DE LA JORNADA:', 40, 600);
    ctx.font = 'italic 15px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Se recibieron 280 raciones de almuerzo caliente en óptimas condiciones de inocuidad.', 40, 630);
    ctx.fillText('Control de temperatura verificado a las 11:30 a.m. Menú completo y aceptado.', 40, 660);

    // Official Stamp
    ctx.save();
    ctx.translate(560, 780);
    ctx.rotate(-0.1);
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 3;
    ctx.strokeRect(-110, -35, 220, 70);
    ctx.fillStyle = '#0D9488';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('PAE ARTHEMAH', -75, -5);
    ctx.fillText('SEDE AUDITADA', -75, 18);
    ctx.restore();

    // Signature
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(120, 830);
    ctx.bezierCurveTo(160, 790, 200, 850, 260, 810);
    ctx.bezierCurveTo(280, 780, 310, 840, 340, 820);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Firma y Cédula de Manipuladora Responsable', 100, 860);

    const demoBase64 = canvas.toDataURL('image/jpeg', 0.88);
    setOriginalImage(demoBase64);
    setAiFeedback(null);
  };

  // Transcribe with Arthemah Vision AI and autofill Card 1
  const handleTranscribeWithAI = async () => {
    if (!processedImage && !originalImage) return;
    const targetImage = processedImage || originalImage;
    if (!targetImage) return;

    // Offline behavior as requested:
    // "Si no hay internet: La aplicación guarda la imagen localmente en la memoria del teléfono y avisa a la manipuladora:
    // 'Foto guardada en el dispositivo. La transcripción con IA de Arthemah se procesará automáticamente al recuperar la señal.'"
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      storage.queueOfflineVision({
        photoBase64: targetImage,
        sedeId: sede.id,
        sedeName: sede.name,
        manipuladoraName: manipuladoraName || sede.manipuladoraName,
        filterApplied: currentFilter,
      });
      setOfflineQueueCount(storage.getOfflineVisionQueue().length);
      const offlineMsg =
        'Foto guardada en el dispositivo. La transcripción con IA de Arthemah se procesará automáticamente al recuperar la señal.';
      setAiFeedback(offlineMsg);
      setToastMessage({
        text: offlineMsg,
        type: 'warn',
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    setIsTranscribing(true);
    setAiFeedback(null);

    try {
      const response = await transcribeWithArthemahVision(targetImage, sede.name);

      if (response.success && response.reply) {
        const replyText = response.reply;
        // 3. Autocompletado del reporte: pasa todo el texto leído directamente al formulario del reporte
        setNotes((prev) => {
          if (prev.trim()) {
            return `${prev}\n\n${replyText}`;
          }
          return replyText;
        });

        // Store visual audit & rations breakdown
        if (response.audit) {
          setLastAuditResult(response.audit);
        }
        if (response.extractedRations) {
          setLastExtractedRations(response.extractedRations);
        }

        setAiFeedback(
          '✨ Transcripción y Auditoría Visual completada. Planilla oficial PAE validada con sellos y firmas.'
        );
      } else if (response.isOffline) {
        storage.queueOfflineVision({
          photoBase64: targetImage,
          sedeId: sede.id,
          sedeName: sede.name,
          manipuladoraName: manipuladoraName || sede.manipuladoraName,
          filterApplied: currentFilter,
        });
        setOfflineQueueCount(storage.getOfflineVisionQueue().length);
        setAiFeedback(
          'Foto guardada en el dispositivo. La transcripción con IA de Arthemah se procesará automáticamente al recuperar la señal.'
        );
      } else {
        setAiFeedback(response.error || 'No se pudo transcribir el texto.');
      }
    } catch (err) {
      console.error('Vision AI error:', err);
      setAiFeedback('Error al procesar la imagen con IA.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Submit report to platform
  const handleSaveReport = async () => {
    if (!notes.trim() && !processedImage && !originalImage) {
      setToastMessage({
        text: 'Por favor escribe una nota o toma una foto antes de subir.',
        type: 'warn',
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSaving(true);
    try {
      const syncStatus = isOnline ? 'SYNCED' : 'PENDING';
      const imageToSave = processedImage || originalImage || null;

      await storage.saveReport({
        sedeId: sede.id,
        sedeName: sede.name,
        manipuladoraName: manipuladoraName || sede.manipuladoraName,
        notes: notes.trim() || 'Reporte de jornada y planilla verificada.',
        filterApplied: currentFilter,
        photoBase64: imageToSave,
        syncStatus,
        transcriptionByAI: !!lastAuditResult || !!lastExtractedRations,
        auditDetails: lastAuditResult || undefined,
        rations: lastExtractedRations || undefined,
        aiModel: 'google/gemini-2.5-flash',
      });

      // Clear current form inputs
      setNotes('');
      setOriginalImage(null);
      setProcessedImage(null);
      setAiFeedback(null);
      setLastAuditResult(null);
      setLastExtractedRations(null);

      loadSedeReports();

      setToastMessage({
        text: isOnline
          ? '✅ Reporte subido y sincronizado con Firebase (miapp-app).'
          : '🟠 Reporte guardado en el teléfono. Se sincronizará automáticamente al recuperar internet.',
        type: 'success',
      });

      setTimeout(() => {
        setToastMessage(null);
      }, 4500);
    } catch (err) {
      console.error('Error saving report:', err);
      setToastMessage({ text: 'Error al subir el reporte a la plataforma.', type: 'warn' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[#F1F5F9] pb-16">
      {/* Top Header Bar matching Screenshot */}
      <div className="bg-transparent pt-3 pb-2 px-4 max-w-md sm:max-w-lg mx-auto w-full">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Sede Name & Manipuladora */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F2942] tracking-tight leading-tight">
              {sede.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-medium">
              <User className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Manipuladora: {manipuladoraName || sede.manipuladoraName}</span>
            </div>
          </div>

          {/* Right: Connectivity status & Desfichar button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Firebase Status Badge */}
            <div
              className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0F3863] border border-blue-200"
              title="Base de Datos en tiempo real de Firebase Firestore conectada"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]"></span>
              <span>🔥 Firebase</span>
            </div>

            {/* Online / Offline Pill */}
            {isOnline ? (
              <div
                id="workspace-status-badge"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]"
                title="Dispositivo conectado y sincronizado con Firebase"
              >
                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                <span className="text-[11px] sm:text-xs">En línea</span>
                <Wifi className="w-3.5 h-3.5 text-[#15803D]" />
              </div>
            ) : (
              <div
                id="workspace-status-badge"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-[#EA580C]"
                title="Trabajando sin conexión: fotos y reportes guardados en memoria local"
              >
                <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse"></span>
                <span className="text-[11px] sm:text-xs">Sin conexión</span>
                <WifiOff className="w-3.5 h-3.5 text-[#EA580C]" />
              </div>
            )}

            {/* Desfichar button */}
            <button
              id="desfichar-btn"
              onClick={onBackToLogin}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-red-200 text-[#DC2626] hover:bg-red-50 active:scale-95 transition shadow-xs"
              title="Cerrar turno en esta sede"
            >
              <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Desfichar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md sm:max-w-lg mx-auto w-full px-4 space-y-4">
        {/* Banner: "Sede Fichada Actualmente" matching Screenshot */}
        <div className="flex items-center gap-3 py-2 px-1">
          <div className="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0 border border-emerald-200/60">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="leading-snug">
            <h2 className="text-sm sm:text-base font-bold text-[#15803D]">
              Sede Fichada Actualmente
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Otras sedes ocultas. Reportando como{' '}
              <span className="text-slate-800 font-semibold">
                {manipuladoraName || sede.manipuladoraName}
              </span>
            </p>
          </div>
        </div>

        {/* Card 1: "🖊️ 1. Escribir Reporte Manual" */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-[#0F2942]" />
            <h3 className="font-bold text-sm sm:text-base text-[#0F2942]">
              1. Escribir Reporte Manual
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Anota novedades, minuta servida, control de temperaturas, cantidades recibidas o incidentes de la jornada.
          </p>

          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3 focus-within:border-[#2563EB] focus-within:bg-white transition">
            <textarea
              id="manual-report-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe aquí las observaciones del día, temperaturas, menús o novedades..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Card 2: "📷 2. Escáner Inteligente (Tipo CamScanner)" */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#0D9488]" />
            <h3 className="font-bold text-sm sm:text-base text-[#0F2942]">
              2. Escáner Inteligente (Tipo CamScanner)
            </h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Enfoca automáticamente fotos borrosas de celulares con cámaras desenfocadas, blanquea el fondo y aclara el texto.
          </p>

          {/* Action Buttons: Cámara & Galería */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              id="camera-btn"
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#0F3863] hover:bg-[#0A2540] text-white font-semibold text-xs sm:text-sm active:scale-98 transition shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Cámara</span>
            </button>

            <button
              id="gallery-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F3863] font-semibold text-xs sm:text-sm active:scale-98 transition shadow-xs"
            >
              <ImageIcon className="w-4 h-4 text-[#0F3863]" />
              <span>Galería</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Sample Document Button */}
          <button
            id="sample-doc-btn"
            type="button"
            onClick={loadDemoPlanilla}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-teal-50/50 border border-slate-200 text-[#0D9488] font-semibold text-xs sm:text-sm active:scale-98 transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#0D9488]" />
            <span>Probar con Documento de Muestra</span>
          </button>

          {/* If image is present: show CamScanner preview, filters, and AI transcription button */}
          {originalImage && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {/* Document Preview Box */}
              <div className="relative rounded-xl overflow-hidden bg-neutral-900 border border-slate-300 flex items-center justify-center max-h-[300px]">
                {processedImage ? (
                  <img
                    src={processedImage}
                    alt="Planilla escaneada procesada"
                    className="w-full h-auto max-h-[300px] object-contain"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2DD4BF]" />
                    <p className="text-xs">Aplicando filtro CamScanner...</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-xs">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#2DD4BF]" />
                    <span>Mejorando...</span>
                  </div>
                )}

                {/* Remove / Change button */}
                <button
                  onClick={() => {
                    setOriginalImage(null);
                    setProcessedImage(null);
                    setAiFeedback(null);
                  }}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                  <span>Quitar foto</span>
                </button>
              </div>

              {/* 4 CamScanner Filters */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filtro CamScanner:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentFilter('magic_color')}
                    className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition ${
                      currentFilter === 'magic_color'
                        ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-1 ring-[#0D9488]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✨ Realce Color
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentFilter('bw_sharp')}
                    className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition ${
                      currentFilter === 'bw_sharp'
                        ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-1 ring-[#0D9488]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    📄 B/N Nítido
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentFilter('grayscale')}
                    className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition ${
                      currentFilter === 'grayscale'
                        ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-1 ring-[#0D9488]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ◽ Escala Grises
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentFilter('original')}
                    className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition ${
                      currentFilter === 'original'
                        ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-1 ring-[#0D9488]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🖼️ Original
                  </button>
                </div>
              </div>

              {/* Adjustments toggle (Brightness & Contrast) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdjustments(!showAdjustments)}
                  className="text-[11px] text-slate-500 font-medium hover:text-[#0F3863] flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>{showAdjustments ? 'Ocultar ajustes manuales' : 'Ajustar brillo y contraste'}</span>
                </button>

                {showAdjustments && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Brillo</span>
                        <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-40"
                        max="40"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-[#0D9488]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Contraste</span>
                        <span>{contrast.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.8"
                        step="0.05"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-[#0D9488]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* AI Transcription Button */}
              <button
                type="button"
                onClick={handleTranscribeWithAI}
                disabled={isTranscribing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0F3863] to-[#0D9488] text-white font-semibold text-xs sm:text-sm hover:opacity-95 active:scale-98 transition shadow-xs disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#CCFBF1]" />
                    <span>Transcribiendo planilla con IA...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-[#CCFBF1]" />
                    <span>Transcribir con IA (Arthemah Visión)</span>
                  </>
                )}
              </button>

              {/* AI Feedback Banner */}
              {aiFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    aiFeedback.includes('✨')
                      ? 'bg-[#DCFCE7] text-[#15803D] border border-emerald-200'
                      : 'bg-amber-50 text-[#EA580C] border border-amber-200'
                  }`}
                >
                  {aiFeedback.includes('✨') ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#EA580C]" />
                  )}
                  <span>{aiFeedback}</span>
                </div>
              )}

              {/* 1. Auditoría visual de planillas físicas & 2. Transcripción inteligente */}
              {(lastAuditResult || lastExtractedRations) && (
                <div className="bg-[#F8FAFC] border border-[#0D9488]/30 rounded-xl p-3 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F3863] flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Auditoría Arthemah IA</span>
                    </span>
                    <span className="text-[10px] bg-[#CCFBF1] text-[#0F3863] font-mono px-2 py-0.5 rounded-md font-bold">
                      Planilla Verificada
                    </span>
                  </div>

                  {/* 1. Verificación de sellos y firmas */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-white border border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-medium">
                      <span>🏛️</span>
                      <span>Sello institucional detectado</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-emerald-200 flex items-center gap-1.5 text-emerald-800 font-medium">
                      <span>✍️</span>
                      <span>Firmas verificadas</span>
                    </div>
                  </div>

                  {/* 2. Desglose de raciones extraídas */}
                  {lastExtractedRations && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Raciones Extraídas Automáticamente:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">🥣 Desayunos</span>
                          <strong className="text-slate-800 font-bold">{lastExtractedRations.desayunos}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">🍲 Almuerzos</span>
                          <strong className="text-slate-800 font-bold">{lastExtractedRations.almuerzos}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">🥪 Refrig.</span>
                          <strong className="text-slate-800 font-bold">{lastExtractedRations.refrigerios}</strong>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">⚠️ Falt.</span>
                          <strong className="text-red-600 font-bold">{lastExtractedRations.faltantes}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Autocompletado del reporte indicator */}
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg flex items-center gap-1.5 font-medium border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Reporte manual autocompletado en el recuadro superior.</span>
                  </div>
                </div>
              )}

              {/* Offline Queue Notification banner */}
              {offlineQueueCount > 0 && (
                <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="font-medium">
                    {offlineQueueCount} foto(s) en cola offline. Se transcribirán con Arthemah y subirán a Firebase en cuanto vuelva la conexión.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button: "☁️ Subir Reporte a Plataforma" */}
        <button
          id="upload-report-platform-btn"
          type="button"
          onClick={handleSaveReport}
          disabled={isSaving}
          className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-[#0F3863] hover:bg-[#0A2540] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Subiendo Reporte a Plataforma...</span>
            </>
          ) : (
            <>
              <CloudUpload className="w-5 h-5 text-white" />
              <span>Subir Reporte a Plataforma</span>
            </>
          )}
        </button>

        {/* Feedback Toast */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs ${
              toastMessage.type === 'success'
                ? 'bg-[#DCFCE7] text-[#15803D] border border-emerald-300'
                : 'bg-amber-50 text-[#EA580C] border border-amber-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#EA580C]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Section: "🕒 Reportes de Esta Sede (X)" matching Screenshot 2 */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#0F2942]">
            <History className="w-4 h-4 text-[#0F2942]" />
            <h3>Reportes de Esta Sede ({reports.length})</h3>
          </div>

          <div className="space-y-3">
            {reports.map((report, idx) => {
              const dateFormatted = formatReportDate(report.createdAt);
              const filterLabel =
                report.filterApplied === 'magic_color'
                  ? '✨ Realce Color'
                  : report.filterApplied === 'bw_sharp'
                  ? '📄 B/N Nítido'
                  : report.filterApplied === 'grayscale'
                  ? '◽ Escala Grises'
                  : '🖼️ Original';

              return (
                <div
                  key={`ws-report-${report.id}-${idx}`}
                  onClick={() => setInspectedReport(report)}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm space-y-2.5 hover:border-slate-300 transition cursor-pointer"
                >
                  {/* Top row: Date & Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A]">
                      {dateFormatted}
                    </span>
                    {report.syncStatus === 'SYNCED' ? (
                      <span className="text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Enviado</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold bg-orange-100 text-[#EA580C] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Pendiente</span>
                      </span>
                    )}
                  </div>

                  {/* Body row: Thumbnail + Text */}
                  <div className="flex items-start gap-3">
                    {report.photoBase64 ? (
                      <img
                        src={report.photoBase64}
                        alt="Planilla escaneada"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-slate-700 font-normal line-clamp-3 leading-relaxed">
                      {report.notes}
                    </p>
                  </div>

                  {/* Bottom tag: Documento escaneado */}
                  {report.photoBase64 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D9488] pt-0.5">
                      <Camera className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Documento escaneado ({filterLabel})</span>
                    </div>
                  )}
                </div>
              );
            })}

            {reports.length === 0 && (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
                <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Aún no hay reportes subidos para esta sede hoy.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Inspect Report Modal */}
      {inspectedReport && (
        <ReportDetailsModal
          report={inspectedReport}
          onClose={() => setInspectedReport(null)}
        />
      )}
    </div>
  );
};
