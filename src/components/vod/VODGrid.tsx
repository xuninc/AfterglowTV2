import React, { useState, useMemo, useEffect } from 'react';
import { Play, Search, Film, Calendar, Clock, Star, Grid, Rows3, Library, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Focusable } from '../common/Focusable';
import { useStore, Channel } from '../../store/useStore';
import { DEMO_VOD_MOVIES } from '../../data/demoData';
import { classifyVODChannel, cleanMediaTitle } from '../../utils/vodClassifier';
import { MarqueeText } from '../common/MarqueeText';

export const VODGrid: React.FC = () => {
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const playlists = useStore(state => state.playlists);
  const setCurrentChannel = useStore(state => state.setCurrentChannel);
  const updatePlaylistChannels = useStore(state => state.updatePlaylistChannels);
  const focusedElementId = useStore(state => state.focusedElementId);
  
  const isTitleCleaningEnabled = useStore(state => state.isTitleCleaningEnabled);
  const isMarqueeEnabled = useStore(state => state.isMarqueeEnabled);
  const isBackgroundEnrichmentEnabled = useStore(state => state.isBackgroundEnrichmentEnabled);
  const layoutMode = useStore(state => state.vodLayoutMode);
  const handleSetLayoutMode = useStore(state => state.setVodLayoutMode);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // AI metadata enrichment states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const handleEnrichWithAI = async () => {
    if (!currentPlaylist) {
      setAiError("Please select a custom IPTV playlist first via Settings to run server-side Gemini classifications.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiProgress('Gathering movie titles for analysis...');

    try {
      const rawMovies = currentPlaylist.channels.filter(ch => {
        const gLower = (ch.group || '').toLowerCase();
        const uLower = (ch.url || '').toLowerCase();
        const nLower = (ch.name || '').toLowerCase();
        return (
          ch.type === 'vod' ||
          gLower.includes('movie') || gLower.includes('film') || gLower.includes('cinema') || gLower.includes('vod') || gLower.includes('series') ||
          uLower.includes('.mp4') || uLower.includes('.mkv') || uLower.includes('.avi') ||
          nLower.includes('| movie') || nLower.includes('(vod)')
        );
      });

      if (rawMovies.length === 0) {
        setAiError("No on-demand movie channels found in the active playlist.");
        setAiLoading(false);
        return;
      }

      // Batch size for efficient context management
      const batchSize = 30;
      const moviesToProcess = rawMovies.slice(0, batchSize);
      const titles = moviesToProcess.map(m => m.name);

      setAiProgress(`Consulting Google Gemini AI to analyze ${titles.length} movies...`);

      const response = await fetch('/api/vod/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ titles })
      });

      if (!response.ok) {
        throw new Error('Gemini API query limit or server configuration error');
      }

      interface ClassificationResult {
        originalTitle: string;
        group: string;
        releaseYear: number;
        duration: string;
        description: string;
      }
      const results: ClassificationResult[] = await response.json();

      setAiProgress('Saving catalog classifications locally...');

      // Transform matching channels
      const updatedChannels = currentPlaylist.channels.map(ch => {
        const match = results.find(r => r.originalTitle === ch.name);
        if (match) {
          return {
            ...ch,
            group: match.group,
            type: 'vod' as const,
            releaseYear: match.releaseYear,
            duration: match.duration,
            description: match.description
          };
        }
        return ch;
      });

      updatePlaylistChannels(currentPlaylist.id, updatedChannels);
      setAiProgress(`Success! Enriched ${results.length} on-demand movies with rich descriptions and sectors.`);
      setTimeout(() => {
        setAiLoading(false);
        setAiProgress('');
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error executing intelligence classifiers.');
      setAiLoading(false);
    }
  };
  
  const currentPlaylist = useMemo(() => playlists.find(p => p.id === currentPlaylistId), [playlists, currentPlaylistId]);

  // Automated background metadata enrichment (Plex style)
  useEffect(() => {
    if (!currentPlaylist || !isBackgroundEnrichmentEnabled) return;

    const runBackgroundEnrichment = async () => {
      // Find movies that don't have human-level descriptions yet
      const rawMovies = currentPlaylist.channels.filter(ch => {
        const gLower = (ch.group || '').toLowerCase();
        const uLower = (ch.url || '').toLowerCase();
        const nLower = (ch.name || '').toLowerCase();
        
        const isMovie = (
          ch.type === 'vod' ||
          gLower.includes('movie') || gLower.includes('film') || gLower.includes('cinema') || gLower.includes('vod') || gLower.includes('series') ||
          uLower.includes('.mp4') || uLower.includes('.mkv') || uLower.includes('.avi') ||
          nLower.includes('| movie') || nLower.includes('(vod)')
        );
        
        // This movie hasn't been enriched by AI before
        const isAlreadyEnriched = ch.description && 
          ch.description !== 'Continuous high definition demand streaming broadcast media link.' && 
          ch.description !== 'Ambient custom on-demand high-definition broadcast feed channel.' && 
          ch.description !== 'High-definition custom on-demand media stream.' &&
          ch.description !== 'Continuous high definition demand streaming broadcast media link';
        
        return isMovie && !isAlreadyEnriched;
      });

      if (rawMovies.length === 0) return;

      // Select top 12 movies to silently enrich in the background - Plex Style!
      const targetBatch = rawMovies.slice(0, 12);
      const titles = targetBatch.map(m => m.name);

      try {
        console.log(`[Plex AI Background Enricher] Automatically analyzing ${titles.length} movies...`);
        const response = await fetch('/api/vod/classify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ titles })
        });

        if (!response.ok) return;

        interface ResultType {
          originalTitle: string;
          group: string;
          releaseYear: number;
          duration: string;
          description: string;
        }
        const results: ResultType[] = await response.json();

        const updatedChannels = currentPlaylist.channels.map(ch => {
          const match = results.find(r => r.originalTitle === ch.name);
          if (match) {
            return {
              ...ch,
              name: cleanMediaTitle(match.originalTitle), // Ensure we set pretty original title
              group: match.group,
              type: 'vod' as const,
              releaseYear: match.releaseYear,
              duration: match.duration,
              description: match.description
            };
          }
          return ch;
        });

        updatePlaylistChannels(currentPlaylist.id, updatedChannels);
        console.log(`[Plex AI Background Enricher] Silently enriched ${results.length} VOD metadata elements in background.`);
      } catch (err) {
        console.warn('Background metadata auto-enrichment skipped or rate-limited:', err);
      }
    };

    // Run background scan after a delay to ensure UI transitions loaded nicely
    const timer = setTimeout(() => {
      runBackgroundEnrichment();
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentPlaylistId]);

  // Extract VOD channels dynamically from playlist if present, else fallback to DEMO VOD movies
  const vodChannels = useMemo(() => {
    let moviesToProcess = DEMO_VOD_MOVIES;

    if (currentPlaylist) {
      // Smart identification of movies/series in playlist
      const foundMovies = currentPlaylist.channels.filter(ch => {
        const gLower = (ch.group || '').toLowerCase();
        const uLower = (ch.url || '').toLowerCase();
        const nLower = (ch.name || '').toLowerCase();
        
        return (
          ch.type === 'vod' ||
          gLower.includes('movie') || gLower.includes('film') || gLower.includes('cinema') || gLower.includes('vod') || gLower.includes('series') || gLower.includes('netflix') || gLower.includes('hbo') ||
          uLower.includes('.mp4') || uLower.includes('.mkv') || uLower.includes('.avi') ||
          nLower.includes('| movie') || nLower.includes('(vod)')
        );
      });
      if (foundMovies.length > 0) {
        moviesToProcess = foundMovies;
      }
    }

    // Automatically run high-fidelity fallback classifier so all movies are instantly categorized perfectly!
    return moviesToProcess.map(classifyVODChannel);
  }, [currentPlaylist, isTitleCleaningEnabled]);

  // Categories list
  const categories = useMemo(() => {
    const list = new Set<string>();
    vodChannels.forEach(ch => {
      if (ch.group) list.add(ch.group);
    });
    return ['All', ...Array.from(list)];
  }, [vodChannels]);

  // Filtered VOD
  const filteredVOD = useMemo(() => {
    return vodChannels.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (ch.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || ch.group === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [vodChannels, searchQuery, activeCategory]);

  // Group movies by their group (or General category) for nested layouts
  const groupedVOD = useMemo(() => {
    const groups: Record<string, Channel[]> = {};
    
    filteredVOD.forEach(movie => {
      const categoryName = movie.group || "General VOD";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(movie);
    });
    
    return groups;
  }, [filteredVOD]);

  return (
    <div className="w-full h-full bg-afterglow-bg text-white p-6 overflow-y-auto flex flex-col gap-6">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Film className="w-6 h-6 text-afterglow-primary" />
          <div>
            <h2 className="text-xl font-display font-black tracking-wider uppercase">VOD.CINEMA // BROWSER</h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">High speed on-demand playback core</p>
          </div>
        </div>

        {/* Filters and Controls container */}
        <div className="w-full md:w-auto flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="w-full sm:w-64 flex items-center bg-black/40 border border-white/10 rounded-xl px-3 py-1">
            <Search className="w-4 h-4 text-white/40 mr-2" />
            <Focusable id="input-vod-search" className="flex-grow">
              <input 
                type="text" 
                placeholder="Search movie title or metadata..."
                className="w-full bg-transparent border-none text-xs text-white placeholder:text-white/20 focus:outline-none p-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => useStore.getState().setFocusedElement('input-vod-search')}
              />
            </Focusable>
          </div>

          {/* Layout Mode Toggles */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 shrink-0 select-none">
            <Focusable 
              id="btn-layout-grid" 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${layoutMode === 'grid' ? 'bg-afterglow-primary/20 text-afterglow-primary border border-afterglow-primary/30' : 'text-white/40 hover:text-white'}`}
              onEnter={() => handleSetLayoutMode('grid')}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono tracking-wider font-semibold">GRID</span>
            </Focusable>

            <Focusable 
              id="btn-layout-epg" 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${layoutMode === 'epg' ? 'bg-afterglow-primary/20 text-afterglow-primary border border-afterglow-primary/30' : 'text-white/40 hover:text-white'}`}
              onEnter={() => handleSetLayoutMode('epg')}
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono tracking-wider font-semibold">VOD-GUIDE</span>
            </Focusable>

            <Focusable 
              id="btn-layout-shelf" 
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${layoutMode === 'shelf' ? 'bg-afterglow-primary/20 text-afterglow-primary border border-afterglow-primary/30' : 'text-white/40 hover:text-white'}`}
              onEnter={() => handleSetLayoutMode('shelf')}
            >
              <Library className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono tracking-wider font-semibold">SHELVES</span>
            </Focusable>
          </div>

          {/* AI Metadata Enhancer trigger btn */}
          <Focusable 
            id="btn-enrich-ai"
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 border transition-all duration-350 select-none ${
              aiLoading 
                ? 'bg-indigo-500/20 border-indigo-505/50 text-indigo-300 animate-pulse' 
                : 'bg-indigo-600/15 hover:bg-indigo-600/25 border-indigo-500/30 hover:border-indigo-400/50 text-indigo-300 hover:text-white'
            }`}
            onEnter={handleEnrichWithAI}
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            <span className="text-[9px] font-mono tracking-wider font-semibold">AI ENRICH</span>
          </Focusable>
        </div>
      </div>

      {/* AI Intelligence Progress and Alert Banner */}
      {(aiLoading || aiProgress || aiError) && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shrink-0 animate-fadeIn ${
          aiError 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-indigo-600/10 border-indigo-500/25 text-indigo-300'
        }`}>
          <div className="flex items-center gap-3">
            {aiError ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" />
            )}
            <div>
              <h4 className="text-xs font-semibold font-mono tracking-wider uppercase">
                {aiError ? 'IPTV CLASSIFIER // WARNING' : 'IPTV CLASSIFIER // ACTIVE'}
              </h4>
              <p className="text-[10px] text-white/70 leading-relaxed mt-0.5">
                {aiError || aiProgress}
              </p>
            </div>
          </div>
          {aiLoading && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-[9px] font-mono tracking-widest text-indigo-400 uppercase font-bold">ANALYZING BROADCASTS</span>
            </div>
          )}
          {aiError && (
            <button 
              onClick={() => setAiError(null)} 
              className="text-[9px] font-mono tracking-wider bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 uppercase select-none cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Row categories and filtering ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 scrollbar-none select-none">
        {categories.map((cat, idx) => (
          <Focusable 
            key={cat}
            id={`vod-cat-${idx}`}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-mono tracking-wider transition-colors ${activeCategory === cat ? 'bg-white/10 text-afterglow-primary border border-afterglow-primary/40' : 'text-white/50 bg-white/5 hover:bg-white/10'}`}
            onEnter={() => setActiveCategory(cat)}
          >
            {cat.toUpperCase()}
          </Focusable>
        ))}
      </div>

      {/* VOD Content Area rendered according to selected LayoutMode */}
      <div className="flex-grow overflow-y-auto min-h-0">
        
        {/* LAYOUT 1: Standard Poster Grid */}
        {layoutMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12">
            {filteredVOD.map((movie, idx) => {
              const hasCustomPoster = !!movie.poster;
              const fallbackPosterGradient = `bg-gradient-to-br from-neutral-900 to-indigo-950`;

              return (
                <div 
                  key={movie.name + idx}
                  className="bg-afterglow-card/30 border border-white/5 rounded-2xl overflow-hidden flex flex-col group relative"
                >
                  <div className="h-44 relative overflow-hidden shrink-0">
                    {hasCustomPoster ? (
                      <img 
                        src={movie.poster} 
                        alt={movie.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full ${fallbackPosterGradient} flex flex-col items-center justify-center`}>
                        <Film className="w-12 h-12 text-white/25" />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-mono flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-current" />
                      <span>8.2</span>
                    </div>

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Focusable 
                        id={`btn-vod-play-grid-${idx}`}
                        className="w-12 h-12 rounded-full afterglow-gradient flex items-center justify-center shadow-lg active-ring"
                        onEnter={() => setCurrentChannel(movie)}
                      >
                        <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                      </Focusable>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-2 flex-grow justify-between bg-afterglow-card/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {movie.duration || '2h 15m'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {movie.releaseYear || 2024}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white tracking-wide mt-1 group-hover:text-afterglow-primary transition-colors w-full overflow-hidden">
                        <MarqueeText 
                          text={movie.name} 
                          isFocused={focusedElementId === `btn-vod-grid-select-${idx}` || focusedElementId === `btn-vod-play-grid-${idx}`} 
                        />
                      </h4>
                      <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed mt-0.5">
                        {movie.description || 'Continuous high definition demand streaming broadcast media link.'}
                      </p>
                    </div>

                    <Focusable 
                      id={`btn-vod-grid-select-${idx}`}
                      className="w-full bg-white/5 group-hover:bg-afterglow-primary/10 border border-white/5 hover:border-afterglow-primary/30 p-2 text-center text-[10px] font-mono tracking-widest uppercase rounded-lg text-white/60 group-hover:text-afterglow-primary transition-all mt-4"
                      onEnter={() => setCurrentChannel(movie)}
                    >
                      SELECT BROADCAST
                    </Focusable>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LAYOUT 2: Horizontal EPG-Like guide channel rows (channel surfing style) */}
        {layoutMode === 'epg' && (
          <div className="flex flex-col gap-8 pb-12 select-none">
            {(Object.entries(groupedVOD) as [string, Channel[]][]).map(([groupName, movies], gIdx) => (
              <div key={groupName} className="flex flex-col gap-3">
                
                {/* Channel Lane Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-3.5 rounded bg-afterglow-primary" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/80">{groupName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/30 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                    {movies.length} CHANNELS
                  </span>
                </div>

                {/* Horizontal Guide scroll track */}
                <div className="flex gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth">
                  {movies.map((movie, mIdx) => {
                    const hasCustomPoster = !!movie.poster;
                    const fallbackPosterGradient = `bg-gradient-to-br from-neutral-900 to-indigo-950`;
                    const focusId = `vod-epg-cell-${gIdx}-${mIdx}`;

                    return (
                      <Focusable
                        key={movie.name + mIdx}
                        id={focusId}
                        className="w-80 shrink-0 bg-afterglow-card/50 border border-white/5 rounded-2xl p-3 flex gap-4 hover:border-afterglow-primary/35 transition-all select-none cursor-pointer"
                        onEnter={() => setCurrentChannel(movie)}
                      >
                        {/* 16:9 Thumbnail image on left */}
                        <div className="w-28 h-18 rounded-xl overflow-hidden shrink-0 relative bg-black border border-white/5 shadow-inner">
                          {hasCustomPoster ? (
                            <img 
                              src={movie.poster} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-full h-full ${fallbackPosterGradient} flex items-center justify-center`}>
                              <Film className="w-6 h-6 text-white/20" />
                            </div>
                          )}

                          {/* Quick rating tag */}
                          <div className="absolute top-1 right-1 bg-black/75 px-1 py-0.5 rounded text-[7.5px] font-mono text-amber-400 font-bold flex items-center gap-0.5">
                            ★ 8.2
                          </div>
                        </div>

                        {/* Program-Like details on right */}
                        <div className="flex flex-col justify-center min-w-0 flex-grow overflow-hidden">
                          <span className="text-xs font-semibold text-white/95 leading-snug w-full">
                            <MarqueeText 
                              text={movie.name} 
                              isFocused={focusedElementId === focusId} 
                            />
                          </span>
                          
                          <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 mt-1">
                            <span className="text-afterglow-primary font-bold uppercase">{movie.duration || '14 MIN'}</span>
                            <span>•</span>
                            <span>{movie.releaseYear || 2024}</span>
                          </div>

                          <p className="text-[9px] text-white/35 truncate mt-1">
                            {movie.description || 'Ambient custom on-demand high-definition broadcast feed channel.'}
                          </p>
                        </div>
                      </Focusable>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT 3: Horizontal Shelves with vertical poster cards (Netflix style) */}
        {layoutMode === 'shelf' && (
          <div className="flex flex-col gap-8 pb-12 select-none">
            {(Object.entries(groupedVOD) as [string, Channel[]][]).map(([groupName, movies], gIdx) => (
              <div key={groupName} className="flex flex-col gap-3">
                
                {/* Shelf Title */}
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <span className="w-1.5 h-3.5 bg-sky-500 rounded" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/80">{groupName}</span>
                </div>

                {/* Vertical Poster row track */}
                <div className="flex gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth">
                  {movies.map((movie, mIdx) => {
                    const hasCustomPoster = !!movie.poster;
                    const fallbackPosterGradient = `bg-gradient-to-br from-neutral-900 to-indigo-950`;
                    const focusId = `vod-shelf-card-${gIdx}-${mIdx}`;

                    return (
                      <Focusable
                        key={movie.name + mIdx}
                        id={focusId}
                        className="w-36 shrink-0 bg-afterglow-card/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-afterglow-primary/20 hover:bg-white/5 transition-all select-none cursor-pointer"
                        onEnter={() => setCurrentChannel(movie)}
                      >
                        {/* 2:3 Vertical Poster */}
                        <div className="h-44 relative overflow-hidden bg-black shrink-0 border-b border-white/5">
                          {hasCustomPoster ? (
                            <img 
                              src={movie.poster} 
                              alt="" 
                              className="w-full h-full object-cover transition-transform duration-300 transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-full h-full ${fallbackPosterGradient} flex items-center justify-center`}>
                              <Film className="w-8 h-8 text-white/20" />
                            </div>
                          )}

                          <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono flex items-center gap-0.5">
                            ★ 8.2
                          </div>
                        </div>

                        {/* Micro Info bottom */}
                        <div className="p-2.5 flex flex-col gap-1 min-w-0 justify-between flex-grow overflow-hidden">
                          <span className="text-[10px] font-semibold text-white block w-full">
                            <MarqueeText 
                              text={movie.name} 
                              isFocused={focusedElementId === focusId} 
                            />
                          </span>
                          <span className="text-[8px] font-mono text-white/30 block">
                            {movie.releaseYear || 2024} · {movie.duration || '2h'}
                          </span>
                        </div>
                      </Focusable>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Empty State fallback */}
        {filteredVOD.length === 0 && (
          <div className="text-center py-24 text-white/20 font-mono text-sm uppercase">
            No matching on-demand broadcasts found
          </div>
        )}
      </div>
    </div>
  );
};

