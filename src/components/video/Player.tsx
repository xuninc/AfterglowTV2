import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCw, EyeOff, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Focusable } from '../common/Focusable';
import { DEMO_LIVE_CHANNELS } from '../../data/demoData';

interface PlayerProps {
  url: string;
}

export const Player: React.FC<PlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const preFetchHlsRef = useRef<Hls | null>(null);
  const preFetchUrl = useStore(state => state.preFetchUrl);
  
  const [ambientColor, setAmbientColor] = useState('rgba(255, 62, 0, 0.2)');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentActiveUrl, setCurrentActiveUrl] = useState(url);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Sync state with prop url
  useEffect(() => {
    setCurrentActiveUrl(url);
    setPlayerError(null);
    setIsUsingFallback(false);
  }, [url]);

  // Pre-fetching Logic (Neural Warm-up) - Debounced
  useEffect(() => {
    if (!preFetchUrl || preFetchUrl === currentActiveUrl) return;

    // Neural delay: Only warm up if user dwells on the channel for 2 seconds
    const timer = setTimeout(() => {
      if (Hls.isSupported()) {
        if (preFetchHlsRef.current) {
          preFetchHlsRef.current.destroy();
        }
        
        try {
          const preHls = new Hls({
            capLevelToPlayerSize: true,
            startLevel: 0,
          });
          preHls.loadSource(preFetchUrl);
          preFetchHlsRef.current = preHls;
          console.log("Neural Warm-up FINALIZED for:", preFetchUrl);
        } catch (e) {
          // ignore pre-render issues
        }
      }
    }, 2000); // 2s Dwell time required

    return () => clearTimeout(timer);
  }, [preFetchUrl, currentActiveUrl]);

  // Main stream loader loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentActiveUrl) return;

    let hlsInstance: Hls | null = null;
    setPlayerError(null);

    // native media error handlers
    const handleNativeError = () => {
      console.warn("HTML5 native video tag reported playback load error");
      setPlayerError("Media stream format issue or browser sandbox blocking stream.");
    };

    video.addEventListener('error', handleNativeError);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 45,
        maxBufferLength: 10,
      });

      hlsInstance.loadSource(currentActiveUrl);
      hlsInstance.attachMedia(video);
      hlsRef.current = hlsInstance;

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((playErr) => {
          console.log("Autoplay paused by standard browser policy:", playErr.message);
        });
      });

      // Catch high-frequency stream & CORS connection errors
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("Fatal HLS playback block:", data.type, "Details:", data.details);
          setPlayerError(`Network CORS limit / Stream offline: ${data.details}`);
          
          if (hlsInstance) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hlsInstance.recoverMediaError();
                break;
              default:
                break;
            }
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Direct load for Safari/iOS
      video.src = currentActiveUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    } else {
       setPlayerError("This device lacks HLS/H.264 video decoding capabilities.");
    }

    return () => {
      video.removeEventListener('error', handleNativeError);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [currentActiveUrl]);

  // Ambient Lighting color glow sampler
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let timeoutId: NodeJS.Timeout;

    const updateAmbientColor = () => {
      if (video.paused || video.ended || !ctx || document.hidden) {
        timeoutId = setTimeout(updateAmbientColor, 1200);
        return;
      }

      try {
        ctx.drawImage(video, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const [r, g, b] = data;
        
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty('--afterglow-dynamic-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
          setAmbientColor(`rgba(${r}, ${g}, ${b}, 0.25)`);
        });
      } catch (e) {
        // Cross Origin (CORS) blocks drawing of some external m3u feeds
      }

      timeoutId = setTimeout(updateAmbientColor, 2000); // 2s sample rate matches smart TV processors
    };

    updateAmbientColor();
    return () => clearTimeout(timeoutId);
  }, []);

  // Set guaranteed back up stream (Sintel HLS)
  const handlePlayFallback = () => {
    const fallbackStream = DEMO_LIVE_CHANNELS[0].url; // Sintel Cinema Stable URL
    setCurrentActiveUrl(fallbackStream);
    setPlayerError(null);
    setIsUsingFallback(true);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      
      {/* Background Glow */}
      <div 
        className="absolute inset-0 transition-colors duration-1000 blur-[100px] opacity-70 pointer-events-none"
        style={{ backgroundColor: ambientColor }}
      />
      
      <video
        ref={videoRef}
        className="relative z-10 w-full h-full object-contain"
        playsInline
        controls
      />

      {/* Hidden canvas for color sampling */}
      <canvas ref={canvasRef} width="1" height="1" className="hidden" />

      {/* Error / CORS Sandbox Warning Overlay */}
      {playerError && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center select-none">
          <ShieldAlert className="w-12 h-12 text-afterglow-primary mb-3 animate-bounce" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-white/90">DECODER SIGNAL BLOCKED</h3>
          <p className="text-[11px] font-mono text-white/40 max-w-sm mt-1.5 leading-relaxed">
            {playerError}
          </p>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-[9.5px] font-mono text-white/30 max-w-md mt-4">
            Most commercial IPTV links restrict access strictly to their own apps via CORS. Press below to bypass and play our secure fallback stream.
          </div>

          <div className="flex gap-4 mt-6">
            <Focusable 
              id="btn-player-fallback"
              className="afterglow-gradient px-5 py-2.5 rounded-xl font-mono text-[10px] tracking-widest font-black uppercase shadow-glow text-white text-center"
              onEnter={handlePlayFallback}
            >
              ENGAGE FALLBACK SIGNAL
            </Focusable>
          </div>
        </div>
      )}

      {/* Experimental UI Header/Osd */}
      <div className="absolute top-4 left-4 z-20 flex flex-col pointer-events-none">
        {isUsingFallback && (
          <div className="px-3 py-1.5 bg-afterglow-primary/20 backdrop-blur-md rounded-lg border border-afterglow-primary/45 text-[9px] font-mono text-afterglow-primary tracking-widest uppercase">
            SECURE FALLBACK TUNNEL ENGAGED
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex gap-2 pointer-events-none">
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/5 text-[9px] font-mono tracking-widest text-white/40 uppercase">
          GLOW_DECODER {hlsRef.current ? 'HLS.Active' : 'HTML5.Native'}
        </div>
      </div>
    </div>
  );
};
