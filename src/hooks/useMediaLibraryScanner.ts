import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { performLocalOnDeviceMatch } from '../utils/localMetadataDatabase';

export const useMediaLibraryScanner = () => {
  const playlists = useStore(state => state.playlists);
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const mediaLibrary = useStore(state => state.mediaLibrary);
  const updateMediaMetadata = useStore(state => state.updateMediaMetadata);
  const libraryScannerStatus = useStore(state => state.libraryScannerStatus);
  const setLibraryScannerStatus = useStore(state => state.setLibraryScannerStatus);
  const isBackgroundEnrichmentEnabled = useStore(state => state.isBackgroundEnrichmentEnabled);

  const scanQueueRef = useRef<any[]>([]);
  const scanIndexRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);

  // 1. Identify raw VOD channels from the playlist
  const getRawVODChannels = useCallback(() => {
    if (!currentPlaylist) return [];
    return currentPlaylist.channels.filter(ch => {
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
  }, [currentPlaylist]);

  // 2. Stop/Cancel active scans safely
  const stopScan = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 3. Main processing loop iterator block
  const processNextItem = useCallback(() => {
    const queue = scanQueueRef.current;
    const index = scanIndexRef.current;

    if (index >= queue.length) {
      stopScan();
      setLibraryScannerStatus('completed', { total: queue.length, processed: queue.length, currentItemName: 'Scan finished.' });
      return;
    }

    const item = queue[index];
    scanIndexRef.current = index + 1;

    // Process on-device deterministic matcher
    const match = performLocalOnDeviceMatch(item.name, currentPlaylist?.name || 'IPTV Channel Feed');
    
    // Save to local storage database store asynchronously
    updateMediaMetadata(item.name, match);

    // Update progress state
    setLibraryScannerStatus('scanning', {
      total: queue.length,
      processed: index + 1,
      currentItemName: item.name
    });
  }, [currentPlaylist, updateMediaMetadata, setLibraryScannerStatus, stopScan]);

  // 4. Start a fresh background metadata catalog scan
  const startScan = useCallback((forceAll: boolean = false) => {
    stopScan();
    const allVOD = getRawVODChannels();
    if (allVOD.length === 0) {
      setLibraryScannerStatus('idle');
      return;
    }

    // Filter out items already matched/processed to avoid reprocessing unchanged items
    const targetQueue = forceAll 
      ? allVOD 
      : allVOD.filter(ch => {
          const matched = mediaLibrary.find(m => m.rawTitle === ch.name);
          // Only reprocess if matched confidence score is low and they are not users edits has been made
          return !matched || (matched.confidenceScore < 40 && !matched.userEditedOverride);
        });

    if (targetQueue.length === 0) {
      setLibraryScannerStatus('completed', { total: allVOD.length, processed: allVOD.length, currentItemName: 'All items already synced.' });
      return;
    }

    scanQueueRef.current = targetQueue;
    scanIndexRef.current = 0;
    
    setLibraryScannerStatus('scanning', {
      total: targetQueue.length,
      processed: 0,
      currentItemName: targetQueue[0].name
    });

    // Run item-by-item metadata parser interval which runs quietly in the background (150ms per item)
    timerRef.current = setInterval(() => {
      processNextItem();
    }, 180);
  }, [getRawVODChannels, mediaLibrary, stopScan, setLibraryScannerStatus, processNextItem]);

  // 5. Autostart triggers on Playlist Sync / App Start
  useEffect(() => {
    if (!currentPlaylist || !isBackgroundEnrichmentEnabled) {
      stopScan();
      return;
    }

    // Silent delay run
    const delayTimer = setTimeout(() => {
      startScan(false);
    }, 4500);

    return () => {
      clearTimeout(delayTimer);
      stopScan();
    };
  }, [currentPlaylistId, isBackgroundEnrichmentEnabled]);

  return {
    rawVODCount: getRawVODChannels().length,
    startScan,
    stopScan,
    libraryScannerStatus
  };
};
