import React, { useMemo, useRef, useState } from 'react';
import { format, addHours, startOfHour, isWithinInterval } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import { HelpCircle, Layers, Radio, Sparkles, Filter } from 'lucide-react';
import { Focusable } from '../common/Focusable';
import { useStore } from '../../store/useStore';
import { generateMockProgramsForChannel } from '../../utils/epgGenerator';

interface EPGProgram {
  start: Date;
  end: Date;
  title: string;
  description?: string;
}

const HOUR_WIDTH = 300; // Pixels per hour

export const GuideGrid: React.FC = () => {
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const playlists = useStore(state => state.playlists);
  const setCurrentChannel = useStore(state => state.setCurrentChannel);
  const setPreFetchUrl = useStore(state => state.setPreFetchUrl);
  const epgData = useStore(state => state.epgData);

  // EPG Vault Injector Reactive Hook Bindings
  const isEpgInjectEnabled = useStore(state => state.isEpgInjectEnabled);
  const epgInjectMode = useStore(state => state.epgInjectMode);
  const epgInjectChannels = useStore(state => state.epgInjectChannels);
  const epgInjectSlots = useStore(state => state.epgInjectSlots);
  const epgInjectAlgoDensity = useStore(state => state.epgInjectAlgoDensity);
  const mediaLibrary = useStore(state => state.mediaLibrary);

  const playlist = useMemo(() => playlists.find(p => p.id === currentPlaylistId), [playlists, currentPlaylistId]);
  
  const [selectedGroup, setSelectedGroup] = useState('All');
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Filter channels to only include Live channels (and filter out VOD elements)
  const liveChannels = useMemo(() => {
    if (!playlist) return [];
    return playlist.channels.filter(ch => ch.type !== 'vod');
  }, [playlist]);

  // Extract all unique group names for category ribbon filters
  const groups = useMemo(() => {
    const set = new Set<string>();
    liveChannels.forEach(ch => {
      if (ch.group) set.add(ch.group);
    });
    return ['All', ...Array.from(set)];
  }, [liveChannels]);

  // Filter channels based on selected group in category ribbon
  const filteredChannels = useMemo(() => {
    if (selectedGroup === 'All') return liveChannels;
    return liveChannels.filter(ch => ch.group === selectedGroup);
  }, [liveChannels, selectedGroup]);

  const hours = useMemo(() => {
    const start = startOfHour(new Date());
    return Array.from({ length: 24 }, (_, i) => addHours(start, i));
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredChannels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 10,
  });

  const getProgramsForChannel = (tvgId: string | undefined) => {
    if (!tvgId) return [];
    
    let programs: any[] = [];
    const stored = epgData[tvgId];
    if (stored && stored.length > 0) {
      programs = stored.map(p => ({
          ...p,
          start: new Date(p.start), // Ensure Date objects
          end: new Date(p.end)
      }));
    } else {
      // Automatically generate nice deterministic schedules for active channels!
      programs = generateMockProgramsForChannel(
        tvgId, 
        new Date(),
        isEpgInjectEnabled,
        epgInjectMode,
        epgInjectChannels,
        epgInjectSlots,
        epgInjectAlgoDensity,
        mediaLibrary
      );
    }

    // Apply EPG substitution logic to imported guide data if any
    if (stored && stored.length > 0 && isEpgInjectEnabled && mediaLibrary && mediaLibrary.length > 0) {
      const isChannelAllowed = !epgInjectChannels || epgInjectChannels.length === 0 || epgInjectChannels.includes(tvgId);
      if (isChannelAllowed) {
        programs = programs.map(p => {
          let title = p.title;
          let description = p.description;
          let isInjected = false;

          if (epgInjectMode === 'manual' && epgInjectSlots && epgInjectSlots.length > 0) {
            const slotHour = p.start.getHours();
            const matchedSlot = epgInjectSlots.find(slot => slot.channelId === tvgId && slot.hour === slotHour);
            if (matchedSlot) {
              title = `${matchedSlot.mediaTitle}`;
              description = `[Vault Special Selection] This program slot is overridden with your custom media file. Enjoy uninterrupted playback of your personal Vault library directly through IPTV.`;
              isInjected = true;
            }
          } else if (epgInjectMode === 'algorithmic') {
            const density = epgInjectAlgoDensity ?? 30;
            const hashInput = `${tvgId}-${p.start.getFullYear()}-${p.start.getMonth()}-${p.start.getDate()}-${p.start.getHours()}`;
            let hash = 0;
            for (let k = 0; k < hashInput.length; k++) {
              hash = (hash * 31 + hashInput.charCodeAt(k)) % 10000;
            }
            if ((hash % 100) < density) {
              const vaultIndex = hash % mediaLibrary.length;
              const chosenItem = mediaLibrary[vaultIndex];
              title = `${chosenItem.displayTitle}`;
              description = `[Vault Auto-Substitute] Autopilot selected this slot on ${tvgId} to broadcast "${chosenItem.displayTitle}" from your connected media storage. Fully synchronized starting from the schedule offset.`;
              isInjected = true;
            }
          }

          return { ...p, title, description, isInjectedVaultMedia: isInjected };
        });
      }
    }

    return programs;
  };

  return (
    <div className="w-full h-full flex flex-col bg-afterglow-bg">
      
      {/* Category Ribbon */}
      <div className="h-12 bg-black/40 border-b border-white/5 flex items-center px-4 gap-3 overflow-x-auto shrink-0 scrollbar-none select-none z-30">
        <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-mono tracking-widest border-r border-white/5 pr-3 mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-afterglow-primary" />
          <span>GROUPS</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none shrink-0">
          {groups.slice(0, 45).map((g, idx) => (
            <Focusable
              key={g}
              id={`guide-group-${idx}`}
              className={`px-3 py-1 text-[10px] font-mono whitespace-nowrap tracking-wider rounded-lg transition-all ${selectedGroup === g ? 'bg-white/10 text-afterglow-primary font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              onEnter={() => {
                setSelectedGroup(g);
                rowVirtualizer.scrollToIndex(0);
              }}
            >
              {g ? g.toUpperCase() : "GENERAL"}
            </Focusable>
          ))}
        </div>
      </div>

      {/* Time Header */}
      <div className="h-10 flex bg-afterglow-card/50 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0 shrink-0 select-none">
        <div className="w-48 flex-shrink-0 border-r border-white/10 flex items-center justify-center font-mono text-[10px] text-white/40 tracking-widest uppercase">
          CHANNEL SIGNAL
        </div>
        <div className="flex overflow-hidden">
          {hours.map((hour, i) => (
            <div 
              key={i} 
              className="flex-shrink-0 flex items-center justify-center font-mono text-[9px] tracking-widest text-white/30 uppercase"
              style={{ width: HOUR_WIDTH }}
            >
              {format(hour, 'HH:mm')}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div 
        ref={parentRef}
        className="flex-grow overflow-y-auto overflow-x-hidden min-h-0"
      >
        {filteredChannels.length ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const channel = filteredChannels[virtualRow.index];
              const channelPrograms = getProgramsForChannel(channel.tvgId);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex border-b border-white/5"
                >
                  <Focusable
                    id={`channel-${virtualRow.index}`}
                    className="w-48 h-full flex-shrink-0 bg-afterglow-card/90 border-r border-white/10 p-2.5 flex items-center gap-3 z-10 hover:bg-white/5 transition-colors"
                    onEnter={() => setCurrentChannel(channel)}
                    onFocus={() => {
                      setPreFetchUrl(channel.url);
                    }}
                  >
                    {channel.logo ? (
                      <img 
                        src={channel.logo} 
                        alt="" 
                        className="w-9 h-9 object-contain rounded bg-black/30 p-0.5 border border-white/5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-neutral-900 rounded border border-white/5 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold truncate tracking-tight text-white/95 leading-snug">{channel.name}</span>
                      <span className="text-[8.5px] text-white/30 uppercase font-mono truncate tracking-wider">{channel.group || 'General'}</span>
                    </div>
                  </Focusable>

                  <div className="flex relative items-center">
                    {hours.map((hour, i) => {
                        const currentProgram = channelPrograms.find(p => 
                            isWithinInterval(hour, { start: p.start, end: p.end })
                        );

                        return (
                            <div 
                                key={i} 
                                className="h-full border-r border-white/5 p-3 flex flex-col justify-center overflow-hidden"
                                style={{ width: HOUR_WIDTH }}
                            >
                                <div className="flex items-center gap-1.5 min-w-0 w-full mb-0.5">
                                    <span className="text-xs font-semibold text-white/80 truncate flex-grow">
                                        {currentProgram?.title || "Program Schedule Broadcast..."}
                                    </span>
                                    {currentProgram?.isInjectedVaultMedia && (
                                        <span className="shrink-0 bg-indigo-500/20 border border-indigo-500/40 px-1 py-0.5 rounded text-[7px] font-mono text-indigo-300 font-black tracking-widest uppercase label-badge scale-95 origin-right">
                                            VAULT INJECT
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-white/45 font-mono">
                                    {currentProgram 
                                        ? `${format(currentProgram.start, 'HH:mm')} - ${format(currentProgram.end, 'HH:mm')}`
                                        : `${format(hour, 'HH:mm')} - ${format(addHours(hour, 1), 'HH:mm')}`
                                    }
                                </span>
                            </div>
                        );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-48 flex flex-col items-center justify-center gap-3 opacity-50">
            <Layers className="w-10 h-10 text-afterglow-primary animate-pulse" />
            <span className="font-mono tracking-[0.2em] text-[10px] uppercase text-white/60">No Live Broadcast Channels Linked</span>
          </div>
        )}
      </div>
    </div>
  );
};
