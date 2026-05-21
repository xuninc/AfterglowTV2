/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutGrid, Play, Settings, Tv, Disc, Menu, Layers, Rows3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './store/useStore';
import { useTVNavigation } from './hooks/useTVNavigation';
import { SetupScreen } from './components/SetupScreen';
import { Focusable } from './components/common/Focusable';
import { GuideGrid } from './components/guide/GuideGrid';
import { VODGrid } from './components/vod/VODGrid';
import { DVRPanel } from './components/dvr/DVRPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { MediaLibrary } from './components/library/MediaLibrary';
import { Player } from './components/video/Player';

export default function App() {
  const playlists = useStore(state => state.playlists);
  const currentChannel = useStore(state => state.currentChannel);
  const isSidebarOpen = useStore(state => state.isSidebarOpen);
  const toggleSidebar = useStore(state => state.toggleSidebar);
  const activeView = useStore(state => state.activeView);
  const setActiveView = useStore(state => state.setActiveView);
  const vodLayoutMode = useStore(state => state.vodLayoutMode);
  const setVodLayoutMode = useStore(state => state.setVodLayoutMode);

  useTVNavigation();

  const hasPlaylists = playlists.length > 0;

  if (!hasPlaylists) {
    return <SetupScreen />;
  }

  // Determine what panel to display in the workspace
  const renderBottomContent = () => {
    switch (activeView) {
      case 'guide':
        return <GuideGrid />;
      case 'vod':
        return <VODGrid />;
      case 'library':
        return <MediaLibrary />;
      case 'dvr':
        return <DVRPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <GuideGrid />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-afterglow-bg font-sans overflow-hidden text-white">
      
      {/* Sidebar Navigation */}
      <motion.nav 
        animate={{ width: isSidebarOpen ? 260 : 76 }}
        className="h-full bg-afterglow-card/90 border-r border-white/5 flex flex-col py-8 z-[60] shrink-0"
      >
        <div className="flex items-center gap-3 px-5 mb-12 select-none">
          <Focusable id="nav-brand-toggle" className="w-10 h-10 rounded-full afterglow-gradient flex items-center justify-center shadow-glow shrink-0" onEnter={() => toggleSidebar()}>
            <span className="font-display font-black text-xs italic">A</span>
          </Focusable>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-display text-xs font-black tracking-widest text-white leading-none">AFTERGLOW</span>
              <span className="text-[7px] font-mono text-white/40 tracking-[0.3em] uppercase mt-1">RECEIVER HUB</span>
            </div>
          )}
        </div>

        {/* Menu Toggle */}
        <div className="px-3 mb-8">
          <Focusable 
            id="nav-menu" 
            className="p-3.5 rounded-xl flex items-center gap-4 hover:bg-white/5 text-white/50 hover:text-white"
            onEnter={() => toggleSidebar()}
          >
            <Menu className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">COLLAPSE MENU</span>}
          </Focusable>
        </div>

        {/* Action Panel Items */}
        <div className="flex flex-col gap-4 w-full px-3">
          <Focusable 
            id="nav-guide" 
            className={`p-3.5 rounded-xl flex items-center gap-4 transition-colors ${activeView === 'guide' ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => setActiveView('guide')}
          >
            <Tv className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">LIVE BROADCAST</span>}
          </Focusable>

          <Focusable 
            id="nav-vod-guide" 
            className={`p-3.5 rounded-xl flex items-center gap-4 transition-colors ${(activeView === 'vod' && vodLayoutMode === 'epg') ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => {
              setActiveView('vod');
              setVodLayoutMode('epg');
            }}
          >
            <Rows3 className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">VOD TV GUIDE</span>}
          </Focusable>

          <Focusable 
            id="nav-vod" 
            className={`p-3.5 rounded-xl flex items-center gap-4 transition-colors ${(activeView === 'vod' && vodLayoutMode !== 'epg') ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => {
              setActiveView('vod');
              setVodLayoutMode('grid');
            }}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">VOD MOVIE BROWSER</span>}
          </Focusable>

          <Focusable 
            id="nav-library" 
            className={`p-3.5 rounded-xl flex items-center gap-4 transition-colors ${activeView === 'library' ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => setActiveView('library')}
          >
            <Layers className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">AFTERGLOW VAULT</span>}
          </Focusable>

          <Focusable 
            id="nav-dvr" 
            className={`p-3.5 rounded-xl flex items-center gap-4 transition-colors ${activeView === 'dvr' ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => setActiveView('dvr')}
          >
            <Disc className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">DVR RECORDER</span>}
          </Focusable>

          <Focusable 
            id="nav-settings" 
            className={`p-3.5 rounded-xl flex items-center gap-4 mt-12 transition-colors ${activeView === 'settings' ? 'bg-white/10 text-afterglow-primary border-l-2 border-afterglow-primary rounded-l-none' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            onEnter={() => setActiveView('settings')}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-mono text-[10px] tracking-widest">SETTINGS (SYNC)</span>}
          </Focusable>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative h-screen min-w-0">
        
        {/* Top Active Broadcast Player */}
        <div className="h-[42%] w-full border-b border-white/5 bg-black overflow-hidden relative group shrink-0">
          {currentChannel ? (
            <Player url={currentChannel.url} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-afterglow-bg/50">
              <Play className="w-16 h-16 text-white/10 fill-current" />
              <div className="flex flex-col items-center">
                <span className="font-display text-lg font-bold tracking-tighter animate-pulse text-white/20">NO BROADCAST ACTIVE</span>
                <span className="font-mono text-[9px] text-white/15 tracking-[0.4em] uppercase">SELECT CHANNEL FROM INTERFACE TO ENGAGE DECODER</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Workspace Panel */}
        <div className="h-[58%] w-full overflow-hidden">
          {renderBottomContent()}
        </div>

        {/* Global Mood Frame Overlay */}
        <div className="absolute inset-0 pointer-events-none z-[100] border-[16px] border-afterglow-primary/5 opacity-10 ring-inset" />
      </main>

    </div>
  );
}
