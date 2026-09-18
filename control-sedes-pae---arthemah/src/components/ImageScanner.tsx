import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Sun,
  SlidersHorizontal,
  Bot,
  RefreshCw,
  FileCheck2,
  Maximize2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { FilterType, RationsBreakdown } from '../types';
import { processImage } from '../lib/imageProcessing';
import { transcribeWithArthemahVision } from '../lib/visionService';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ImageScannerProps {
  sedeName: string;
  isOnline: boolean;
  onTranscriptionComplete: (text: string, rations?: RationsBreakdown) => void;
  onProcessedImageChange: (imageBase64: string | null, filter: FilterType) => void;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({
  sedeName,
  isOnline,
  onTranscriptionComplete,
  onProcessedImageChange,
}) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('magic_color');
  const [brightness, setBrightness] = useState<number>(0); // -50 to +50
  const [contrast, setContrast] = useState<number>(1.15); // 0.8 to 1.8
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rawImgRef = useRef<HTMLImageElement | null>(null);

  // Apply filters whenever original image, filter type, brightness, or contrast change
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
      onProcessedImageChange(result, currentFilter);
    } catch (err) {
      console.error('Error applying filters:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [currentFilter, brightness, contrast, onProcessedImageChange]);

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
      setProcessedImage(null);
      onProcessedImageChange(null, currentFilter);
    }
  }, [originalImage, applyFilters, currentFilter, onProcessedImageChange]);

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setOriginalImage(base64);
      setAiMessage(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Generate demo PAE planilla for testing
  const loadDemoPlanilla = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper background with warm subtle noise
    ctx.fillStyle = '#FBF9F4';
    ctx.fillRect(0, 0, 1200, 1600);

    // Subtle table folds / shadow
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(0, 750, 1200, 4);

    // Header border
    ctx.strokeStyle = '#0F3863';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 60, 1100, 1480);

    // Title box
    ctx.fillStyle = '#0F3863';
    ctx.fillRect(50, 60, 1100, 120);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PROGRAMA DE ALIMENTACIÓN ESCOLAR - PAE', 600, 115);
    ctx.font = '22px sans-serif';
    ctx.fillText('PLANILLA DIARIA DE CONTROL Y ENTREGA DE RACIONES', 600, 155);

    // Sede info
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`SEDE: ${sedeName.toUpperCase()}`, 80, 240);

    ctx.font = 'normal 22px sans-serif';
    const today = new Date().toLocaleDateString('es-CO');
    ctx.fillText(`Fecha: ${today}   |   Turno: Mañana y Tarde`, 80, 280);
    ctx.fillText(`Operador: Consorcio Nutricional Arthemah`, 80, 320);

    // Table Header
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(80, 360, 1040, 55);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 360, 1040, 55);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('COMPONENTE / RACIÓN', 100, 395);
    ctx.fillText('PROGRAMADO', 480, 395);
    ctx.fillText('ENTREGADO', 690, 395);
    ctx.fillText('NOVEDAD / FALTANTE', 870, 395);

    // Table Rows
    const rows = [
      { comp: '1. Desayunos Escolares', prog: '70', ent: '68', falt: '2 (Ausencia médica)' },
      { comp: '2. Almuerzos Completos', prog: '125', ent: '125', falt: '0 (100% raciones)' },
      { comp: '3. Refrigerios Tarde', prog: '120', ent: '118', falt: '2 (Retiro temprano)' },
      { comp: '4. Control Temperatura', prog: '3°C - 5°C', ent: '3.8°C (Lácteos y carnes)', falt: 'Conforme' },
      { comp: '5. Calidad Frutas y Verduras', prog: 'Fresco', ent: '100% óptimo estado', falt: 'Aprobado' },
    ];

    rows.forEach((r, idx) => {
      const y = 415 + idx * 60;
      ctx.strokeRect(80, y, 1040, 60);
      ctx.font = 'bold 19px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(r.comp, 100, y + 38);

      ctx.font = 'normal 20px sans-serif';
      ctx.fillText(r.prog, 510, y + 38);
      ctx.fillText(r.ent, 710, y + 38);
      ctx.fillText(r.falt, 880, y + 38);
    });

    // Notes Section
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(80, 750, 1040, 240);
    ctx.strokeRect(80, 750, 1040, 240);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('OBSERVACIONES DE LA MANIPULADORA:', 100, 790);

    ctx.font = 'italic 20px serif';
    ctx.fillStyle = '#1E3A8A'; // Blue ballpoint ink simulation
    ctx.fillText('Se recibe remisión completa a las 6:30 AM sin anomalías.', 100, 835);
    ctx.fillText('Materia prima limpia y desinfectada. Menú cumplió con la minuta estipulada.', 100, 875);
    ctx.fillText('El Comité de Alimentación Escolar (CAE) aprobó la calidad del servicio.', 100, 915);
    ctx.fillText('Firma y constancia entregada a rectoría.', 100, 955);

    // Blue Signature
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 1200);
    ctx.bezierCurveTo(240, 1140, 270, 1250, 340, 1170);
    ctx.bezierCurveTo(370, 1120, 390, 1220, 430, 1180);
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Firma Manipuladora Asignada', 180, 1230);
    ctx.fillText('C.C. 1.098.432.190', 180, 1255);

    // Red Official PAE Stamp
    ctx.save();
    ctx.translate(850, 1200);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 4;
    ctx.strokeRect(-120, -60, 240, 120);
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARTHEMAH PAE', 0, -25);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('VERIFICADO EN SITIO', 0, 0);
    ctx.font = 'normal 13px sans-serif';
    ctx.fillText(`APROBADO ${today}`, 0, 24);
    ctx.fillText('SEDE CONFORME', 0, 44);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setOriginalImage(dataUrl);
    setAiMessage('Planilla de prueba cargada con éxito. Aplica filtros o pulsa "Transcribir con IA".');
  };

  // AI Transcription Call
  const handleTranscribeWithAI = async () => {
    const targetImage = processedImage || originalImage;
    if (!targetImage) {
      setAiMessage('Primero toma o carga una foto de la planilla.');
      return;
    }

    setIsTranscribing(true);
    setAiMessage(null);

    try {
      const response = await transcribeWithArthemahVision(targetImage, sedeName);

      if (response.success && response.reply) {
        onTranscriptionComplete(response.reply, response.extractedRations);
        setAiMessage('✨ Transcripción exitosa. Notas y raciones autocompletadas en el reporte.');
      } else if (response.isOffline) {
        setAiMessage(response.error || 'Dispositivo sin conexión a internet.');
      } else {
        setAiMessage(response.error || 'No se pudo transcribir la imagen.');
      }
    } catch (err: unknown) {
      console.error('Vision transcription error:', err);
      setAiMessage('Ocurrió un error al procesar la imagen con IA.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm overflow-hidden mb-6">
      {/* Module Title Bar */}
      <div className="bg-gradient-to-r from-[#0F3863] to-[#0A2342] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#CCFBF1]" />
          <h2 className="font-bold text-sm sm:text-base">Módulo de Escáner de Planillas</h2>
        </div>
        <span className="text-[11px] bg-white/15 text-[#CCFBF1] px-2.5 py-0.5 rounded-full font-medium">
          Filtros CamScanner
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Action Buttons: Tomar Foto & Cargar Imagen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            id="take-photo-btn"
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center justify-center gap-2.5 min-h-[48px] px-4 py-3 rounded-[12px] bg-[#0F3863] text-white font-semibold text-sm hover:bg-[#0A2342] active:scale-95 transition shadow-sm"
          >
            <Camera className="w-5 h-5 text-[#CCFBF1]" />
            <span>📷 Tomar Foto Planilla</span>
          </button>

          <button
            id="upload-photo-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 min-h-[48px] px-4 py-3 rounded-[12px] bg-slate-100 text-[#0F3863] border border-[#CBD5E1] font-semibold text-sm hover:bg-slate-200 active:scale-95 transition shadow-xs"
          >
            <Upload className="w-5 h-5 text-[#0F3863]" />
            <span>🖼️ Cargar Imagen</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Demo Planilla Button helper for instant testing */}
        {!originalImage && (
          <div className="bg-[#CCFBF1]/40 border border-[#0D9488]/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#0F3863]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0D9488] shrink-0" />
              <span>¿No tienes una planilla física a la mano? Carga un acta oficial de muestra para probar los filtros y la IA:</span>
            </div>
            <button
              onClick={loadDemoPlanilla}
              className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white font-semibold hover:bg-teal-700 active:scale-95 transition shrink-0 self-start sm:self-auto"
            >
              Cargar Planilla Demo
            </button>
          </div>
        )}

        {/* Image Preview & Real-time Canvas Area */}
        {originalImage ? (
          <div className="space-y-4 pt-1">
            {/* Visor de previsualización */}
            <div className="relative rounded-xl overflow-hidden bg-neutral-900 border border-[#CBD5E1] shadow-inner flex items-center justify-center min-h-[260px] max-h-[440px]">
              {processedImage ? (
                <img
                  src={processedImage}
                  alt="Planilla escaneada procesada"
                  className="w-full h-auto max-h-[440px] object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2DD4BF]" />
                  <p className="text-xs">Procesando imagen con Canvas...</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#2DD4BF]" />
                  <span>Aplicando filtro...</span>
                </div>
              )}

              {/* Reset or Change image button */}
              <button
                onClick={() => setOriginalImage(null)}
                className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-xs transition"
              >
                Cambiar Imagen
              </button>
            </div>

            {/* Selector de 4 Filtros de Procesamiento */}
            <div>
              <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">
                Filtros de Procesamiento (Estilo CamScanner):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentFilter('magic_color')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                    currentFilter === 'magic_color'
                      ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base mb-0.5">✨</span>
                  <span>1. Realce Color</span>
                  <span className="text-[9px] text-[#0D9488] font-normal mt-0.5">Sellos y firmas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFilter('bw_sharp')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                    currentFilter === 'bw_sharp'
                      ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base mb-0.5">📄</span>
                  <span>2. B/N Nítido</span>
                  <span className="text-[9px] text-[#475569] font-normal mt-0.5">Alto contraste</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFilter('grayscale')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                    currentFilter === 'grayscale'
                      ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base mb-0.5">◽</span>
                  <span>3. Escala Grises</span>
                  <span className="text-[9px] text-[#475569] font-normal mt-0.5">Nivelado suave</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentFilter('original')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                    currentFilter === 'original'
                      ? 'bg-[#CCFBF1] text-[#0F3863] border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base mb-0.5">🖼️</span>
                  <span>4. Original</span>
                  <span className="text-[9px] text-[#475569] font-normal mt-0.5">Sin procesar</span>
                </button>
              </div>
            </div>

            {/* Deslizadores de Ajuste Fino: Brillo (-50 a +50) y Contraste (0.8x a 1.8x) */}
            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0F3863]">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Brillo: {brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(0);
                    setContrast(1.15);
                  }}
                  className="text-[11px] text-[#2563EB] hover:underline"
                >
                  Restablecer
                </button>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="2"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="w-full accent-[#0F3863] cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs font-semibold text-[#0F3863] pt-1">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#0D9488]" />
                  <span>Contraste: {contrast.toFixed(2)}x</span>
                </div>
                <span className="text-[10px] text-[#475569]">0.8x – 1.8x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.8"
                step="0.05"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full accent-[#0D9488] cursor-pointer"
              />
            </div>

            {/* Botón con icono de IA: "🤖 Transcribir con IA (Arthemah Visión)" */}
            <div className="pt-1">
              <button
                id="transcribe-ai-btn"
                type="button"
                onClick={handleTranscribeWithAI}
                disabled={isTranscribing}
                className="w-full flex items-center justify-center gap-2.5 min-h-[50px] px-5 py-3 rounded-[12px] bg-gradient-to-r from-[#2563EB] via-[#0F3863] to-[#0A2342] text-white font-bold text-sm sm:text-base hover:opacity-95 active:scale-98 transition shadow-md disabled:opacity-60"
              >
                {isTranscribing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-[#CCFBF1]" />
                    <span>Transcribiendo Planilla con IA...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 text-[#CCFBF1]" />
                    <span>🤖 Transcribir con IA (Arthemah Visión)</span>
                  </>
                )}
              </button>

              {aiMessage && (
                <div
                  className={`mt-2.5 p-3 rounded-xl text-xs flex items-start gap-2 ${
                    aiMessage.includes('exitosa')
                      ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                      : aiMessage.includes('conexión')
                      ? 'bg-amber-50 text-[#EA580C] border border-amber-200'
                      : 'bg-blue-50 text-[#0F3863] border border-blue-200'
                  }`}
                >
                  {aiMessage.includes('exitosa') ? (
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#16A34A]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  )}
                  <span className="leading-relaxed">{aiMessage}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-8 text-center bg-[#F8FAFC] hover:bg-slate-100 cursor-pointer transition flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 text-[#0F3863] flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0F172A]">Ninguna foto de planilla cargada aún</p>
            <p className="text-xs text-[#475569] mt-1 max-w-xs">
              Toca <strong>"Tomar Foto Planilla"</strong> con la cámara o selecciona una imagen desde la galería de tu teléfono.
            </p>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => {
          setOriginalImage(dataUrl);
          setAiMessage(null);
        }}
      />
    </div>
  );
};
