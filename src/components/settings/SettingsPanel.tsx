import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, Settings, AlertTriangle, ShieldCheck, Sparkles, Clock, Key, CreditCard, Database, Tv, Sliders, Calendar, Languages } from 'lucide-react';
import { Focusable } from '../common/Focusable';
import { useStore } from '../../store/useStore';
import axios from 'axios';
import { parseEPG } from '../../lib/epgParser';
import { THEME_PRESETS } from '../../utils/theme';
import { TRANSLATIONS, SupportedLanguage } from '../../utils/translations';

export const SettingsPanel: React.FC = () => {
  const playlists = useStore(state => state.playlists);
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const epgData = useStore(state => state.epgData);
  const setCurrentPlaylist = useStore(state => state.setCurrentPlaylist);
  const removePlaylist = useStore(state => state.removePlaylist);
  const resetAll = useStore(state => state.resetAll);
  const updatePlaylistEpgUrl = useStore(state => state.updatePlaylistEpgUrl);

  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);
  const t = TRANSLATIONS[language];

  const isTitleCleaningEnabled = useStore(state => state.isTitleCleaningEnabled);
  const isMarqueeEnabled = useStore(state => state.isMarqueeEnabled);
  const isBackgroundEnrichmentEnabled = useStore(state => state.isBackgroundEnrichmentEnabled);
  const isVaultSubstitutionEnabled = useStore(state => state.isVaultSubstitutionEnabled);
  const setTitleCleaningEnabled = useStore(state => state.setTitleCleaningEnabled);
  const setMarqueeEnabled = useStore(state => state.setMarqueeEnabled);
  const setBackgroundEnrichmentEnabled = useStore(state => state.setBackgroundEnrichmentEnabled);
  const setVaultSubstitutionEnabled = useStore(state => state.setVaultSubstitutionEnabled);

  // EPG Vault Injector (Virtual Broadcaster) Hooks
  const isEpgInjectEnabled = useStore(state => state.isEpgInjectEnabled);
  const epgInjectMode = useStore(state => state.epgInjectMode);
  const epgInjectChannels = useStore(state => state.epgInjectChannels);
  const epgInjectSlots = useStore(state => state.epgInjectSlots);
  const epgInjectAlgoDensity = useStore(state => state.epgInjectAlgoDensity);
  const mediaLibrary = useStore(state => state.mediaLibrary);
  
  const setEpgInjectEnabled = useStore(state => state.setEpgInjectEnabled);
  const setEpgInjectMode = useStore(state => state.setEpgInjectMode);
  const setEpgInjectChannels = useStore(state => state.setEpgInjectChannels);
  const setEpgInjectAlgoDensity = useStore(state => state.setEpgInjectAlgoDensity);
  const addEpgInjectSlot = useStore(state => state.addEpgInjectSlot);
  const removeEpgInjectSlot = useStore(state => state.removeEpgInjectSlot);

  // Premium / Trial hooks
  const isPremium = useStore(state => state.isPremium);
  const trialStartDate = useStore(state => state.trialStartDate);
  const buyPremium = useStore(state => state.buyPremium);
  const resetTrial = useStore(state => state.resetTrial);
  const setTrialStartDate = useStore(state => state.setTrialStartDate);

  // Theme states
  const activeThemeId = useStore(state => state.activeThemeId);
  const setActiveThemeId = useStore(state => state.setActiveThemeId);

  // Quick state to add a simple M3U link in Settings
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  // Manual EPG custom slots form state
  const [slotChannelId, setSlotChannelId] = useState('');
  const [slotHour, setSlotHour] = useState(20); // default to prime time 8 PM
  const [slotMediaTitle, setSlotMediaTitle] = useState('');
  const [slotFormError, setSlotFormError] = useState('');

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

            {/* Toggle 4: Vault Sub-In Substitution Option */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex-grow">
                <span className="text-xs font-semibold text-white/95 block">SMART VAULT MEDIA SUBSTITUTION (LOCAL SUB-IN)</span>
                <span className="text-[10px] font-mono text-white/40 block mt-0.5">
                  When enabled, if a live IPTV broadcast matches an episode or movie currently indexed in your local Afterglow Vault, the player will automatically sub-in your high-quality local copy starting exactly at the correct current broadcast time offset.
                </span>
              </div>
              <Focusable
                id="btn-toggle-vault-sub"
                className={`px-4 py-2 rounded-lg font-mono text-[9px] font-bold tracking-widest transition-all select-none self-start sm:self-center shrink-0 ${
                  isVaultSubstitutionEnabled 
                    ? 'bg-indigo-600/20 border border-indigo-505/50 text-indigo-300' 
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
                onEnter={() => setVaultSubstitutionEnabled(!isVaultSubstitutionEnabled)}
              >
                {isVaultSubstitutionEnabled ? 'ACTIVE / ON' : 'DISABLED / OFF'}
              </Focusable>
            </div>
          </div>
        </div>

        {/* Theme customization configuration block */}
        <div className="bg-afterglow-card/40 border border-afterglow-primary/20 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-40 bg-afterglow-primary/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-mono text-white/95 tracking-widest uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-afterglow-primary animate-pulse" />
                <span>RECEIVER INTERFACE THEME</span>
              </h3>
              <p className="text-[10px] text-white/40 font-mono mt-1 max-w-2xl leading-relaxed">
                Repaint Afterglow's high-fidelity receiver aesthetic. Easily switch between neon retro palettes, modern high-contrast light environments, or ultra-dark obsidian layouts with persistent automatic synchronisation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isActive = activeThemeId === preset.id;
              return (
                <Focusable
                  key={preset.id}
                  id={`btn-theme-select-${preset.id}`}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-3 relative overflow-hidden select-none ${
                    isActive 
                      ? 'bg-afterglow-primary/10 border-afterglow-primary ring-2 ring-afterglow-primary/30 shadow-glow' 
                      : 'bg-black/25 border-white/5 hover:border-white/15'
                  }`}
                  onEnter={() => setActiveThemeId(preset.id)}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-xs font-bold font-display text-white/95">{preset.name}</span>
                    <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                      preset.type === 'dark' 
                        ? 'bg-zinc-800 text-zinc-300' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {preset.type}
                    </span>
                  </div>

                  {/* Aesthetic visual swatch palette */}
                  <div className="flex items-center gap-2 mt-1 z-10">
                    <div className="flex -space-x-1.5 pointer-events-none">
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm animate-pulse-glow" style={{ backgroundColor: preset.colors.primary }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.secondary }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.accent }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: preset.colors.bg }} />
                    </div>
                    <span className="text-[9px] font-mono text-white/45 tracking-wider uppercase ml-1">
                      {preset.type === 'dark' ? 'Absorbs Light' : 'Reflects Glow'}
                    </span>
                  </div>

                  {/* Sparkle subtle highlight for active theme */}
                  {isActive && (
                    <div className="absolute bottom-2 right-2 w-4 h-4 bg-afterglow-primary/15 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-afterglow-primary animate-ping" />
                    </div>
                  )}
                </Focusable>
              );
            })}
          </div>
        </div>

        {/* EPG Vault Injector (Virtual Broadcaster) configuration block */}
        <div className="bg-afterglow-card/40 border border-afterglow-primary/20 rounded-2xl p-6 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-mono text-white/95 tracking-widest uppercase flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>EPG INTEGRATION: VIRTUAL BROADCASTER</span>
              </h3>
              <p className="text-[10px] text-white/40 font-mono mt-1 max-w-2xl leading-relaxed">
                Silently inject your personal media library directly into the IPTV Player's Electronic Program Guide (EPG). Replace standard live schedules with your automated or custom slotted high-fidelity local content.
              </p>
            </div>
            
            <Focusable
              id="btn-epg-inject-master"
              className={`px-4 py-2 rounded-lg font-mono text-[9px] font-bold tracking-widest transition-all select-none self-start sm:self-center shrink-0 ${
                isEpgInjectEnabled 
                  ? 'bg-indigo-600/35 border border-indigo-500 text-indigo-200' 
                  : 'bg-white/5 border border-white/10 text-white/40'
              }`}
              onEnter={() => setEpgInjectEnabled(!isEpgInjectEnabled)}
            >
              {isEpgInjectEnabled ? 'INJECTOR ACTIVE / ON' : 'SYSTEM OFF'}
            </Focusable>
          </div>

          {isEpgInjectEnabled && (
            <div className="flex flex-col gap-6 animate-fade-in text-left">
              
              {/* Injection mode selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    epgInjectMode === 'algorithmic' 
                      ? 'bg-indigo-950/15 border-indigo-500/40' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                  onClick={() => setEpgInjectMode('algorithmic')}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sliders className={`w-4 h-4 ${epgInjectMode === 'algorithmic' ? 'text-indigo-400' : 'text-white/45'}`} />
                    <span className="text-xs font-semibold text-white/95 uppercase font-mono">AUTOPILOT INJECTION (Algorithmic)</span>
                  </div>
                  <p className="text-[10.5px] text-white/45 font-mono leading-relaxed">
                    Let the app's advanced scheduling algorithm randomly and deterministically take over the slots on free-game channels based on files present inside your local folders database.
                  </p>
                </div>

                <div 
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                    epgInjectMode === 'manual' 
                      ? 'bg-indigo-950/15 border-indigo-500/40' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                  onClick={() => setEpgInjectMode('manual')}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className={`w-4 h-4 ${epgInjectMode === 'manual' ? 'text-indigo-400' : 'text-white/45'}`} />
                    <span className="text-xs font-semibold text-white/95 uppercase font-mono">CRON PLANNER (Fixed Slots)</span>
                  </div>
                  <p className="text-[10.5px] text-white/45 font-mono leading-relaxed">
                    Reserve specific daily hours for specific Vault files to show up on designated IPTV channels. Build your own perfect custom live-television scheduling matrix.
                  </p>
                </div>
              </div>

              {/* Dynamic Sub-Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-white/5 pt-5">
                
                {/* Available Channels target Selector (Free Game Channels) */}
                <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-3">
                  <div>
                    <h4 className="text-[11px] font-mono font-bold tracking-wider text-white/80 uppercase">Free-Game Target Channels</h4>
                    <p className="text-[9px] text-white/40 block mt-0.5 leading-snug">
                      Toggle which live channels the system is permitted to take over schedules of.
                    </p>
                  </div>

                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 max-h-48 overflow-y-auto scrollbar-none flex flex-col gap-1.5 min-h-[140px]">
                    {(() => {
                      const playlist = playlists.find(p => p.id === currentPlaylistId);
                      const live = playlist ? playlist.channels.filter(c => c.type !== 'vod') : [];
                      
                      const availableTargetChannels = live.length > 0 
                        ? live.map(ch => ({ tvgId: ch.tvgId || ch.name, name: ch.name }))
                        : [
                            { tvgId: "sintel.live", name: "Sintel Cinema Live" },
                            { tvgId: "bunny.live", name: "Big Buck Bunny Cartoon" },
                            { tvgId: "tears.live", name: "Tears of Steel Sci-Fi Feed" },
                            { tvgId: "nasa.hd", name: "NASA HD Public Broadcast" },
                            { tvgId: "bipbop.live", name: "BipBop Decoder Calibrator" }
                          ];

                      return availableTargetChannels.map((ch, idx) => {
                        const isChecked = epgInjectChannels.includes(ch.tvgId);
                        return (
                          <Focusable
                            key={idx}
                            id={`btn-toggle-channel-inject-${idx}`}
                            className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-indigo-950/10 border-indigo-500/25 text-indigo-300' 
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/60'
                            }`}
                            onEnter={() => {
                              if (isChecked) {
                                setEpgInjectChannels(epgInjectChannels.filter(id => id !== ch.tvgId));
                              } else {
                                setEpgInjectChannels([...epgInjectChannels, ch.tvgId]);
                              }
                            }}
                          >
                            <span className="text-[10px] truncate max-w-[200px]" title={ch.name}>
                              {ch.name}
                            </span>
                            <span className="text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded uppercase font-black">
                              {isChecked ? 'FREE GAME' : 'BLOCK OUT'}
                            </span>
                          </Focusable>
                        );
                      });
                    })()}
                  </div>
                  <span className="text-[9px] font-mono text-white/30 italic">
                    * If zero channels are highlighted, all listings will fall back to free-game open targets.
                  </span>
                </div>

                {/* Autopilot Density Configuration or Manual Slots Loader */}
                <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4 border-l border-white/5 pl-0 lg:pl-6">
                  {epgInjectMode === 'algorithmic' ? (
                    <div className="flex flex-col gap-4 text-left">
                      <div>
                        <h4 className="text-[11px] font-mono font-bold tracking-wider text-white/80 uppercase">Injection Frequency (Density)</h4>
                        <p className="text-[9px] text-white/40 block mt-0.5 leading-snug">
                          Set the percentage probability for any live EPG show slot to get automatically populated with high quality products from your personal library.
                        </p>
                      </div>

                      <div className="bg-black/25 rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-white/50">AUTOPILOT RATIO</span>
                          <span className="text-base font-bold font-mono text-afterglow-primary">
                            {epgInjectAlgoDensity}% <span className="text-[9px] font-normal text-white/30 text-right">of EPG slots</span>
                          </span>
                        </div>

                        <input 
                          type="range"
                          min="10"
                          max="90"
                          step="10"
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 animate-pulse"
                          value={epgInjectAlgoDensity}
                          onChange={(e) => setEpgInjectAlgoDensity(parseInt(e.target.value))}
                        />

                        <div className="grid grid-cols-4 text-center text-[9px] font-mono text-white/30">
                          <span>10% (Chilled)</span>
                          <span>30% (Standard)</span>
                          <span>60% (Broadcaster)</span>
                          <span>90% (Takeover)</span>
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold text-white/90 uppercase font-mono block">Dynamic Rotation Stable Engine</span>
                          <span className="text-[9.5px] font-mono text-white/45 mt-0.5 leading-snug block">
                            Our system generates stable, continuous virtual live feeds using high-performance deterministic offsets. When watching, standard live feeds silently loop local high definition releases, matching user watch-hours like standard TV.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 text-left">
                      <div>
                        <h4 className="text-[11px] font-mono font-bold tracking-wider text-white/80 uppercase">Hourly Planner Matrix</h4>
                        <p className="text-[9px] text-white/40 block mt-0.5 leading-snug">
                          Instruct the guide decoder to replace any program at a exact hour with a selected release from your system holdings.
                        </p>
                      </div>

                      {/* Manual Slot Adder Container */}
                      <div className="bg-black/25 rounded-xl p-4 border border-white/5 flex flex-col gap-3">
                        <span className="text-[9px] font-mono font-bold text-white/55 tracking-wider uppercase">Allocate Target Hour & Media file</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Channel select */}
                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[8px] font-mono text-white/40 uppercase">Channel</label>
                            <select
                              value={slotChannelId}
                              onChange={(e) => {
                                setSlotChannelId(e.target.value);
                                setSlotFormError('');
                              }}
                              className="bg-zinc-900 border border-white/15 rounded px-2.5 py-1.5 text-[9.5px] font-mono text-white/80 focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="">Select Target...</option>
                              {(() => {
                                const playlist = playlists.find(p => p.id === currentPlaylistId);
                                const live = playlist ? playlist.channels.filter(c => c.type !== 'vod') : [];
                                const list = live.length > 0 
                                  ? live.map(ch => ({ tvgId: ch.tvgId || ch.name, name: ch.name }))
                                  : [
                                      { tvgId: "sintel.live", name: "Sintel Cinema Live" },
                                      { tvgId: "bunny.live", name: "Big Buck Bunny Cartoon" },
                                      { tvgId: "tears.live", name: "Tears of Steel Sci-Fi Feed" },
                                      { tvgId: "nasa.hd", name: "NASA HD Public Broadcast" },
                                      { tvgId: "bipbop.live", name: "BipBop Decoder Calibrator" }
                                    ];
                                return list.map(c => (
                                  <option key={c.tvgId} value={c.tvgId}>{c.name}</option>
                                ));
                              })()}
                            </select>
                          </div>

                          {/* Hour select */}
                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[8px] font-mono text-white/40 uppercase">Broadcast Hour</label>
                            <select
                              value={slotHour}
                              onChange={(e) => {
                                setSlotHour(parseInt(e.target.value));
                                setSlotFormError('');
                              }}
                              className="bg-zinc-900 border border-white/15 rounded px-2.5 py-1.5 text-[9.5px] font-mono text-white/80 focus:border-indigo-500 focus:outline-none"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                  {`${i === 0 ? 12 : i > 12 ? i - 12 : i} ${i >= 12 ? 'PM' : 'AM'} (${String(i).padStart(2, '0')}:00)`}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Media select */}
                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[8px] font-mono text-white/40 uppercase">Vault Content</label>
                            <select
                              value={slotMediaTitle}
                              onChange={(e) => {
                                setSlotMediaTitle(e.target.value);
                                setSlotFormError('');
                              }}
                              className="bg-zinc-900 border border-white/15 rounded px-2.5 py-1.5 text-[9.5px] font-mono text-white/80 focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="">Select Video...</option>
                              {mediaLibrary.length > 0 ? (
                                mediaLibrary.map((item, idx) => (
                                  <option key={idx} value={item.displayTitle}>{item.displayTitle}</option>
                                ))
                              ) : (
                                <option value="Sintel (Standard Open High Definition Edition)">Sintel (Standard Fallback)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        {slotFormError && (
                          <div className="text-[9px] font-mono text-rose-400 mt-1 flex items-center gap-1.5 text-left bg-rose-500/10 p-2 rounded border border-rose-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{slotFormError}</span>
                          </div>
                        )}

                        <Focusable
                          id="btn-epg-add-manual-slot"
                          className="afterglow-gradient block w-full py-2 rounded-lg font-mono text-[9px] font-black uppercase text-white tracking-widest shadow-glow mt-1 text-center"
                          onEnter={() => {
                            // Local manual submit flow
                            if (!slotChannelId) {
                              setSlotFormError('Choose channel first.');
                              return;
                            }
                            const finalSelectedTitle = slotMediaTitle || "Sintel (Standard Open High Definition Edition)";
                            const duplicate = epgInjectSlots.some(s => s.channelId === slotChannelId && s.hour === slotHour);
                            if (duplicate) {
                              setSlotFormError('A custom override already exists for this channel and hour.');
                              return;
                            }
                            addEpgInjectSlot({
                              id: `slot-${crypto.randomUUID()}`,
                              channelId: slotChannelId,
                              hour: slotHour,
                              mediaTitle: finalSelectedTitle
                            });
                          }}
                        >
                          COMMENCE SLOT INJECTION
                        </Focusable>
                      </div>

                      {/* Display existing custom slot rules */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-mono font-bold text-white/55 tracking-wider uppercase">Active Injected Channels Grid</span>
                        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto scrollbar-none min-h-[80px]">
                          {epgInjectSlots.length > 0 ? (
                            epgInjectSlots.map((slot) => (
                              <div key={slot.id} className="flex items-center justify-between bg-black/15 border border-white/5 rounded-lg px-3 py-2 text-left">
                                <div className="flex flex-col">
                                  <span className="text-[10.5px] font-bold text-white/90">
                                    {slot.mediaTitle}
                                  </span>
                                  <span className="text-[8.5px] font-mono text-white/30 uppercase tracking-wider">
                                    channel: {slot.channelId} &bull; starting at {`${slot.hour === 0 ? 12 : slot.hour > 12 ? slot.hour - 12 : slot.hour} ${slot.hour >= 12 ? 'PM' : 'AM'}`}
                                  </span>
                                </div>
                                <Focusable
                                  id={`btn-remove-slot-${slot.id}`}
                                  className="p-1 px-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-300 font-mono text-[8px] uppercase font-bold text-center cursor-pointer"
                                  onEnter={() => removeEpgInjectSlot(slot.id)}
                                >
                                  REMOVE
                                </Focusable>
                              </div>
                            ))
                          ) : (
                            <div className="h-16 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                              <span className="text-[10px] font-mono text-white/35 text-center px-4 w-full">No custom slot reservations saved. Set values above to start.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
