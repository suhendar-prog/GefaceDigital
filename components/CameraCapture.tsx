import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, ZoomIn, ZoomOut, Loader2, ScanLine } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label: string;
  facingMode?: 'user' | 'environment';
  isProcessing?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label, facingMode = 'user', isProcessing = false }) => {
  const webcamRef = useRef<Webcam>(null);
  const [currentFacingMode, setFacingMode] = useState<'user' | 'environment'>(facingMode);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Zoom State
  const [zoom, setZoom] = useState<number>(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number, max: number, step: number } | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Pinch State
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);

  const handleUserMedia = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    
    videoTrackRef.current = track;

    // Check for zoom capabilities
    const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
    
    // @ts-ignore: Accessing zoom capability
    if ('zoom' in capabilities) {
      // @ts-ignore: Accessing zoom capability
      const { min, max, step } = capabilities.zoom;
      setZoomCapabilities({ min, max, step });
      
      const settings = track.getSettings();
      // @ts-ignore: Accessing zoom setting
      const currentZoom = settings.zoom || min;
      setZoom(currentZoom);
    } else {
      setZoomCapabilities(null);
    }
  }, []);

  const applyZoom = (value: number) => {
    if (!videoTrackRef.current || !zoomCapabilities) return;
    
    const newZoom = Math.min(Math.max(value, zoomCapabilities.min), zoomCapabilities.max);
    setZoom(newZoom);

    try {
      videoTrackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom } as any]
      });
    } catch (e) {
      console.error("Failed to apply zoom", e);
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoom(parseFloat(e.target.value));
  };

  // Pinch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      pinchStartDist.current = dist;
      pinchStartZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null && zoomCapabilities) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      
      const delta = dist - pinchStartDist.current;
      // Define sensitivity: 300px screen pinch = full zoom range
      const range = zoomCapabilities.max - zoomCapabilities.min;
      const sensitivity = range / 300; 
      
      applyZoom(pinchStartZoom.current + (delta * sensitivity));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDist.current = null;
  };

  const capture = useCallback(() => {
    if (isProcessing) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture, isProcessing]);

  const toggleCamera = () => {
    if (isProcessing) return;

    // Haptic Feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Visual Feedback
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 300);

    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setZoomCapabilities(null);
    setZoom(1);
    videoTrackRef.current = null;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      <div 
        className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          onUserMedia={handleUserMedia}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: currentFacingMode,
            width: 720,
            height: 960 
          }}
          className="w-full h-full object-cover"
        />
        
        {/* Flash Overlay for Flip Feedback */}
        <div 
          className={`absolute inset-0 bg-white z-20 pointer-events-none transition-opacity duration-300 ease-out ${isFlipping ? 'opacity-50' : 'opacity-0'}`} 
        />
        
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
            {/* Scanning Line Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
               <div className="w-full h-1 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            </div>
            
            <div className="bg-white/90 p-4 rounded-2xl flex flex-col items-center shadow-xl transform scale-110">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <span className="text-sm font-bold text-indigo-900">AI Analyzing...</span>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        {!isProcessing && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col gap-3">
            
            {/* Zoom Slider */}
            {zoomCapabilities && (
              <div className="flex items-center space-x-2 px-2">
                <ZoomOut size={16} className="text-white/80" />
                <input 
                  type="range"
                  min={zoomCapabilities.min}
                  max={zoomCapabilities.max}
                  step={zoomCapabilities.step}
                  value={zoom}
                  onChange={handleZoomChange}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
                <ZoomIn size={16} className="text-white/80" />
              </div>
            )}

            <div className="flex justify-end">
               <button 
                onClick={toggleCamera} 
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
              >
                <RefreshCw size={20} className={`transition-transform duration-500 ${isFlipping ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={capture}
        disabled={isProcessing}
        className={`flex items-center justify-center space-x-2 w-full py-4 rounded-xl font-semibold shadow-md transition-all transform ${
          isProcessing 
            ? 'bg-slate-400 text-white cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white active:scale-95'
        }`}
      >
        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
        <span>{isProcessing ? 'Processing...' : label}</span>
      </button>

      {/* Add Custom Keyframe for Scan Animation */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CameraCapture;