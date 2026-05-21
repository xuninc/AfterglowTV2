import { create } from 'zustand';
import { MediaMetadata } from '../types/media';

export interface Channel {
  id?: string;
  name: string;
  url: string;
  group: string;
  tvgId?: string;
  logo?: string;
  type?: 'live' | 'vod';
  description?: string;
  duration?: string;
  poster?: string;
  releaseYear?: number;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  epgUrl?: string;
  channels: Channel[];
}

export interface DVRJob {
  id: string;
  channelName: string;
  streamUrl: string;
  startTime: string; // ISO string
  durationMinutes: number;
  status: 'pending' | 'recording' | 'completed' | 'failed';
  programTitle: string;
}

export interface DVRRecording {
  id: string;
  channelName: string;
  title: string;
  streamUrl: string;
  timestamp: string; // Date string
  duration: string;
  fileSize?: string;
}

export interface MonitoredFolder {
  id: string;
  path: string;
  type: 'movie' | 'tv' | 'mixed';
  status: 'active' | 'scanning' | 'unreachable';
  lastScanned?: string;
  fileCount?: number;
}

interface AppState {
  playlists: Playlist[];
  currentPlaylistId: string | null;
  currentChannel: Channel | null;
  isSidebarOpen: boolean;
  focusedElementId: string | null;
  preFetchUrl: string | null;
  epgData: Record<string, any[]>;
  activeView: 'guide' | 'vod' | 'settings' | 'dvr' | 'library';
  activeCategory: string;
  dvrSchedule: DVRJob[];
  dvrRecordings: DVRRecording[];
  
  // Media Library Persistent Database
  mediaLibrary: MediaMetadata[];
  libraryScannerStatus: 'idle' | 'scanning' | 'completed';
  libraryScannerProgress: { total: number; processed: number; currentItemName: string };
  monitoredFolders: MonitoredFolder[];
  
  // Media Enrichment Preferences
  isTitleCleaningEnabled: boolean;
  isMarqueeEnabled: boolean;
  isBackgroundEnrichmentEnabled: boolean;
  vodLayoutMode: 'grid' | 'epg' | 'shelf';
  
  // Subscription / Trial State
  trialStartDate: string;
  isPremium: boolean;
  
  // Actions
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  setCurrentPlaylist: (id: string | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  toggleSidebar: () => void;
  setFocusedElement: (id: string | null) => void;
  setPreFetchUrl: (url: string | null) => void;
  setEpgData: (data: Record<string, any[]>) => void;
  setActiveView: (view: 'guide' | 'vod' | 'settings' | 'dvr' | 'library') => void;
  setActiveCategory: (category: string) => void;
  updatePlaylistChannels: (playlistId: string, channels: Channel[]) => void;
  updatePlaylistEpgUrl: (playlistId: string, epgUrl: string) => void;
  
  // Media Library Database Actions
  setMediaLibrary: (library: MediaMetadata[]) => void;
  updateMediaMetadata: (rawTitle: string, updated: Partial<MediaMetadata>) => void;
  setLibraryScannerStatus: (status: 'idle' | 'scanning' | 'completed', progress?: { total: number; processed: number; currentItemName: string }) => void;
  clearMediaLibrary: () => void;
  addMonitoredFolder: (folder: Omit<MonitoredFolder, 'id' | 'status'>) => void;
  removeMonitoredFolder: (id: string) => void;
  updateMonitoredFolderStatus: (id: string, status: MonitoredFolder['status'], extra?: Partial<MonitoredFolder>) => void;
  
  setTitleCleaningEnabled: (val: boolean) => void;
  setMarqueeEnabled: (val: boolean) => void;
  setBackgroundEnrichmentEnabled: (val: boolean) => void;
  setVodLayoutMode: (mode: 'grid' | 'epg' | 'shelf') => void;
  
  // Premium / Trial Actions
  buyPremium: () => void;
  resetTrial: () => void;
  setTrialStartDate: (date: string) => void;
  
  // DVR Actions
  scheduleRecording: (job: Omit<DVRJob, 'id' | 'status'>) => void;
  cancelScheduledRecording: (id: string) => void;
  deleteRecording: (id: string) => void;
  triggerMockRecordingComplete: (jobId: string) => void;
  resetAll: () => void;
}

// Help loading initial localStorage values
const loadLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const saveLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
};

export const useStore = create<AppState>((set, get) => ({
  playlists: loadLocalStorage<Playlist[]>('glow_playlists', []),
  currentPlaylistId: loadLocalStorage<string | null>('glow_current_playlist_id', null),
  currentChannel: null,
  isSidebarOpen: false,
  focusedElementId: null,
  preFetchUrl: null,
  epgData: {},
  activeView: 'guide',
  activeCategory: 'All',
  
  // Media Library Storage
  mediaLibrary: loadLocalStorage<MediaMetadata[]>('glow_media_library', []),
  libraryScannerStatus: 'idle',
  libraryScannerProgress: { total: 0, processed: 0, currentItemName: '' },
  monitoredFolders: loadLocalStorage<MonitoredFolder[]>('glow_monitored_folders', []),
  
  isTitleCleaningEnabled: loadLocalStorage<boolean>('glow_title_cleaning_enabled', true),
  isMarqueeEnabled: loadLocalStorage<boolean>('glow_marquee_enabled', true),
  isBackgroundEnrichmentEnabled: loadLocalStorage<boolean>('glow_background_enrichment_enabled', true),
  vodLayoutMode: loadLocalStorage<'grid' | 'epg' | 'shelf'>('glow_vod_layout_mode', 'epg'),
  
  // Subscription / Trial State
  trialStartDate: loadLocalStorage<string>('glow_trial_start_date', new Date().toISOString()),
  isPremium: loadLocalStorage<boolean>('glow_is_premium', false),
  
  dvrSchedule: loadLocalStorage<DVRJob[]>('glow_dvr_schedule', [
    {
      id: "mock-dvr-1",
      channelName: "Sintel Cinema Live",
      streamUrl: "https://test-streams.mux.dev/x36xhg/main.m3u8",
      startTime: new Date(Date.now() + 60000).toISOString(), // 1 min from now
      durationMinutes: 30,
      status: "pending",
      programTitle: "The Great Flight of Sintel"
    }
  ]),
  dvrRecordings: loadLocalStorage<DVRRecording[]>('glow_dvr_recordings', [
    {
      id: "mock-rec-1",
      channelName: "NASA HD Public Broadcast",
      title: "Apollo Mission Legacy (Archive)",
      streamUrl: "https://nasa-otv.akamaized.net/hls/live/2026135/NASA-OTV/master.m3u8",
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      duration: "45m 00s",
      fileSize: "682 MB"
    }
  ]),

  addPlaylist: (playlist) => set((state) => {
    const updatedPlaylists = [...state.playlists.filter(p => p.id !== playlist.id), playlist];
    const newCurrentId = state.currentPlaylistId || playlist.id;
    saveLocalStorage('glow_playlists', updatedPlaylists);
    saveLocalStorage('glow_current_playlist_id', newCurrentId);
    
    // Auto-select first live channel
    const liveChannels = playlist.channels.filter(c => !c.type || c.type === 'live');
    const firstChannel = liveChannels.length > 0 ? liveChannels[0] : playlist.channels[0] || null;

    return { 
      playlists: updatedPlaylists,
      currentPlaylistId: newCurrentId,
      currentChannel: state.currentChannel || firstChannel
    };
  }),

  removePlaylist: (id) => set((state) => {
    const remainingPlaylists = state.playlists.filter(p => p.id !== id);
    const fallbackId = remainingPlaylists.length > 0 ? remainingPlaylists[0].id : null;
    saveLocalStorage('glow_playlists', remainingPlaylists);
    saveLocalStorage('glow_current_playlist_id', fallbackId);
    return {
      playlists: remainingPlaylists,
      currentPlaylistId: fallbackId,
      currentChannel: null
    };
  }),
  
  setCurrentPlaylist: (id) => set((state) => {
    saveLocalStorage('glow_current_playlist_id', id);
    const playlist = state.playlists.find(p => p.id === id);
    const liveChannels = playlist ? playlist.channels.filter(c => !c.type || c.type === 'live') : [];
    const firstChannel = liveChannels.length > 0 ? liveChannels[0] : (playlist?.channels[0] || null);
    return { 
      currentPlaylistId: id,
      currentChannel: firstChannel,
      activeCategory: 'All'
    };
  }),
  
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setFocusedElement: (id) => set({ focusedElementId: id }),
  setPreFetchUrl: (url) => set({ preFetchUrl: url }),
  setEpgData: (data) => set({ epgData: data }),
  
  setActiveView: (view) => set({ activeView: view }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  updatePlaylistChannels: (playlistId, channels) => set((state) => {
    const updatedPlaylists = state.playlists.map(p => 
      p.id === playlistId ? { ...p, channels } : p
    );
    saveLocalStorage('glow_playlists', updatedPlaylists);
    return { playlists: updatedPlaylists };
  }),
  
  updatePlaylistEpgUrl: (playlistId, epgUrl) => set((state) => {
    const updatedPlaylists = state.playlists.map(p => 
      p.id === playlistId ? { ...p, epgUrl } : p
    );
    saveLocalStorage('glow_playlists', updatedPlaylists);
    return { playlists: updatedPlaylists };
  }),
  
  // Media Library database mutations
  setMediaLibrary: (mediaLibrary) => {
    saveLocalStorage('glow_media_library', mediaLibrary);
    set({ mediaLibrary });
  },
  
  updateMediaMetadata: (rawTitle, updated) => set((state) => {
    const updatedLib = state.mediaLibrary.map(item => {
      if (item.rawTitle === rawTitle) {
        return { ...item, ...updated };
      }
      return item;
    });
    // If it doesn't exist yet, insert it helper
    const exists = state.mediaLibrary.some(item => item.rawTitle === rawTitle);
    const finalLib = exists ? updatedLib : [...state.mediaLibrary, { rawTitle, ...updated } as MediaMetadata];
    
    saveLocalStorage('glow_media_library', finalLib);
    return { mediaLibrary: finalLib };
  }),
  
  setLibraryScannerStatus: (status, progress) => set((state) => ({
    libraryScannerStatus: status,
    libraryScannerProgress: progress || state.libraryScannerProgress
  })),

  clearMediaLibrary: () => {
    localStorage.removeItem('glow_media_library');
    set({ mediaLibrary: [] });
  },

  addMonitoredFolder: (folder) => set((state) => {
    const newFolder: MonitoredFolder = {
      ...folder,
      id: `folder-${crypto.randomUUID()}`,
      status: 'active',
      fileCount: 0
    };
    const updated = [...state.monitoredFolders, newFolder];
    saveLocalStorage('glow_monitored_folders', updated);
    return { monitoredFolders: updated };
  }),

  removeMonitoredFolder: (id) => set((state) => {
    const updated = state.monitoredFolders.filter(f => f.id !== id);
    saveLocalStorage('glow_monitored_folders', updated);
    return { monitoredFolders: updated };
  }),

  updateMonitoredFolderStatus: (id, status, extra = {}) => set((state) => {
    const updated = state.monitoredFolders.map(f => 
      f.id === id ? { ...f, status, ...extra } : f
    );
    saveLocalStorage('glow_monitored_folders', updated);
    return { monitoredFolders: updated };
  }),
  
  setTitleCleaningEnabled: (val) => {
    saveLocalStorage('glow_title_cleaning_enabled', val);
    set({ isTitleCleaningEnabled: val });
  },
  setMarqueeEnabled: (val) => {
    saveLocalStorage('glow_marquee_enabled', val);
    set({ isMarqueeEnabled: val });
  },
  setBackgroundEnrichmentEnabled: (val) => {
    saveLocalStorage('glow_background_enrichment_enabled', val);
    set({ isBackgroundEnrichmentEnabled: val });
  },
  setVodLayoutMode: (mode) => {
    saveLocalStorage('glow_vod_layout_mode', mode);
    set({ vodLayoutMode: mode });
  },

  buyPremium: () => {
    saveLocalStorage('glow_is_premium', true);
    set({ isPremium: true });
  },

  resetTrial: () => {
    const freshDate = new Date().toISOString();
    saveLocalStorage('glow_trial_start_date', freshDate);
    saveLocalStorage('glow_is_premium', false);
    set({ trialStartDate: freshDate, isPremium: false });
  },

  setTrialStartDate: (date) => {
    saveLocalStorage('glow_trial_start_date', date);
    set({ trialStartDate: date });
  },

  scheduleRecording: (newItem) => set((state) => {
    const job: DVRJob = {
      ...newItem,
      id: `dvr-${crypto.randomUUID()}`,
      status: 'pending'
    };
    const updated = [...state.dvrSchedule, job];
    saveLocalStorage('glow_dvr_schedule', updated);

    // Set a timeout to simulate recording transitions automatically for immediate UX satisfaction!
    setTimeout(() => {
      get().triggerMockRecordingComplete(job.id);
    }, 15000); // Trigger transition in 15 seconds so they can see it record live!

    return { dvrSchedule: updated };
  }),

  cancelScheduledRecording: (id) => set((state) => {
    const updated = state.dvrSchedule.filter(j => j.id !== id);
    saveLocalStorage('glow_dvr_schedule', updated);
    return { dvrSchedule: updated };
  }),

  deleteRecording: (id) => set((state) => {
    const updated = state.dvrRecordings.filter(r => r.id !== id);
    saveLocalStorage('glow_dvr_recordings', updated);
    return { dvrRecordings: updated };
  }),

  triggerMockRecordingComplete: (jobId) => set((state) => {
    const job = state.dvrSchedule.find(j => j.id === jobId);
    if (!job || job.status !== 'pending') return {};

    // transition job to completed and save to recordings!
    const updatedSchedule = state.dvrSchedule.map(j => 
      j.id === jobId ? { ...j, status: 'completed' as const } : j
    );

    const recording: DVRRecording = {
      id: `rec-${crypto.randomUUID()}`,
      channelName: job.channelName,
      title: job.programTitle || `Recorded Broadcast`,
      streamUrl: job.streamUrl,
      timestamp: new Date().toISOString(),
      duration: `${job.durationMinutes}m 00s`,
      fileSize: `${Math.round(job.durationMinutes * 15.4)} MB`
    };

    const updatedRecordings = [recording, ...state.dvrRecordings];
    saveLocalStorage('glow_dvr_schedule', updatedSchedule);
    saveLocalStorage('glow_dvr_recordings', updatedRecordings);

    return {
      dvrSchedule: updatedSchedule,
      dvrRecordings: updatedRecordings
    };
  }),

  resetAll: () => {
    localStorage.removeItem('glow_playlists');
    localStorage.removeItem('glow_current_playlist_id');
    localStorage.removeItem('glow_dvr_schedule');
    localStorage.removeItem('glow_dvr_recordings');
    localStorage.removeItem('glow_media_library');
    localStorage.removeItem('glow_monitored_folders');
    localStorage.removeItem('glow_trial_start_date');
    localStorage.removeItem('glow_is_premium');
    set({
      playlists: [],
      currentPlaylistId: null,
      currentChannel: null,
      preFetchUrl: null,
      epgData: {},
      activeView: 'guide',
      activeCategory: 'All',
      dvrSchedule: [],
      dvrRecordings: [],
      mediaLibrary: [],
      libraryScannerStatus: 'idle',
      libraryScannerProgress: { total: 0, processed: 0, currentItemName: '' },
      monitoredFolders: [],
      trialStartDate: new Date().toISOString(),
      isPremium: false
    });
  }
}));
