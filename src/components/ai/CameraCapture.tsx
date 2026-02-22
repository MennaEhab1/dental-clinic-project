import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCapturedImage(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions or use the upload option.');
      setIsStreaming(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);

    // Stop stream after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  }, []);

  const confirmCapture = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `dental-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, capturedImage);
      }
    }, 'image/jpeg', 0.9);
  }, [capturedImage, onCapture]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="relative rounded-xl overflow-hidden border border-border bg-muted"
    >
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="p-4 rounded-2xl bg-destructive/10">
            <Video className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startCamera}>
              Try Again
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            {capturedImage ? (
              <motion.img
                key="captured"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={capturedImage}
                alt="Captured dental image"
                className="w-full h-64 object-contain"
              />
            ) : (
              <motion.video
                key="stream"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-3">
              {capturedImage ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retake}
                    className="bg-background/90 backdrop-blur-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    size="sm"
                    onClick={confirmCapture}
                    className="gradient-bg border-0"
                  >
                    Use Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm"
                    onClick={toggleCamera}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-12 w-12 rounded-full gradient-bg border-0 shadow-elevated"
                    onClick={capturePhoto}
                    disabled={!isStreaming}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
