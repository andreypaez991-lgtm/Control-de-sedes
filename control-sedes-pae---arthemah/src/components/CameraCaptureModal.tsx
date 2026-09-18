import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setIsInitializing(true);
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara no está soportada en este navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCamera(true);
    } catch (err: unknown) {
      console.warn('Could not start camera:', err);
      // Try fallback without ideal resolution constraints
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setHasCamera(true);
      } catch (fallbackErr: unknown) {
        setHasCamera(false);
        setErrorMessage(
          'No se pudo acceder a la cámara. Por favor concede permisos de cámara o usa el botón "Cargar Imagen".'
        );
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopStream();
    onCapture(dataUrl);
    onClose();
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-black rounded-[20px] overflow-hidden flex flex-col shadow-2xl border border-slate-800 h-[88vh] max-h-[720px]">
        {/* Top Control Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2 text-white text-xs font-semibold tracking-wide bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Camera className="w-4 h-4 text-[#2DD4BF]" />
            <span>Encuadra la Planilla PAE</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchCamera}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition"
              title="Cambiar Cámara"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport with Document Framing Guides */}
        <div className="relative flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden">
          {errorMessage ? (
            <div className="p-6 text-center text-white max-w-sm">
              <AlertCircle className="w-12 h-12 text-[#EA580C] mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200 mb-4">{errorMessage}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 bg-[#0F3863] text-white rounded-xl text-xs font-semibold hover:bg-blue-900"
              >
                Reintentar Acceso a Cámara
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Document Alignment Frame */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-[#2DD4BF] -mt-1 -ml-1 rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-[#2DD4BF] -mt-1 -mr-1 rounded-tr-sm" />
                </div>
                <div className="text-center">
                  <span className="bg-black/60 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-xs font-medium">
                    Alinea los bordes de la hoja dentro de la guía
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-[#2DD4BF] -mb-1 -ml-1 rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-[#2DD4BF] -mb-1 -mr-1 rounded-br-sm" />
                </div>
              </div>
            </>
          )}

          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2DD4BF]" />
            </div>
          )}
        </div>

        {/* Bottom Shutter Controls */}
        <div className="p-5 bg-black flex items-center justify-center gap-6 z-20">
          <button
            onClick={handleCapture}
            disabled={!hasCamera || isInitializing}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition disabled:opacity-50 hover:bg-white/30"
            title="Capturar Foto"
          >
            <div className="w-14 h-14 rounded-full bg-[#0D9488] border-2 border-white flex items-center justify-center shadow-lg">
              <Camera className="w-7 h-7 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
