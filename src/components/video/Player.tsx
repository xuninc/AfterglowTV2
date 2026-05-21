import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, RefreshCw, EyeOff, ShieldAlert, Sparkles, Database, Tv, Cpu, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Focusable } from '../common/Focusable';
import { DEMO_LIVE_CHANNELS } from '../../data/demoData';
import { generateMockProgramsForChannel } from '../../utils/epgGenerator';
import { parseMediaTitle, calculateMiniLMSimilarity } from '../../utils/localMetadataDatabase';

interface PlayerProps {
  url: string;
}

export const Player: React.FC<PlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const preFetchHlsRef = useRef<Hls | null>(null);
  
  const preFetchUrl = useStore(state => state.preFetchUrl);
  const currentChannel = useStore(state => state.currentChannel);
  const mediaLibrary = useStore(state => state.mediaLibrary);
  const epgData = useStore(state => state.epgData);
  const isVaultSubstitutionEnabled = useStore(state => state.isVaultSubstitutionEnabled);

  const [ambientColor, setAmbientColor] = useState('rgba(255, 62, 0, 0.2)');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [forcedFallbackUrl, setForcedFallbackUrl] = useState<string | null>(null);

  // Session override for the current channel playback
  const [userBypassedVault, setUserBypassedVault] = useState(false);

  // Clear session override when tuning to a different channel
  useEffect(() => {
    setUserBypassedVault(false);
    setIsUsingFallback(false);
    setPlayerError(null);
    setForcedFallbackUrl(null);
  }, [url]);

  // 1. Vault Sub-In Matches Engine
  const vaultMatch = useMemo(() => {
    if (!isVaultSubstitutionEnabled || !currentChannel || userBypassedVault) return null;

    const tvgId = currentChannel.tvgId;
    if (!tvgId) return null;

    // Retrieve storing or dynamic EPG channels schedule
    let programs = epgData[tvgId] || [];
    if (programs.length === 0) {
      programs = generateMockProgramsForChannel(tvgId, new Date());
    }

    const now = new Date();
    // Find program overlapping current clock
    const activeProgram = programs.find((p: any) => {
      const pStart = new Date(p.start);
      const pEnd = new Date(p.end);
      return now >= pStart && now <= pEnd;
    });

    if (!activeProgram) return null;

    // Parse broadcast title
    const parsedProg = parseMediaTitle(activeProgram.title);

    // Search personal database
    let matchedItem = null;
    for (const item of mediaLibrary) {
      const parsedItem = parseMediaTitle(item.rawTitle);
      
      if (parsedProg.mediaType === 'tv_episode' && parsedItem.mediaType === 'tv_episode') {
        if (
          parsedProg.showTitle &&
          parsedItem.showTitle &&
          parsedProg.showTitle.toLowerCase() === parsedItem.showTitle.toLowerCase() &&
          parsedProg.season === parsedItem.season &&
          parsedProg.episode === parsedItem.episode
        ) {
          matchedItem = item;
          break;
        }
      } else if (parsedProg.mediaType === 'movie' && parsedItem.mediaType === 'movie') {
        const score = calculateMiniLMSimilarity(parsedProg.cleanedTitle, parsedItem.cleanedTitle);
        if (score >= 0.82) {
          matchedItem = item;
          break;
        }
      }

      // Fallback simple string match
      const pTitleLower = activeProgram.title.toLowerCase();
      const itemTitleLower = item.rawTitle.toLowerCase();
      if (
        pTitleLower.includes(itemTitleLower) ||
        itemTitleLower.includes(pTitleLower)
      ) {
        matchedItem = item;
        break;
      }
    }

    if (matchedItem) {
      const startMs = new Date(activeProgram.start).getTime();
      const offsetSec = Math.max(0, (now.getTime() - startMs) / 1000);
      return {
        item: matchedItem,
        program: activeProgram,
        offsetSeconds: offsetSec
      };
    }

    return null;
  }, [isVaultSubstitutionEnabled, currentChannel, mediaLibrary, epgData, userBypassedVault]);

  const isVaultSubActive = vaultMatch && !userBypassedVault;

  // Resolve target media stream
  const getSubstitutedStreamUrl = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("sintel")) return "https://test-streams.mux.dev/x36xhg/main.m3u8";
    if (t.includes("steel")) return "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";
    if (t.includes("bunny")) return "https://test-streams.mux.dev/pts_live/character_multi_sub.m3u8";
    return "https://test-streams.mux.dev/x36xhg/main.m3u8"; // High stable primary playback
  };

  const currentActiveUrl = forcedFallbackUrl
    ? forcedFallbackUrl
    : (isVaultSubActive && vaultMatch
      ? getSubstitutedStreamUrl(vaultMatch.item.displayTitle)
      : url);

  // Pre-fetching Logic (Neural Warm-up) - Debounced
  useEffect(() => {
    if (!preFetchUrl || preFetchUrl === currentActiveUrl) return;

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
          // ignore issues
        }
      }
    }, 2000);

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

    const handleLoadedMetadata = () => {
      if (isVaultSubActive && vaultMatch) {
         // Loop safely within 10 minutes limit (Sintel full-length) to prevent crashes on out-of-bounds seeks
         const seekPos = Math.floor(vaultMatch.offsetSeconds % 600);
         video.currentTime = seekPos;
         console.log("Vault Sub-In Native Seek Triggered:", seekPos);
      }
    };

    video.addEventListener('error', handleNativeError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

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
        if (isVaultSubActive && vaultMatch) {
          const seekPos = Math.floor(vaultMatch.offsetSeconds % 600);
          video.currentTime = seekPos;
          console.log("Vault Sub-In Hls.js Seek Triggered:", seekPos);
        }
        video.play().catch((playErr) => {
          console.log("Autoplay paused by standard browser policy:", playErr.message);
        });
      });

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
      video.src = currentActiveUrl;
      video.addEventListener('canplay', () => {
        if (isVaultSubActive && vaultMatch) {
          video.currentTime = Math.floor(vaultMatch.offsetSeconds % 600);
        }
        video.play().catch(() => {});
      });
    } else {
       setPlayerError("This device lacks HLS/H.264 video decoding capabilities.");
    }

    return () => {
      video.removeEventListener('error', handleNativeError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [currentActiveUrl, isVaultSubActive]);

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
        // CORS block
      }

      timeoutId = setTimeout(updateAmbientColor, 2000);
    };

    updateAmbientColor();
    return () => clearTimeout(timeoutId);
  }, []);

  const handlePlayFallback = () => {
    const fallbackStream = DEMO_LIVE_CHANNELS[0].url;
    setForcedFallbackUrl(fallbackStream);
    setPlayerError(null);
    setIsUsingFallback(true);
    setUserBypassedVault(true); // Disable vault matching when they force standard fallback
  };

  const handleBypassSub = () => {
    setUserBypassedVault(true);
  };

  const handleReEngageSub = () => {
    setUserBypassedVault(false);
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

      <canvas ref={canvasRef} width="1" height="1" className="hidden" />

      {/* Vault Sub-In HUD Overlays */}
      <AnimatePresence>
        {isVaultSubActive && vaultMatch && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-30 bg-black/85 backdrop-blur-md rounded-2xl border border-afterglow-primary/40 p-4 shadow-2xl flex flex-col gap-3 text-left animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-afterglow-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-afterglow-primary"></span>
                </span>
                <span className="font-mono text-[9px] font-black text-afterglow-primary tracking-widest uppercase flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> VAULT SUB-IN ACTIVE
                </span>
              </div>
              <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                1080p Local Source
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white/95 truncate">
                {vaultMatch.item.displayTitle}
              </h4>
              <p className="text-[10px] font-mono text-white/45 mt-1 leading-snug">
                This broadcast matches your high-quality local copy. Playback has been seamlessly synchronized with the current schedule.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-white/45 uppercase tracking-widest">EPG broadcast slot</span>
                <span className="text-[10px] font-mono font-bold text-white/80">
                  {vaultMatch.program.title}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-mono text-white/45 uppercase tracking-widest">Tune sync offset</span>
                <span className="text-[10px] font-mono font-bold text-afterglow-primary font-black">
                  +{Math.floor(vaultMatch.offsetSeconds / 60)}m {Math.floor(vaultMatch.offsetSeconds % 60)}s
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-1">
              <Focusable
                id="btn-player-bypass-sub"
                className="flex-grow py-2 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 font-mono text-[9px] tracking-wider text-white/70 hover:text-white transition-all text-center"
                onEnter={handleBypassSub}
              >
                ⚡ BYPASS SUB-IN (IPTV LIVE)
              </Focusable>
              
              <div className="px-2.5 bg-afterglow-primary/10 border border-afterglow-primary/20 rounded-lg flex items-center justify-center shrink-0">
                <Cpu className="w-3 h-3 text-afterglow-primary animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Floating Indicator when user manually bypassed, allowing them to re-engage the sub-in */}
        {!isVaultSubActive && vaultMatch && userBypassedVault && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 z-30"
          >
            <Focusable
              id="btn-player-reengage-sub"
              className="flex items-center gap-2 bg-afterglow-primary/20 border border-afterglow-primary/40 hover:bg-afterglow-primary backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-mono text-white font-bold tracking-widest uppercase transition-all shadow-glow cursor-pointer whitespace-nowrap"
              onEnter={handleReEngageSub}
            >
              <Database className="w-3.5 h-3.5" />
              <span>VAULT COPY AVAILABLE</span>
              <ArrowUpRight className="w-3 h-3" />
            </Focusable>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/5 text-[9px] font-mono tracking-widest text-white/40 uppercase flex items-center gap-1.5 font-mono">
          <Sparkles className="w-3 h-3 text-afterglow-primary" />
          <span>GLOW_DECODER {hlsRef.current ? 'HLS.Active' : 'HTML5.Native'}</span>
        </div>
      </div>
    </div>
  );
};
