import { addHours, startOfHour, subHours } from 'date-fns';
import { EpgInjectSlot } from '../store/useStore';
import { MediaMetadata } from '../types/media';

export interface EPGProgram {
  start: Date;
  end: Date;
  title: string;
  description?: string;
  isInjectedVaultMedia?: boolean;
}

export const generateMockProgramsForChannel = (
  tvgId: string, 
  baseDate: Date,
  isEpgInjectEnabled?: boolean,
  epgInjectMode?: 'algorithmic' | 'manual',
  epgInjectChannels?: string[],
  epgInjectSlots?: EpgInjectSlot[],
  epgInjectAlgoDensity?: number,
  mediaLibrary?: MediaMetadata[]
): EPGProgram[] => {
  const startHour = startOfHour(baseDate);
  const programs: EPGProgram[] = [];
  
  // We will generate programs covering 6 hours ago to 36 hours in the future
  const startTime = subHours(startHour, 6);
  
  // Deterministic seed based on tvgId character codes
  let seed = 0;
  for (let i = 0; i < tvgId.length; i++) {
    seed += tvgId.charCodeAt(i);
  }

  // Pre-defined rotations of schedules to make things feel super consistent and high quality
  const rotations: Record<string, { title: string, durationMin: number, desc: string }[]> = {
    "sintel.live": [
      { title: "Supernatural S15E20", durationMin: 60, desc: "The Winchester saga reaches its epic, earth-shaking finale. The final hunt is on, and the brothers face old and new threats in a legendary journey's end." },
      { title: "Sintel Open-CGI Broadcast", durationMin: 60, desc: "An open CGI action-adventure fantasy broadcast from the Blender Foundation featuring Sintel searching for her baby dragon." },
      { title: "Supernatural S15E05", durationMin: 60, desc: "Sam and Dean Winchester investigate a series of mysterious deaths indicating Chuck/God is writing their destiny." },
      { title: "Tears of Steel (Sci-Fi Edition)", durationMin: 60, desc: "A giant robotic army takes over Amsterdam while specialists try to reconstruct a romantic memory to disable the cybernetic swarm." }
    ],
    "bunny.live": [
      { title: "Big Buck Bunny Cartoon Showcase", durationMin: 60, desc: "A heavy, warm-hearted woodland bunny protects his home from annoying flying squirrels." },
      { title: "CGI Short Films & Animations", durationMin: 60, desc: "A series of high-definition curated computer-generated imagery shorts from indie directors." },
      { title: "Supernatural S15E01", durationMin: 60, desc: "Sam, Dean and Castiel defend the world against souls released from Hell who have returned to earth." }
    ],
    "tears.live": [
      { title: "Inception UHD Special", durationMin: 120, desc: "A professional mind thief enters deep subconscious dream states to plant an idea in his target's absolute core." },
      { title: "Tears of Steel VFX Feed", durationMin: 60, desc: "Amsterdam visual effects integration broadcast showing CGI animation overlays behind Tears of Steel." },
      { title: "Interstellar Cinematic Broadcast", durationMin: 120, desc: "Astronauts travel through a newly discovered wormhole in deep space to find habitable sectors for mankind." }
    ],
    "nasa.hd": [
      { title: "Mars Rover Daily Stream", durationMin: 65, desc: "Broadcasting telemetry logs, soil analysis metrics, and high-resolution landscape footage from the red planet's surface." },
      { title: "International Space Station Broadcast", durationMin: 55, desc: "Beautiful real-time camera views looking back at the blue horizon of planet Earth from orbit, direct from ISS internal bays." },
      { title: "Apollo Program Archives", durationMin: 60, desc: "Visual retrospective highlights of historical lunar landings and technical spacecraft telemetry logs." }
    ],
    "bipbop.live": [
      { title: "BipBop Latency Tracker", durationMin: 60, desc: "Displaying dynamic bouncing circles, sweep signals, and audio testing tones to calibrate Smart TV performance." },
      { title: "Standard Video Decoder Calibration", durationMin: 60, desc: "High frame rate pixel grids designed to verify color accuracy, black level luminance, and response speed." },
      { title: "Test Audio Codes", durationMin: 60, desc: "Frequency test feeds to align discrete surround channel speakers on IPTV output feeds." }
    ]
  };

  const rotation = rotations[tvgId] || [
    { title: "Standard Broadcast Entertainment", durationMin: 60, desc: "Live high frequency digital stream from central master controls." },
    { title: "Alternative Indie Content", durationMin: 60, desc: "Highlighting creative expressions, visual artists, and local media curators." }
  ];

  let currentPointer = new Date(startTime);
  
  // Keep generating programs until we exceed 48 hours from startTime
  const limitTime = addHours(startTime, 48);
  let rotationIndex = seed % rotation.length;

  while (currentPointer.getTime() < limitTime.getTime()) {
    const progTemplate = rotation[rotationIndex % rotation.length];
    const duration = progTemplate.durationMin;
    
    const start = new Date(currentPointer);
    const end = new Date(currentPointer.getTime() + duration * 60 * 1000);
    
    let finalTitle = progTemplate.title;
    let finalDesc = progTemplate.desc;
    let isInjected = false;

    // Apply EPG substitution logic if enabled
    if (isEpgInjectEnabled && mediaLibrary && mediaLibrary.length > 0) {
      // Check if channel is listed as free game
      const isChannelAllowed = !epgInjectChannels || epgInjectChannels.length === 0 || epgInjectChannels.includes(tvgId);

      if (isChannelAllowed) {
        if (epgInjectMode === 'manual' && epgInjectSlots && epgInjectSlots.length > 0) {
          // Manual matching: check if an override matches this slot's start hour
          const slotHour = start.getHours();
          const matchedSlot = epgInjectSlots.find(slot => slot.channelId === tvgId && slot.hour === slotHour);
          if (matchedSlot) {
            finalTitle = `${matchedSlot.mediaTitle}`;
            finalDesc = `[Vault Special Selection] This program slot is overridden with your custom media file. Enjoy uninterrupted playback of your personal Vault library directly through IPTV.`;
            isInjected = true;
          }
        } else if (epgInjectMode === 'algorithmic') {
          // Algorithmic density logic: deterministically hash based on channel name, year, month, date, and hour
          const density = epgInjectAlgoDensity ?? 30;
          const hashInput = `${tvgId}-${start.getFullYear()}-${start.getMonth()}-${start.getDate()}-${start.getHours()}`;
          let hash = 0;
          for (let k = 0; k < hashInput.length; k++) {
            hash = (hash * 31 + hashInput.charCodeAt(k)) % 10000;
          }
          const checkVal = hash % 100;
          
          if (checkVal < density) {
            const vaultIndex = hash % mediaLibrary.length;
            const chosenItem = mediaLibrary[vaultIndex];
            finalTitle = `${chosenItem.displayTitle}`;
            finalDesc = `[Vault Auto-Substitute] Autopilot selected this slot on ${tvgId} to broadcast "${chosenItem.displayTitle}" from your connected media storage. Fully synchronized starting from the schedule offset.`;
            isInjected = true;
          }
        }
      }
    }
    
    programs.push({
      start,
      end,
      title: finalTitle,
      description: finalDesc,
      isInjectedVaultMedia: isInjected
    });
    
    currentPointer = end;
    rotationIndex++;
  }

  return programs;
};

