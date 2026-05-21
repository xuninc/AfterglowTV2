import React, { useState, useMemo } from 'react';
import { Radio, CalendarClock, Download, Trash2, Calendar, Play, Clock, Sparkles } from 'lucide-react';
import { Focusable } from '../common/Focusable';
import { useStore, DVRJob, DVRRecording } from '../../store/useStore';

export const DVRPanel: React.FC = () => {
  const currentPlaylistId = useStore(state => state.currentPlaylistId);
  const playlists = useStore(state => state.playlists);
  const dvrSchedule = useStore(state => state.dvrSchedule);
  const dvrRecordings = useStore(state => state.dvrRecordings);
  
  const scheduleRecording = useStore(state => state.scheduleRecording);
  const cancelScheduledRecording = useStore(state => state.cancelScheduledRecording);
  const deleteRecording = useStore(state => state.deleteRecording);
  const setCurrentChannel = useStore(state => state.setCurrentChannel);

  const playlist = useMemo(() => playlists.find(p => p.id === currentPlaylistId), [playlists, currentPlaylistId]);

  // Form states
  const [targetChannelIndex, setTargetChannelIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [duration, setDuration] = useState(15);
  const [startDelay, setStartDelay] = useState(1); // 1 = in 1 min, 5 = in 5, etc.
  
  const handleCreateSchedule = () => {
    if (!playlist || playlist.channels.length === 0) return;
    const ch = playlist.channels[targetChannelIndex];
    
    scheduleRecording({
      channelName: ch.name,
      streamUrl: ch.url,
      startTime: new Date(Date.now() + startDelay * 60 * 1000).toISOString(),
      durationMinutes: duration,
      programTitle: customTitle || `${ch.name} - Recorded Schedule`
    });

    setCustomTitle('');
  };

  return (
    <div className="w-full h-full bg-afterglow-bg p-6 text-white overflow-y-auto flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4 shrink-0">
        <Radio className="w-7 h-7 text-afterglow-primary animate-pulse" />
        <div>
          <h2 className="text-xl font-display font-black tracking-wider uppercase">DVR.REC // MANAGEMENT</h2>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Digital stream recording schedulers & content capture hubs</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-grow overflow-y-auto">
        
        {/* DVR Booker Column */}
        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <CalendarClock className="w-4 h-4 text-afterglow-primary" />
            <h3 className="text-xs font-mono tracking-wider text-white/60 uppercase">BOOK LIVE CAPTURE</h3>
          </div>

          {playlist?.channels.length ? (
            <div className="flex flex-col gap-3.5">
              
              {/* Select target channel */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-white/30 uppercase pl-1">Target Channel</span>
                <Focusable id="input-dvr-ch-select" className="w-full">
                  <select 
                    className="w-full bg-black/40 border border-white/5 text-xs rounded-xl p-3 outline-none text-white focus:border-afterglow-primary"
                    value={targetChannelIndex}
                    onChange={(e) => setTargetChannelIndex(Number(e.target.value))}
                    onFocus={() => useStore.getState().setFocusedElement('input-dvr-ch-select')}
                  >
                    {playlist.channels.map((ch, idx) => (
                      <option key={idx} value={idx} className="bg-neutral-900 text-white text-xs">
                        {ch.name} ({ch.group})
                      </option>
                    ))}
                  </select>
                </Focusable>
              </div>

              {/* Record title name */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono text-white/30 uppercase pl-1">Recording Segment Name</span>
                <Focusable id="input-dvr-title" className="w-full">
                  <input 
                    type="text" 
                    placeholder="E.g., Formula 1 Grand Prix 2026"
                    className="w-full text-xs font-light bg-black/40 border border-white/5 rounded-xl p-3 outline-none focus:border-afterglow-primary text-white"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onFocus={() => useStore.getState().setFocusedElement('input-dvr-title')}
                  />
                </Focusable>
              </div>

              {/* Timing constraints */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-white/30 uppercase pl-1">Starts In (Minutes)</span>
                  <Focusable id="input-dvr-start" className="w-full">
                    <input 
                      type="number" 
                      min="1"
                      className="w-full text-xs font-light bg-black/40 border border-white/5 rounded-xl p-3 outline-none focus:border-afterglow-primary text-white"
                      value={startDelay}
                      onChange={(e) => setStartDelay(Number(e.target.value))}
                      onFocus={() => useStore.getState().setFocusedElement('input-dvr-start')}
                    />
                  </Focusable>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-white/30 uppercase pl-1">Duration (Minutes)</span>
                  <Focusable id="input-dvr-duration" className="w-full">
                    <input 
                      type="number" 
                      min="1"
                      className="w-full text-xs font-light bg-black/40 border border-white/5 rounded-xl p-3 outline-none focus:border-afterglow-primary text-white"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      onFocus={() => useStore.getState().setFocusedElement('input-dvr-duration')}
                    />
                  </Focusable>
                </div>
              </div>

              {/* Trigger schedule */}
              <Focusable 
                id="btn-dvr-submit"
                className="w-full afterglow-gradient p-3 text-center text-xs font-mono font-bold tracking-widest uppercase rounded-xl text-white shadow-glow"
                onEnter={handleCreateSchedule}
              >
                SCHEDULE BROADCAST RECORDING
              </Focusable>
            </div>
          ) : (
            <div className="text-center text-white/20 text-xs font-mono py-8">
              No synced channel signals to record.
            </div>
          )}
        </div>

        {/* Pending Recording Queues */}
        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Clock className="w-4 h-4 text-afterglow-primary" />
            <h3 className="text-xs font-mono tracking-wider text-white/60 uppercase">PENDING CAPTURES ({dvrSchedule.length})</h3>
          </div>

          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto">
            {dvrSchedule.map((job) => (
              <div key={job.id} className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-semibold text-white/80">{job.programTitle}</span>
                  </div>
                  <span className="text-[9px] font-mono text-white/40 uppercase block mt-1">Channel: {job.channelName}</span>
                  <span className="text-[9px] font-mono text-amber-500/60 block">In {Math.round((new Date(job.startTime).getTime() - Date.now()) / 60000)}m · Duration: {job.durationMinutes}m</span>
                </div>

                <Focusable 
                  id={`btn-dvr-cancel-${job.id}`}
                  className="p-2 text-white/40 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-lg shrink-0"
                  onEnter={() => cancelScheduledRecording(job.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Focusable>
              </div>
            ))}

            {dvrSchedule.length === 0 && (
              <div className="text-center py-10 flex flex-col items-center gap-2 opacity-30">
                <CalendarClock className="w-8 h-8 font-light" />
                <span className="text-[10px] font-mono">NO ACTIVE CAPTURE TRIGGERS</span>
              </div>
            )}
          </div>
        </div>

        {/* Completed Recordings Library */}
        <div className="bg-afterglow-card/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Download className="w-4 h-4 text-afterglow-primary" />
            <h3 className="text-xs font-mono tracking-wider text-white/60 uppercase">RECORDED LIBRARY ({dvrRecordings.length})</h3>
          </div>

          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto">
            {dvrRecordings.map((rec) => (
              <div key={rec.id} className="bg-black/30 border border-white/5 p-3.5 rounded-xl flex items-center justify-between gap-2">
                <div className="flex-grow min-w-0">
                  <span className="text-xs font-semibold text-white truncate block">{rec.title}</span>
                  <div className="flex items-center gap-3 text-[9px] font-mono text-white/30 mt-1">
                    <span className="text-afterglow-primary">{rec.channelName}</span>
                    <span>{rec.duration}</span>
                  </div>
                  <span className="text-[7.5px] font-mono text-white/15 block truncate mt-0.5">{rec.fileSize || '254 MB'} · Local Rec Cache</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Focusable 
                    id={`btn-dvr-play-rec-${rec.id}`}
                    className="p-2 text-afterglow-primary bg-afterglow-primary/10 hover:bg-afterglow-primary/25 rounded-lg"
                    onEnter={() => setCurrentChannel({
                      name: rec.title,
                      url: rec.streamUrl,
                      group: "DVR Recordings"
                    })}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </Focusable>

                  <Focusable 
                    id={`btn-dvr-del-rec-${rec.id}`}
                    className="p-2 text-white/30 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-lg"
                    onEnter={() => deleteRecording(rec.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Focusable>
                </div>
              </div>
            ))}

            {dvrRecordings.length === 0 && (
              <div className="text-center py-10 flex flex-col items-center gap-2 opacity-30">
                <Download className="w-8 h-8 font-light" />
                <span className="text-[10px] font-mono">LIBRARY IS ENTIRELY EMPTY</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer tips */}
      <div className="bg-afterglow-primary/5 border border-afterglow-primary/10 rounded-xl p-4 flex items-center gap-3 shrink-0">
        <Sparkles className="w-5 h-5 text-afterglow-primary shrink-0" />
        <span className="text-[10px] text-white/60 font-mono uppercase tracking-wider leading-relaxed">
          The DVR module supports background logging. When a scheduled capture window clears, the stream manifests are compiled, compressed, and deposited instantly into your local Rec library list!
        </span>
      </div>

    </div>
  );
};
