import React, { useState, useMemo } from 'react';
import { 
  Film, Tv, Layers, Calendar, Clock, Star, Edit, CheckCircle, AlertTriangle, 
  Search, RefreshCw, Trash2, Sliders, Info, Eye, ArrowLeft, Sparkles, AlertCircle 
} from 'lucide-react';
import { useStore, Channel } from '../../store/useStore';
import { MediaMetadata } from '../../types/media';
import { Focusable } from '../common/Focusable';
import { useMediaLibraryScanner } from '../../hooks/useMediaLibraryScanner';
import { calculateMiniLMSimilarity, performLocalOnDeviceMatch, LOCAL_METADATA_INDEX } from '../../utils/localMetadataDatabase';

export const MediaLibrary: React.FC = () => {
  const mediaLibrary = useStore(state => state.mediaLibrary);
  const setMediaLibrary = useStore(state => state.setMediaLibrary);
  const updateMediaMetadata = useStore(state => state.updateMediaMetadata);
  const clearMediaLibrary = useStore(state => state.clearMediaLibrary);
  const scannerStatus = useStore(state => state.libraryScannerStatus);
  const scannerProgress = useStore(state => state.libraryScannerProgress);
  const setCurrentChannel = useStore(state => state.setCurrentChannel);

  const { startScan, stopScan } = useMediaLibraryScanner();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'movies' | 'shows' | 'genres' | 'recent' | 'needs_review'>('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  
  // Detail selection state
  const [selectedItem, setSelectedItem] = useState<MediaMetadata | null>(null);
  const [viewingShowSeriesName, setViewingShowSeriesName] = useState<string | null>(null); // To drill-down into TV Seasons/episodes
  
  // Correction modal states
  const [editingItem, setEditingItem] = useState<MediaMetadata | null>(null);
  const [editType, setEditType] = useState<'movie' | 'tv_show' | 'tv_episode'>('movie');
  const [editTitle, setEditTitle] = useState('');
  const [editShowTitle, setEditShowTitle] = useState('');
  const [editSeason, setEditSeason] = useState(1);
  const [editEpisode, setEditEpisode] = useState(1);
  const [editEpisodeTitle, setEditEpisodeTitle] = useState('');
  const [editYear, setEditYear] = useState(2024);
  const [editOverview, setEditOverview] = useState('');
  const [editGenres, setEditGenres] = useState('');
  const [editPoster, setEditPoster] = useState('');

  // Monitored Folder source states
  const monitoredFolders = useStore(state => state.monitoredFolders);
  const addMonitoredFolder = useStore(state => state.addMonitoredFolder);
  const removeMonitoredFolder = useStore(state => state.removeMonitoredFolder);
  const updateMonitoredFolderStatus = useStore(state => state.updateMonitoredFolderStatus);

  const [newFolderPath, setNewFolderPath] = useState('');
  const [newFolderType, setNewFolderType] = useState<'movie' | 'tv' | 'mixed'>('mixed');
  const [scanningFolderId, setScanningFolderId] = useState<string | null>(null);
  const [scannedFilesProgress, setScannedFilesProgress] = useState({ current: 0, total: 0, file: '' });
  const [folderNotification, setFolderNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Run scanning over selected local source folders
  const runFolderScan = async (folder: any) => {
    if (scanningFolderId) return; // Prevent concurrent multiple scans
    
    setScanningFolderId(folder.id);
    updateMonitoredFolderStatus(folder.id, 'scanning');
    setFolderNotification({ message: `Initiating directory monitor on ${folder.path}...`, type: 'info' });
    
    try {
      const response = await fetch("/api/library/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: [folder.path], simulate: true }) // simulate fallback for sandboxed environments
      });

      if (!response.ok) {
        throw new Error("Failed to scan path");
      }

      const data = await response.json();
      const folderResult = data.results && data.results[folder.path];
      
      if (folderResult && folderResult.status === 'active' && folderResult.files.length > 0) {
        const files = folderResult.files;
        setScannedFilesProgress({ current: 0, total: files.length, file: files[0] });
        
        setFolderNotification({
          message: `Found ${files.length} personal media files. Commencing high-accuracy metadata matching...`,
          type: 'success'
        });

        // Loop over files with index building simulation
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setScannedFilesProgress({ current: i + 1, total: files.length, file });
          
          // Match metadata using the robust filename parser and TMDb fuzzy cosine matching matcher
          const match = performLocalOnDeviceMatch(file, folder.path);
          
          // Append specific folder pathway properties for user visibility
          updateMediaMetadata(file, {
            ...match,
            providerSource: folder.path
          });
          
          // 400ms delay per file to allow user to visual track scanning
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        const lastScanned = new Date().toLocaleString();
        updateMonitoredFolderStatus(folder.id, 'active', {
          lastScanned,
          fileCount: files.length
        });
        
        setFolderNotification({
          message: `Successfully monitored and imported sources for ${folder.path}!`,
          type: 'success'
        });
      } else {
        updateMonitoredFolderStatus(folder.id, 'unreachable', { lastScanned: new Date().toLocaleString(), fileCount: 0 });
        setFolderNotification({
          message: `The folder path was empty or metadata matching timed out.`,
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error("Personal Media Directory scanning error:", error);
      updateMonitoredFolderStatus(folder.id, 'unreachable', { lastScanned: new Date().toLocaleString(), fileCount: 0 });
      setFolderNotification({
        message: `Could not mount path: directory unreachable. Check read permissions.`,
        type: 'error'
      });
    } finally {
      setScanningFolderId(null);
      // clear status notification after 8 seconds
      setTimeout(() => setFolderNotification(null), 8000);
    }
  };

  // 1. Core Derived stats list
  const filteredItems = useMemo(() => {
    return mediaLibrary.filter(item => {
      const matchSearch = 
        item.cleanedTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rawTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.showTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      switch (activeTab) {
        case 'movies':
          return item.mediaType === 'movie';
        case 'shows':
          return item.mediaType === 'tv_show' || item.mediaType === 'tv_episode';
        case 'recent':
          return true; // render all but sorted by scan date
        case 'needs_review':
          return item.confidenceScore < 60 && !item.userEditedOverride;
        default:
          return true;
      }
    });
  }, [mediaLibrary, activeTab, searchQuery]);

  // Sort logically
  const sortedItems = useMemo(() => {
    if (activeTab === 'recent') {
      return [...filteredItems].sort((a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime());
    }
    return [...filteredItems].sort((a, b) => a.cleanedTitle.localeCompare(b.cleanedTitle));
  }, [filteredItems, activeTab]);

  // List of all genres detected
  const genreList = useMemo(() => {
    const genres = new Set<string>();
    mediaLibrary.forEach(item => {
      item.genres.forEach(g => genres.add(g));
    });
    return ['All', ...Array.from(genres)];
  }, [mediaLibrary]);

  // TV Shows grouped
  const groupedTVShows = useMemo(() => {
    const shows: Record<string, { info: MediaMetadata | null; episodes: MediaMetadata[] }> = {};
    mediaLibrary.forEach(item => {
      if (item.mediaType === 'tv_episode' && item.showTitle) {
        const key = item.showTitle;
        if (!shows[key]) {
          shows[key] = { info: null, episodes: [] };
        }
        shows[key].episodes.push(item);
      } else if (item.mediaType === 'tv_show' && item.showTitle) {
        const key = item.showTitle;
        if (!shows[key]) {
          shows[key] = { info: null, episodes: [] };
        }
        shows[key].info = item;
      }
    });
    return shows;
  }, [mediaLibrary]);

  // Get similar movies utilizing TF-IDF MiniLM word vectors
  const semanticNeighbors = useMemo(() => {
    if (!selectedItem) return [];
    
    return mediaLibrary
      .filter(item => item.rawTitle !== selectedItem.rawTitle)
      .map(item => {
        const simScore = calculateMiniLMSimilarity(selectedItem.cleanedTitle, item.cleanedTitle);
        // Also boost if genres match
        const genreIntersects = item.genres.filter(g => selectedItem.genres.includes(g)).length;
        const totalScore = Math.min(1.0, simScore + (genreIntersects * 0.1));
        return { item, score: totalScore };
      })
      .filter(neighbour => neighbour.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [selectedItem, mediaLibrary]);

  // Handle Play selection (simulates launching standard broadcast stream player)
  const handlePlayMedia = (item: MediaMetadata) => {
    // Find the original stream channel matching the raw title
    const playlist = useStore.getState().playlists.find(p => p.id === useStore.getState().currentPlaylistId);
    if (!playlist) return;
    const channelMatched = playlist.channels.find(ch => ch.name === item.rawTitle);
    if (channelMatched) {
      setCurrentChannel(channelMatched);
    } else {
      // Create transient channel fallback
      setCurrentChannel({
        name: item.displayTitle,
        url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8", // Tears of Steel fallback
        group: item.genres[0] || 'VOD Cinema',
        type: 'vod'
      });
    }
  };

  // Open correction modal
  const handleOpenEdit = (item: MediaMetadata) => {
    setEditingItem(item);
    setEditType(item.mediaType === 'unknown' ? 'movie' : item.mediaType);
    setEditTitle(item.movieTitle || item.cleanedTitle);
    setEditShowTitle(item.showTitle || '');
    setEditSeason(item.season || 1);
    setEditEpisode(item.episode || 1);
    setEditEpisodeTitle(item.episodeTitle || '');
    setEditYear(item.year || 2024);
    setEditOverview(item.overview || '');
    setEditGenres(item.genres.join(', '));
    setEditPoster(item.posterUrl || '');
  };

  // Save manual override correction
  const handleSaveCorrection = () => {
    if (!editingItem) return;

    const parsedGenres = editGenres.split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    const updatedData: Partial<MediaMetadata> = {
      mediaType: editType,
      cleanedTitle: editType === 'tv_episode' ? (editShowTitle || editTitle) : editTitle,
      genres: parsedGenres.length > 0 ? parsedGenres : ["General VOD"],
      year: editYear,
      overview: editOverview,
      posterUrl: editPoster || "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80",
      userEditedOverride: true,
      confidenceScore: 100, // 100% confidence for user edited
      lastMatchedAt: new Date().toISOString()
    };

    if (editType === 'tv_episode') {
      updatedData.showTitle = editShowTitle;
      updatedData.season = editSeason;
      updatedData.episode = editEpisode;
      updatedData.episodeTitle = editEpisodeTitle;
      updatedData.displayTitle = `${editShowTitle} - S${editSeason < 10 ? '0'+editSeason : editSeason}E${editEpisode < 10 ? '0'+editEpisode : editEpisode} - ${editEpisodeTitle || 'Episode ' + editEpisode}`;
    } else if (editType === 'tv_show') {
      updatedData.showTitle = editTitle;
      updatedData.displayTitle = `${editTitle} (Season ${editSeason})`;
      updatedData.season = editSeason;
    } else {
      updatedData.movieTitle = editTitle;
      updatedData.displayTitle = `${editTitle} (${editYear})`;
    }

    updateMediaMetadata(editingItem.rawTitle, updatedData);
    
    // Close modal and refresh current selection
    const newlyFetched = { ...editingItem, ...updatedData };
    if (selectedItem && selectedItem.rawTitle === editingItem.rawTitle) {
      setSelectedItem(newlyFetched);
    }
    setEditingItem(null);
  };

  // Autocomplete matching from static local index database
  const handleAutocompleteSearch = (titleKey: string) => {
    const record = LOCAL_METADATA_INDEX[titleKey.toLowerCase()];
    if (!record) return;

    setEditTitle(record.title);
    setEditYear(record.year || 2024);
    setEditOverview(record.overview);
    setEditGenres(record.genres.join(', '));
    setEditPoster(record.posterUrl);

    if (record.mediaType === 'tv_show') {
      setEditType('tv_show');
      setEditShowTitle(record.title);
      // If Supernatural default season ep
      if (titleKey.toLowerCase() === 'supernatural') {
        setEditType('tv_episode');
        setEditSeason(15);
        setEditEpisode(5);
        setEditEpisodeTitle("Proverbs 17:3");
        setEditOverview("Sam and Dean are baffled when they investigate the deaths of two brothers.");
      }
    } else {
      setEditType('movie');
    }
  };

  return (
    <div className="w-full h-full bg-afterglow-bg text-white p-6 overflow-hidden flex flex-col gap-4">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-indigo-400 shadow-glow" />
          <div>
            <h2 className="text-xl font-display font-black tracking-wider uppercase flex items-center gap-2">
              <span>AFTERGLOW VAULT</span>
              <span className="text-[9px] font-mono bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                On-Device AI Sorted
              </span>
            </h2>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Metadata-Enriched Personal Media Library</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Progress bar info */}
          {scannerStatus === 'scanning' && (
            <div className="bg-indigo-950/40 border border-indigo-500/20 px-4 py-2 rounded-xl flex items-center gap-3 text-xs max-w-64 sm:max-w-xs shrink-0">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between font-mono text-[9px] text-indigo-300">
                  <span>ORGANIZING PIPELINE</span>
                  <span>{Math.round((scannerProgress.processed / scannerProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-black/60 h-1 rounded mt-1 overflow-hidden">
                  <div 
                    className="bg-indigo-400 h-full transition-all duration-300"
                    style={{ width: `${(scannerProgress.processed / scannerProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-[8px] font-mono text-white/50 truncate -mt-0.5">{scannerProgress.currentItemName}</p>
              </div>
            </div>
          )}

          <Focusable id="btn-library-scan" className="shrink-0" onEnter={() => startScan(true)}>
            <button className="px-4 py-2.5 bg-indigo-600/15 border border-indigo-500/30 hover:bg-indigo-600/30 rounded-xl font-mono text-[10px] uppercase font-bold tracking-widest text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Full Scan Database</span>
            </button>
          </Focusable>

          <Focusable id="btn-library-clear" className="shrink-0" onEnter={clearMediaLibrary}>
            <button className="p-2.5 bg-red-600/15 border border-red-500/30 hover:bg-red-500/30 rounded-xl text-red-300">
              <Trash2 className="w-4 h-4" />
            </button>
          </Focusable>
        </div>
      </div>

      {/* 2. Interactive Navigation tabs & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 bg-black/20 p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { id: 'movies', label: 'Movies', icon: Film },
            { id: 'shows', label: 'TV Shows', icon: Tv },
            { id: 'recent', label: 'Recently Added', icon: Calendar },
            { id: 'sources', label: 'Library Sources', icon: Layers },
            { id: 'needs_review', label: 'Needs Review', icon: AlertTriangle, count: mediaLibrary.filter(i => i.confidenceScore < 60 && !i.userEditedOverride).length }
          ].map(tab => (
            <Focusable key={tab.id} id={`lib-tab-${tab.id}`} onEnter={() => { setActiveTab(tab.id as any); setViewingShowSeriesName(null); }}>
              <button className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white/80'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="font-sans text-[9px] bg-red-500/20 border border-red-500/40 text-red-300 px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {tab.count}
                  </span>
                )}
              </button>
            </Focusable>
          ))}
        </div>

        <div className="w-full md:w-64 bg-black/40 border border-white/10 rounded-xl px-3 py-1 flex items-center shrink-0">
          <Search className="w-4 h-4 text-white/30 mr-2" />
          <Focusable id="input-lib-search" className="flex-grow">
            <input 
              type="text" 
              placeholder="Search sorted library..."
              className="w-full bg-transparent border-none text-xs text-white placeholder:text-white/20 focus:outline-none py-1.5"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => useStore.getState().setFocusedElement('input-lib-search')}
            />
          </Focusable>
        </div>
      </div>

      {mediaLibrary.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center gap-4 bg-afterglow-card/20 rounded-2xl border border-dashed border-white/5 p-12">
          <AlertCircle className="w-12 h-12 text-white/20" />
          <div className="text-center space-y-1">
            <h3 className="text-sm font-mono tracking-widest uppercase font-bold text-white/60">No Cleaned Metadata Found</h3>
            <p className="text-xs text-white/30 max-w-md mx-auto">
              Ready to parse your playlist. Run the background metadata scanner to automatically strip IPTV filename clutter and match blockbusters!
            </p>
          </div>
          <Focusable id="btn-launch-scan" onEnter={() => startScan(false)}>
            <button className="px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-400/30 text-indigo-300 font-mono text-xs uppercase font-bold tracking-widest rounded-xl transition-all shadow-glow">
              Initialize Metadata Scanner
            </button>
          </Focusable>
        </div>
      ) : (
        <div className="flex-grow flex gap-6 overflow-hidden">
          
          {/* Main List Section */}
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
            
            {/* Case: Drilling down into a specific TV Show's seasons & episodes */}
            {activeTab === 'shows' && viewingShowSeriesName ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Focusable id="btn-back-shows" onEnter={() => setViewingShowSeriesName(null)}>
                    <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-xs text-indigo-400 flex items-center gap-1.5 font-mono select-none">
                      <ArrowLeft className="w-4 h-4" /> BACK
                    </button>
                  </Focusable>
                  <h3 className="font-display font-medium text-lg uppercase tracking-wider">{viewingShowSeriesName}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(groupedTVShows[viewingShowSeriesName]?.episodes || [])
                    .sort((a, b) => ((a.season || 1) * 1000 + (a.episode || 1)) - ((b.season || 1) * 1000 + (b.episode || 1)))
                    .map((episode, idx) => (
                      <Focusable 
                        key={episode.rawTitle} 
                        id={`episode-card-${idx}`} 
                        onEnter={() => setSelectedItem(episode)}
                      >
                        <div className={`p-4 rounded-2xl border text-left flex gap-4 transition-all select-none ${selectedItem?.rawTitle === episode.rawTitle ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-afterglow-card/40 border-white/5 hover:border-white/10'}`}>
                          <img 
                            src={episode.posterUrl} 
                            alt="Poster" 
                            className="w-16 h-20 object-cover rounded-lg bg-black/40 shrink-0 border border-white/5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-grow min-w-0">
                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
                              Season {episode.season} Ep {episode.episode}
                            </span>
                            <h4 className="text-sm font-bold tracking-tight text-white/95 mt-1 truncate">
                              {episode.episodeTitle || `Episode ${episode.episode}`}
                            </h4>
                            <p className="text-xs text-white/40 line-clamp-2 mt-1 leading-relaxed">
                              {episode.overview}
                            </p>
                          </div>
                        </div>
                      </Focusable>
                    ))}
                </div>
              </div>
            ) : activeTab === 'sources' ? (
              /* Custom Library Sources and Monitored Folders Panel */
              <div className="flex-grow overflow-y-auto space-y-6 pb-12 pr-1 text-left">
                {/* Intro Banner */}
                <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/40 border border-indigo-500/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Layers className="w-40 h-40 text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-mono text-indigo-400 uppercase tracking-widest font-black">Monitored Media Paths</h3>
                  <h4 className="text-2xl font-display font-medium tracking-tight text-white mt-2 leading-tight">Embed your IPTV feed with a Plex-like Personal Media Vault.</h4>
                  <p className="text-xs text-white/50 max-w-xl mt-3 leading-relaxed">
                    Set up directories on your computer or local host disk. Afterglow Vault monitors these sources for added video formats, extracts cleaner metadata from raw filenames, and builds custom posters and backdrops using our AI categorization engine.
                  </p>
                  <p className="text-[10px] font-mono text-indigo-300/60 mt-4 leading-normal flex items-center gap-1.5 bg-indigo-500/5 border border-indigo-500/10 px-3 py-1.5 rounded-lg w-max">
                    <Sparkles className="w-3.5 h-3.5" /> Note: Relative or absolute local file entries such as <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">D:\Movies</code> or <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">/home/user/vault/tv</code> are supported.
                  </p>
                </div>

                {/* Notifications & Warning alerts */}
                {folderNotification && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-mono animate-fade-in ${
                    folderNotification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    folderNotification.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  }`}>
                    {folderNotification.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <p>{folderNotification.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Register Folder */}
                  <div className="lg:col-span-12 xl:col-span-5 bg-afterglow-card/40 border border-white/5 rounded-2xl p-5 space-y-4">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5" /> Register Folder Source
                    </h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Folder Directory Path</label>
                      <Focusable id="input-folder-path">
                        <input
                          type="text"
                          className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                          placeholder="/home/user/movies or D:\Downloads\Tv_Shows"
                          value={newFolderPath}
                          onChange={(e) => {
                            setNewFolderPath(e.target.value);
                            if (folderNotification) setFolderNotification(null);
                          }}
                          onFocus={() => useStore.getState().setFocusedElement('input-folder-path')}
                        />
                      </Focusable>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 block">Content Classification</label>
                        <Focusable id="select-folder-type">
                          <select
                            className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-3 text-xs font-mono text-white/80 focus:outline-none focus:border-indigo-500/50"
                            value={newFolderType}
                            onChange={(e) => setNewFolderType(e.target.value as any)}
                            onFocus={() => useStore.getState().setFocusedElement('select-folder-type')}
                          >
                            <option value="mixed">Mixed Library</option>
                            <option value="movie">Movies Only</option>
                            <option value="tv">TV Shows Only</option>
                          </select>
                        </Focusable>
                      </div>

                      <div className="space-y-2 flex flex-col justify-end">
                        <Focusable id="btn-add-folder">
                          <button
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-mono text-[10px] uppercase font-bold tracking-widest rounded-xl transition-all"
                            onClick={() => {
                              if (!newFolderPath.trim()) {
                                setFolderNotification({ message: "Error: Please specify a folder path directory.", type: "error" });
                                return;
                              }
                              addMonitoredFolder({
                                path: newFolderPath.trim(),
                                type: newFolderType
                              });
                              setNewFolderPath('');
                              setFolderNotification({ message: "Registered monitored directory successfully! Launch 'monitor' to pull files.", type: "success" });
                            }}
                          >
                            Register Path
                          </button>
                        </Focusable>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-[10px] font-mono text-white/50 space-y-1.5">
                      <p className="font-bold text-white/70">🔍 Sandbox Preview Notice:</p>
                      <p className="leading-relaxed">
                        Since this applet displays inside a secure internet container, you can type in ANY folder path to test! Our simulated file generator matches common movies/TV series (e.g., Sintel, Interstellar, Breaking Bad, Supernatural) when scanning paths to provide a realistic Plex monitoring feel!
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Monitored source list */}
                  <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                    <h3 className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-bold flex items-center justify-between">
                      <span>Monitored Sources ({monitoredFolders.length})</span>
                      {monitoredFolders.length > 0 && scanningFolderId === null && (
                        <Focusable id="btn-sync-all-folders">
                          <button 
                            className="text-[9px] uppercase font-bold tracking-widest text-indigo-300 hover:text-white flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 rounded"
                            onClick={() => {
                              monitoredFolders.forEach(folder => runFolderScan(folder));
                            }}
                          >
                            <RefreshCw className="w-3 h-3 animate-pulse" /> Sync All
                          </button>
                        </Focusable>
                      )}
                    </h3>

                    {monitoredFolders.length === 0 ? (
                      <div className="border border-dashed border-white/5 bg-black/10 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-4 text-white/40">
                        <Layers className="w-8 h-8 text-white/20" />
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wider">No sources monitored</p>
                          <p className="text-[10px] mt-1 text-white/30 max-w-xs mx-auto leading-relaxed">
                            Register your personal media directories on the left column to build your local library of movies and series.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {monitoredFolders.map((folder) => {
                          const isScanningThis = scanningFolderId === folder.id;
                          return (
                            <div 
                              key={folder.id}
                              className={`p-4 rounded-xl border bg-afterglow-card/40 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                isScanningThis ? 'border-indigo-500/50 bg-indigo-950/10' : 'border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex gap-2 items-center">
                                  <span className={`text-[8px] font-mono border px-1.5 py-0.2 rounded font-black tracking-widest uppercase ${
                                    folder.type === 'movie' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                                    folder.type === 'tv' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                    'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                  }`}>
                                    {folder.type.toUpperCase()} CONTENT
                                  </span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    folder.status === 'scanning' ? 'bg-indigo-400 animate-ping' :
                                    folder.status === 'unreachable' ? 'bg-red-400' : 'bg-emerald-400'
                                  }`} />
                                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                                    {folder.status === 'scanning' ? 'SYNCING...' : folder.status === 'unreachable' ? 'PERMDENIED / NOFILES' : 'MONITORING'}
                                  </span>
                                </div>
                                
                                <h4 className="text-xs font-mono font-bold text-white/90 mt-1.5 truncate max-w-md sm:max-w-xs xl:max-w-md">
                                  {folder.path}
                                </h4>
                                
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-mono text-white/40 mt-1">
                                  <span>FILES: {folder.fileCount || 0}</span>
                                  {folder.lastScanned && (
                                    <span>• LAST SYNC: {folder.lastScanned}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                                <Focusable id={`btn-scan-folder-${folder.id}`}>
                                  <button
                                    className={`px-3 py-1.5 font-mono text-[9px] uppercase font-bold tracking-widest rounded-lg border flex items-center gap-1.5 ${
                                      isScanningThis ? 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300' : 'bg-indigo-600/15 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
                                    }`}
                                    onClick={() => runFolderScan(folder)}
                                    disabled={scanningFolderId !== null}
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isScanningThis ? 'animate-spin' : ''}`} />
                                    <span>{isScanningThis ? 'Scanning...' : 'Monitor now'}</span>
                                  </button>
                                </Focusable>

                                <Focusable id={`btn-delete-folder-${folder.id}`}>
                                  <button
                                    className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-mono text-[9px] uppercase font-bold"
                                    onClick={() => removeMonitoredFolder(folder.id)}
                                    disabled={scanningFolderId !== null}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </Focusable>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {scanningFolderId && scannedFilesProgress.total > 0 && (
                      <div className="border border-indigo-500/20 bg-indigo-950/20 rounded-2xl p-4 space-y-2 animate-fade-in text-left">
                        <div className="flex justify-between items-center text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> Catalog indexing pipeline running...
                          </span>
                          <span>{scannedFilesProgress.current} / {scannedFilesProgress.total}</span>
                        </div>
                        <div className="relative w-full bg-black/40 h-2 rounded overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-300 rounded" 
                            style={{ width: `${(scannedFilesProgress.current / scannedFilesProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-mono text-white/50 truncate">
                          File: <span className="text-white">{scannedFilesProgress.file}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Case: Tab rendering lists */
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
                {activeTab === 'shows' ? (
                  // Map TV series cards
                  Object.entries(groupedTVShows).map(([seriesName, groupValue], idx) => {
                    const group = groupValue as { info: MediaMetadata | null; episodes: MediaMetadata[] };
                    const firstEp = group.episodes[0];
                    const poster = group.info?.posterUrl || firstEp?.posterUrl || "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80";
                    const isManson = seriesName.toLowerCase().includes("manson");
                    return (
                      <Focusable 
                        key={seriesName} 
                        id={`tv-series-card-${idx}`}
                        onEnter={() => setViewingShowSeriesName(seriesName)}
                      >
                        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-3 hover:border-indigo-500/30 hover:bg-afterglow-card/60 transition-all text-left flex flex-col gap-3 group relative overflow-hidden h-full select-none cursor-pointer">
                          <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-black/40 relative">
                            <img 
                              src={poster} 
                              alt="Poster" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                              <span className="text-[9px] font-mono bg-indigo-600 border border-indigo-400/40 text-white px-2 py-0.5 rounded font-bold uppercase shrink-0">
                                {group.episodes.length} Episodes
                              </span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-tight text-white/90 line-clamp-1">
                              {seriesName}
                            </h4>
                            <span className="text-[9px] font-mono text-white/40 mt-1 block">
                              TV SHOW SERIES
                            </span>
                          </div>
                        </div>
                      </Focusable>
                    );
                  })
                ) : (
                  // Map standard Movies / Recent arrays
                  sortedItems.map((item, idx) => {
                    const hasHighConfidence = item.confidenceScore >= 80 || item.userEditedOverride;
                    const isManson = item.rawTitle.toLowerCase().includes("manson");
                    return (
                      <Focusable 
                        key={idx} 
                        id={`id-lib-item-${idx}`} 
                        onEnter={() => setSelectedItem(item)}
                      >
                        <div className={`bg-afterglow-card/40 border rounded-2xl p-3 transition-all text-left flex flex-col gap-3 group relative overflow-hidden h-full select-none cursor-pointer ${selectedItem?.rawTitle === item.rawTitle ? 'border-indigo-500' : 'border-white/5 hover:border-white/10'}`}>
                          <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-black/45 relative">
                            <img 
                              src={item.posterUrl} 
                              alt="Poster URL" 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Confidence indicators overlay */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded font-black tracking-widest uppercase border ${hasHighConfidence ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                {hasHighConfidence ? "VERIFIED MATCH" : "WEAK ASSISTANCE"}
                              </span>
                            </div>

                            {/* Hover Details Button */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 bg-indigo-600 rounded-lg text-[9px] font-mono tracking-widest font-black uppercase shadow-lg select-none">
                                View Inspector
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-black uppercase text-white/90 line-clamp-1 tracking-tight">
                              {item.displayTitle}
                            </h4>
                            <div className="flex gap-2 items-center text-[9px] font-mono text-white/40 mt-1">
                              <span>{item.mediaType.toUpperCase()}</span>
                              {item.year && <span>• {item.year}</span>}
                            </div>
                          </div>
                        </div>
                      </Focusable>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar Detail Inspector Panel */}
          {selectedItem && (
            <div className="w-80 bg-afterglow-card/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto shrink-0 animate-fade-in text-left">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-mono text-white/50 tracking-widest uppercase">
                  MEDIA METADATA INSPECTOR
                </h3>
                <button 
                  onClick={() => setSelectedItem(null)} 
                  className="text-white/40 hover:text-white text-xs font-mono"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 bg-black/40">
                <img 
                  src={selectedItem.posterUrl} 
                  alt="Poster" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 px-2.5 py-0.5 rounded-full uppercase font-bold">
                  {selectedItem.mediaType.toUpperCase()}
                </span>
                <h3 className="text-base font-black tracking-tight text-white/95 leading-tight uppercase mt-2">
                  {selectedItem.displayTitle}
                </h3>
                {selectedItem.year && (
                  <p className="text-xs font-mono text-white/50">Year: {selectedItem.year}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Focusable id="btn-inspector-play" onEnter={() => handlePlayMedia(selectedItem)}>
                  <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-glow flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 fill-current" /> Play Media
                  </button>
                </Focusable>

                <Focusable id="btn-inspector-correct" onEnter={() => handleOpenEdit(selectedItem)}>
                  <button className="w-full py-2.5 bg-zinc-800/80 border border-white/10 hover:bg-zinc-700/80 text-white font-mono text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5">
                    <Edit className="w-3.5 h-3.5" /> Correct Match
                  </button>
                </Focusable>
              </div>

              {/* Match Diagnostics */}
              <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">RAW FILENAME:</span>
                  <span className="text-white/70 font-mono text-[9px] truncate max-w-[65%] leading-none text-right block" title={selectedItem.rawTitle}>
                    {selectedItem.rawTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">CONFIDENCE SCORE:</span>
                  <span className={`font-mono text-[9px] font-bold ${selectedItem.confidenceScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedItem.confidenceScore}% {selectedItem.userEditedOverride ? '(User Forced)' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-mono text-[9px]">METADATA PROVIDER:</span>
                  <span className="text-white/70 font-mono text-[9px]">
                    {selectedItem.metadataProvider} ({selectedItem.metadataId})
                  </span>
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-white/30 uppercase block font-bold">Synopsis Overview</span>
                <p className="text-xs text-white/75 leading-relaxed bg-black/10 p-3 rounded-xl border border-white/5">
                  {selectedItem.overview || 'No plot summary available. Use manual correct mapping values.'}
                </p>
              </div>

              {/* Genres Tag block */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-white/30 uppercase block font-bold">Categories</span>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.genres.map(g => (
                    <span key={g} className="text-[9px] font-mono bg-white/5 px-2 py-0.5 rounded text-white/70 uppercase">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Semantic Grouping suggestion using calculateMiniLMSimilarity */}
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2 mt-1">
                <span className="text-[9.5px] font-mono text-indigo-300 uppercase tracking-widest block font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Semantic Neighbors in Vault
                </span>
                
                {semanticNeighbors.length === 0 ? (
                  <span className="text-[9px] font-mono text-white/20 block">
                    No related text vectors found.
                  </span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {semanticNeighbors.map((neighbor, idx) => (
                      <div 
                        key={idx}
                        className="flex justify-between items-center text-xs p-1.5 hover:bg-white/5 rounded cursor-pointer group"
                        onClick={() => setSelectedItem(neighbor.item)}
                      >
                        <span className="text-white/70 text-[10px] font-mono truncate max-w-[75%] block group-hover:text-indigo-300">
                          {neighbor.item.displayTitle}
                        </span>
                        <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.1 rounded font-bold">
                          {Math.round(neighbor.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Correct Match / Editing Overlay Dialog Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-afterglow-card border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 text-left flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-medium text-base uppercase tracking-wider">
                  Correct Library Match
                </h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="text-white/40 hover:text-white font-mono text-xs"
              >
                [ESC CLOSE]
              </button>
            </div>

            <p className="text-[10px] font-mono text-white/40 -mt-1 uppercase">
              REWRITE METADATA FOR: "{editingItem.rawTitle}"
            </p>

            {/* Quick Autocomplete Index Assist */}
            <div className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
              <span className="text-[9.5px] font-mono text-indigo-300 uppercase tracking-widest block font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> High Confidence Reference Database Matches
              </span>
              <p className="text-[9px] font-mono text-white/30 -mt-0.5">Quick-match this IPTV feed with verified offline blockbuster registries:</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.keys(LOCAL_METADATA_INDEX).map(titleKey => (
                  <button 
                    key={titleKey}
                    onClick={() => handleAutocompleteSearch(titleKey)}
                    className="px-2 py-1 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 rounded text-[9px] font-mono text-white/60 uppercase border border-white/5"
                  >
                    + {titleKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Edit Form elements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Media Classification Type</span>
                <select 
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                >
                  <option value="movie">Movie Catalog Entry</option>
                  <option value="tv_show">TV Show Series</option>
                  <option value="tv_episode">TV Show Specific Episode</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Clean Display Title</span>
                <input 
                  type="text"
                  placeholder="e.g. Supernatural"
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              {editType === 'tv_episode' && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Show Series Name</span>
                    <input 
                      type="text"
                      className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                      value={editShowTitle}
                      onChange={(e) => setEditShowTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Episode Web-Title Name</span>
                    <input 
                      type="text"
                      placeholder="e.g. Proverbs 17:3"
                      className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                      value={editEpisodeTitle}
                      onChange={(e) => setEditEpisodeTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Season Number</span>
                    <input 
                      type="number"
                      className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                      value={editSeason}
                      onChange={(e) => setEditSeason(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Episode Number</span>
                    <input 
                      type="number"
                      className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                      value={editEpisode}
                      onChange={(e) => setEditEpisode(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Release Year Match</span>
                <input 
                  type="number"
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                  value={editYear}
                  onChange={(e) => setEditYear(parseInt(e.target.value) || 2024)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Custom Genres (comma-separated)</span>
                <input 
                  type="text"
                  placeholder="e.g. Action, Drama, Sci-Fi"
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white"
                  value={editGenres}
                  onChange={(e) => setEditGenres(e.target.value)}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Custom Poster URL</span>
                <input 
                  type="text"
                  placeholder="e.g. https://images.unsplash.com/your-poster"
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white w-full"
                  value={editPoster}
                  onChange={(e) => setEditPoster(e.target.value)}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-white/40 uppercase">Plot Summary / Overview</span>
                <textarea 
                  rows={3}
                  className="bg-black/50 border border-white/10 rounded-lg p-2.5 outline-none focus:border-indigo-500 text-xs text-white resize-none"
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-2">
              <button 
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-mono font-bold tracking-widest text-[#bbb] hover:bg-white/10"
              >
                Cancel
              </button>
              
              <button 
                onClick={handleSaveCorrection}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/40 text-xs font-mono font-black uppercase tracking-widest text-white rounded-xl shadow-glow"
              >
                Apply Overrides
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
