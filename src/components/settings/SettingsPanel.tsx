import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, Settings, AlertTriangle, ShieldCheck, Sparkles, Clock, Key, CreditCard } from 'lucide-react';
import { Focusable } from '../common/Focusable';
import { useStore } from '../../store/useStore';
import axios from 'axios';
import { parseEPG } from '../../lib/epgParser';

export const SettingsPanel: React.FC = () => {
  const playlists = useStore(state => state.playlists);
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const epgData = useStore(state => state.epgData);
  const setCurrentPlaylist = useStore(state => state.setCurrentPlaylist);
  const removePlaylist = useStore(state => state.removePlaylist);
  const resetAll = useStore(state => state.resetAll);
  const updatePlaylistEpgUrl = useStore(state => state.updatePlaylistEpgUrl);

  const isTitleCleaningEnabled = useStore(state => state.isTitleCleaningEnabled);
  const isMarqueeEnabled = useStore(state => state.isMarqueeEnabled);
  const isBackgroundEnrichmentEnabled = useStore(state => state.isBackgroundEnrichmentEnabled);
  const setTitleCleaningEnabled = useStore(state => state.setTitleCleaningEnabled);
  const setMarqueeEnabled = useStore(state => state.setMarqueeEnabled);
  const setBackgroundEnrichmentEnabled = useStore(state => state.setBackgroundEnrichmentEnabled);

  // Premium / Trial hooks
  const isPremium = useStore(state => state.isPremium);
  const trialStartDate = useStore(state => state.trialStartDate);
  const buyPremium = useStore(state => state.buyPremium);
  const resetTrial = useStore(state => state.resetTrial);
  const setTrialStartDate = useStore(state => state.setTrialStartDate);

  // Quick state to add a simple M3U link in Settings
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  // Counting total EPG caches
  const totalEpgCount = Object.keys(epgData).length;
  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);

  // Compute trial status
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffTime = Math.max(0, now.getTime() - start.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 15 - diffDays);

  // EPG configuration manager state
  const [customEpgUrl, setCustomEpgUrl] = useState(currentPlaylist?.epgUrl || '');
  const [syncingEpg, setSyncingEpg] = useState(false);
  const [epgFeedback, setEpgFeedback] = useState('');

  // Keep epg input field in sync with the current active playlist selection
  useEffect(() => {
    setCustomEpgUrl(currentPlaylist?.epgUrl || '');
    setEpgFeedback('');
  }, [currentPlaylistId, currentPlaylist]);

  const handleAddPlaylist = () => {
    if (!newUrl) return;
    useStore.getState().addPlaylist({
      id: crypto.randomUUID(),
      name: newName || "Config Link",
      url: newUrl,
      channels: [
        { name: `${newName || "Config"} Stream 1`, url: newUrl, group: "External" }
      ]
    });
    setNewUrl('');
    setNewName('');
    setSyncMsg("Playlist linked successfully!");
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const handleSyncEpg = async () => {
    if (!currentPlaylist) {
      setEpgFeedback("Select an active playlist first.");
      return;
    }
    setSyncingEpg(true);
    setEpgFeedback("Connecting to endpoint and downloading feeds...");
    try {
      // 1. Save the updated EPG URL locally and persistently in the playlist store
      updatePlaylistEpgUrl(currentPlaylist.id, customEpgUrl);
      
      if (!customEpgUrl) {
        setEpgFeedback("EPG URL removed. Clean cache by clearing all data.");
        setSyncingEpg(false);
        return;
      }

      const response = await axios.get(`/api/epg?url=${encodeURIComponent(customEpgUrl)}`);
      setEpgFeedback("Parsing XMLTV elements...");
      const parsed = parseEPG(response.data);
      
      // Update global store
      useStore.getState().setEpgData(parsed);
      
      const count = Object.keys(parsed).length;
      setEpgFeedback(`Success! Synchronized ${count} EPG programs across active channel ids.`);
    } catch (err: any) {
      console.error(err);
      setEpgFeedback(err.response?.data?.details || err.message || "Failed to download EPG. Verify XMLTV host status.");
    } finally {
      setSyncingEpg(false);
    }
  };

  return (
    <div className="w-full h-full bg-afterglow-bg text-white p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
          <Settings className="w-8 h-8 text-afterglow-primary" />
          <div>
            <h2 className="text-2xl font-display font-black tracking-widest uppercase">SYNC.CONF // SYSTEMS</h2>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Adjust digital signals, portal accounts, and guide sync logs</p>
          </div>
        </div>

        {/* Playlists Manager */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-mono text-white/60 tracking-widest uppercase border-b border-white/5 pb-2 flex items-center gap-2">
              <span>ACTIVE IPTV CONNECTIONS</span>
              <span className="text-[10px] bg-afterglow-primary/20 px-2 py-0.5 rounded-full text-afterglow-primary">{playlists.length}</span>
            </h3>
            
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto">
              {playlists.map((pl) => (
                <div key={pl.id} className="flex items-center justify-between bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <Focusable 
                    id={`set-playlist-select-${pl.id}`}
                    className={`flex-grow pr-4 text-left ${currentPlaylistId === pl.id ? 'text-afterglow-primary font-bold' : 'text-white/60'}`}
                    onEnter={() => setCurrentPlaylist(pl.id)}
                  >
                    <span className="text-sm truncate block">{pl.name}</span>
                    <span className="text-[9px] font-mono opacity-50 block truncate max-w-[200px]">{pl.url}</span>
                  </Focusable>

                  <Focusable 
                    id={`set-playlist-del-${pl.id}`}
                    className="p-2 text-white/40 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-lg"
                    onEnter={() => removePlaylist(pl.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Focusable>
                </div>
              ))}
              {playlists.length === 0 && (
                <div className="text-center text-white/20 py-4 text-xs font-mono">No connected portals</div>
              )}
            </div>
          </div>

          {/* Quick External M3U Connection */}
          <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-mono text-white/60 tracking-widest uppercase border-b border-white/5 pb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-afterglow-primary" />
              <span>LINK EXTERNAL FEED</span>
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/30 truncate">FEED LABEL</span>
                <Focusable id="input-set-name" className="w-full">
                  <input 
                    type="text" 
                    placeholder="E.g., Backup Cine stream"
                    className="w-full text-xs font-light bg-black/40 border border-white/5 rounded-lg p-2.5 outline-none focus:border-afterglow-primary"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onFocus={() => useStore.getState().setFocusedElement('input-set-name')}
                  />
                </Focusable>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/30 truncate">URL PATH</span>
                <Focusable id="input-set-url" className="w-full">
                  <input 
                    type="text" 
                    placeholder="https://server/broadcast.m3u8"
                    className="w-full text-xs font-light bg-black/40 border border-white/5 rounded-lg p-2.5 outline-none focus:border-afterglow-primary"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onFocus={() => useStore.getState().setFocusedElement('input-set-url')}
                  />
                </Focusable>
              </div>

              <Focusable 
                id="btn-set-add" 
                className="w-full afterglow-gradient p-2.5 rounded-lg font-mono text-xs font-bold text-center tracking-wider text-white" 
                onEnter={handleAddPlaylist}
              >
                CONNECT NEW INSTANCE
              </Focusable>

              {syncMsg && <span className="text-xs text-emerald-500 font-mono text-center">{syncMsg}</span>}
            </div>
          </div>
        </div>

        {/* Media Enrichment / Metadata Preferences (Plex style) */}
        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-5">
          <h3 className="text-sm font-mono text-white/60 tracking-widest uppercase border-b border-white/5 pb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>MEDIA ENRICHMENT & METADATA SYSTEM</span>
          </h3>
          
          <div className="flex flex-col gap-4">
            {/* Toggle 1: Smart Title Cleaning */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex-grow">
                <span className="text-xs font-semibold text-white/95 block">PRETTY-PRINT BLOCKBUSTER TITLES</span>
                <span className="text-[10px] font-mono text-white/40 block mt-0.5">
                  Filters year stamps, language brackets, audio codecs, and resolution clutter (e.g. [1080p], Multi-Sub) for uniform presentation.
                </span>
              </div>
              <Focusable
                id="btn-toggle-title-clean"
                className={`px-4 py-2 rounded-lg font-mono text-[9px] font-bold tracking-widest transition-all select-none self-start sm:self-center shrink-0 ${
                  isTitleCleaningEnabled 
                    ? 'bg-indigo-600/20 border border-indigo-505/50 text-indigo-300' 
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
                onEnter={() => setTitleCleaningEnabled(!isTitleCleaningEnabled)}
              >
                {isTitleCleaningEnabled ? 'ACTIVE / ON' : 'DISABLED / OFF'}
              </Focusable>
            </div>

            {/* Toggle 2: Marquee Horizontal Scrolling */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex-grow">
                <span className="text-xs font-semibold text-white/95 block">TITLE MARQUEE SCROLL CARRIAGE</span>
                <span className="text-[10px] font-mono text-white/40 block mt-0.5">
                  Allows overflowing titles on active cards or list rows to horizontally scroll marquee-style so words never get cut off.
                </span>
              </div>
              <Focusable
                id="btn-toggle-marquee"
                className={`px-4 py-2 rounded-lg font-mono text-[9px] font-bold tracking-widest transition-all select-none self-start sm:self-center shrink-0 ${
                  isMarqueeEnabled 
                    ? 'bg-indigo-600/20 border border-indigo-505/50 text-indigo-300' 
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
                onEnter={() => setMarqueeEnabled(!isMarqueeEnabled)}
              >
                {isMarqueeEnabled ? 'ACTIVE / ON' : 'DISABLED / OFF'}
              </Focusable>
            </div>

            {/* Toggle 3: Plex-Style Background AI Scan */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex-grow">
                <span className="text-xs font-semibold text-white/95 block">AUTOMATIC BACKGROUND AI SCANNER (GEMINI)</span>
                <span className="text-[10px] font-mono text-white/40 block mt-0.5">
                  Analyses catalogs in the background on load to append custom plots, high-fidelity genres, and ratings.
                </span>
              </div>
              <Focusable
                id="btn-toggle-background-ai"
                className={`px-4 py-2 rounded-lg font-mono text-[9px] font-bold tracking-widest transition-all select-none self-start sm:self-center shrink-0 ${
                  isBackgroundEnrichmentEnabled 
                    ? 'bg-indigo-600/20 border border-indigo-505/50 text-indigo-300' 
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
                onEnter={() => setBackgroundEnrichmentEnabled(!isBackgroundEnrichmentEnabled)}
              >
                {isBackgroundEnrichmentEnabled ? 'ACTIVE / ON' : 'DISABLED / OFF'}
              </Focusable>
            </div>
          </div>
        </div>

        {/* Status System / diagnostics & EPG Sync */}
        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="text-sm font-mono text-white/60 tracking-widest uppercase border-b border-white/5 pb-2 flex items-center justify-between">
            <span>EPG & XMLTV GUIDE MANAGEMENT</span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3" /> DIGITAL DECODER ACTIVE
            </span>
          </h3>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-black/25 rounded-xl p-4 border border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase block">EPG MAP COUNT</span>
              <span className="text-2xl font-bold text-afterglow-primary font-mono mt-1 block">{totalEpgCount}</span>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase block">CHANNELS LISTED</span>
              <span className="text-2xl font-bold font-mono mt-1 block">{currentPlaylist?.channels.length || 0}</span>
            </div>
            <div className="bg-black/25 rounded-xl p-4 border border-white/5">
              <span className="text-[10px] font-mono text-white/30 uppercase block">EPG FEED ATTACHED</span>
              <span className="text-xs font-mono font-bold mt-2.5 block text-white/75 truncate">
                {currentPlaylist?.epgUrl ? "YES (MAPPED)" : "NO FEED LINKED"}
              </span>
            </div>
          </div>

          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-white/40 tracking-wider">ACTIVE XMLTV SOURCE LINK</span>
              <span className="text-[9px] font-mono text-white/20 -mt-1 block">Specify an external XMLTV / EPG feed url to load guide metadata for "{currentPlaylist?.name || 'No Active Portal'}"</span>
              
              <Focusable id="input-settings-epg" className="w-full mt-1">
                <input 
                  type="text" 
                  placeholder="E.g. https://iptv-org.github.io/epg/guides/us.xml"
                  className="w-full text-xs font-mono bg-black/50 border border-white/5 rounded-xl p-3 outline-none focus:border-indigo-500/40 text-white/80"
                  value={customEpgUrl}
                  disabled={!currentPlaylist}
                  onChange={(e) => setCustomEpgUrl(e.target.value)}
                  onFocus={() => useStore.getState().setFocusedElement('input-settings-epg')}
                />
              </Focusable>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-1">
              <span className="text-[10px] font-mono text-indigo-300 max-w-full sm:max-w-[65%] truncate">
                {epgFeedback || "Waiting on user command..."}
              </span>

              <Focusable 
                id="btn-settings-sync-epg"
                className={`px-5 py-2.5 rounded-lg font-mono text-[10px] font-bold tracking-widest transition-all select-none flex items-center gap-1.5 shrink-0 ${
                  !currentPlaylist 
                    ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                    : syncingEpg 
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 animate-pulse'
                      : 'bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300'
                }`}
                onEnter={currentPlaylist ? handleSyncEpg : undefined}
                disabled={!currentPlaylist || syncingEpg}
              >
                {syncingEpg ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>SYNCING FEED...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>DOWNLOAD EPG GUIDE</span>
                  </>
                )}
              </Focusable>
            </div>
          </div>
        </div>

        {/* License & Subscription Controls */}
        <div className="bg-afterglow-card border border-white/5 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-grow text-left">
              <h4 className="text-sm font-display font-bold text-white tracking-widest uppercase">LICENSE & SUBSCRIPTION MANAGEMENT</h4>
              <p className="text-xs text-white/40 mt-1">Configure and inspect your Afterglow license activation, trial periods, and billing statuses.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-1 border-t border-white/5 pt-5 text-left">
            
            {/* Status Information Column */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block">LICENSING NODE STATUS</span>
              
              {isPremium ? (
                <div className="space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 font-mono text-[9px] font-bold tracking-wider uppercase">
                    <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" /> PREMIUM LIFETIME UNLOCKED
                  </div>
                  <div className="p-3 bg-black/30 rounded-xl space-y-1.5 border border-white/5 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-white/30 uppercase">LICENSE ID:</span>
                      <span className="text-emerald-400 font-bold truncate max-w-[200px]">GLOW-PREM-LIFETIME</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30 uppercase">VALIDITY:</span>
                      <span className="text-white/70">PERMANENT UNLIMITED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30 uppercase">FEATURES:</span>
                      <span className="text-indigo-300">DVR, ENRICHMENT, SYNC PRO</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-afterglow-primary/10 border border-afterglow-primary/20 rounded text-afterglow-primary font-mono text-[9px] font-bold tracking-wider uppercase">
                    <Clock className="w-3.5 h-3.5" /> FREE SYSTEM TRIAL RUNNING
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[9px] text-white/40">
                      <span>TRIAL TIMELINE</span>
                      <span className="text-white/80 font-bold">{daysRemaining} / 15 DAYS REMAINING</span>
                    </div>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full afterglow-gradient rounded-full transition-all duration-500" 
                        style={{ width: `${(daysRemaining / 15) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Focusable 
                      id="btn-settings-premium"
                      className="flex-grow font-mono text-[10px] font-bold tracking-wider uppercase bg-afterglow-gradient text-white py-2 px-4 rounded-lg text-center cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-glow"
                      onEnter={buyPremium}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      UPGRADE TO PREMIUM ($19.99)
                    </Focusable>
                  </div>
                </div>
              )}
            </div>

            {/* Sandbox Simulation Column */}
            <div className="space-y-3 bg-indigo-950/15 border border-indigo-500/10 p-4 rounded-xl">
              <div className="flex items-center gap-1.5 text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase">Sandbox Evaluation Port</span>
              </div>
              <p className="text-[10px] text-white/40 leading-normal">
                For smooth review/testing, bypass billing gateways and adjust dates in real-time to check locked features:
              </p>
              
              <div className="space-y-2.5 pt-1.5">
                <Focusable 
                  id="btn-settings-reset-trial"
                  className="w-full font-mono text-[9px] font-bold tracking-wider uppercase bg-white/5 hover:bg-white/10 text-white/70 hover:text-white py-2 px-3 border border-white/5 rounded-lg text-center cursor-pointer transition-colors block"
                  onEnter={resetTrial}
                >
                  Reset Trial (Fresh start)
                </Focusable>

                <Focusable 
                  id="btn-settings-simulate-expire"
                  className="w-full font-mono text-[9px] font-bold tracking-wider uppercase bg-red-950/20 hover:bg-red-900/30 text-red-300 hover:text-red-200 py-2 px-3 border border-red-500/10 rounded-lg text-center cursor-pointer transition-colors block"
                  onEnter={() => {
                    const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString();
                    setTrialStartDate(sixteenDaysAgo);
                  }}
                >
                  Simulate Expired State (Test Paywall Lock)
                </Focusable>
              </div>
            </div>

          </div>
        </div>

        {/* Power Controls / reset */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-red-500/60" />
            <div className="flex-grow">
              <h4 className="text-sm font-mono text-red-400 tracking-widest uppercase">FACTORY SIGNAL RESET (DANGER ZONE)</h4>
              <p className="text-xs text-white/40 mt-1">Clears all playlists, local credentials, IPTV login details, Stalker Portal logs, and DVR metadata recordings from physical device storage.</p>
            </div>
          </div>

          <Focusable 
            id="btn-settings-reset"
            className="self-end bg-red-950/45 hover:bg-red-900 border border-red-500/20 text-red-400 px-6 py-2.5 text-xs font-mono tracking-widest rounded-lg font-bold"
            onEnter={resetAll}
          >
            ERASE ALL DATA & ACCOUNTS
          </Focusable>
        </div>

      </div>
    </div>
  );
};
