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

export const DEMO_LIVE_CHANNELS: Channel[] = [
  {
    name: "Sintel Cinema Live",
    url: "https://test-streams.mux.dev/x36xhg/main.m3u8",
    group: "Entertainment",
    tvgId: "sintel.live",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Sintel_logo.png",
    type: "live",
    description: "An open CGI action-adventure fantasy broadcast from the Blender Foundation. Follow Sintel as she tracks down her baby dragon.",
  },
  {
    name: "Big Buck Bunny Interactive",
    url: "https://test-streams.mux.dev/pts_live/character_multi_sub.m3u8",
    group: "Kids & Animation",
    tvgId: "bunny.live",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_Buck_Bunny_Logo.png",
    type: "live",
    description: "Multi-layered high-definition broadcast of the beloved giant rabbit protecting his forest from high-flying squirrels.",
  },
  {
    name: "Tears of Steel Sci-Fi Feed",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    group: "Science Fiction",
    tvgId: "tears.live",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Tears_of_steel_logo.png",
    type: "live",
    description: "Futuristic dystopia broadcast set in Amsterdam, featuring high-quality CGI VFX combined with physical performances.",
  },
  {
    name: "BipBop Multirate Test Channel",
    url: "https://playertest.longtailvideo.com/adaptive/bipbop/bipbop_all.m3u8",
    group: "Technology & Feeds",
    tvgId: "bipbop.live",
    logo: "https://img.icons8.com/isometric/50/tv-server.png",
    type: "live",
    description: "A continuous standard adaptive bitrate stream displaying latency patterns, bouncing target animations, and test audio codes.",
  },
  {
    name: "NASA HD Public Broadcast",
    url: "https://nasa-otv.akamaized.net/hls/live/2026135/NASA-OTV/master.m3u8",
    group: "Documentary & Science",
    tvgId: "nasa.hd",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    type: "live",
    description: "Official live broadcasts direct from space, highlighting active missions, astronaut routines, and space science updates.",
  }
];

export const DEMO_VOD_MOVIES: Channel[] = [
  {
    name: "Sintel (Directors Cut)",
    url: "https://test-streams.mux.dev/x36xhg/main.m3u8",
    group: "Fantasy Movies",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Sintel_logo.png",
    type: "vod",
    description: "Sintel is a visually stunning tale of a lonely girl looking for her baby dragon. Along her quest, she faces fearsome beasts, travels lands, and has a breathtaking cinematic confrontation.",
    duration: "14 min 48s",
    poster: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=300&q=80",
    releaseYear: 2010
  },
  {
    name: "Tears of Steel (VFX Edition)",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    group: "Sci-Fi Movies",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Tears_of_steel_logo.png",
    type: "vod",
    description: "Set in a sci-fi post-apocalyptic Amsterdam, a crew of specialists attempt to reconstruct a memory to stop a giant robotic spider taking over the remaining cities.",
    duration: "12 min 14s",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80",
    releaseYear: 2012
  },
  {
    name: "Big Buck Bunny (UHD Special)",
    url: "https://test-streams.mux.dev/pts_live/character_multi_sub.m3u8",
    group: "Comedy & Family",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_Buck_Bunny_Logo.png",
    type: "vod",
    description: "A large and lovable rabbit wakes up to a beautiful morning in the forest, only to be harassed by bullies of different species. It's time to set elaborate traps to teach them a lesson.",
    duration: "9 min 56s",
    poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80",
    releaseYear: 2008
  },
  {
    name: "Cosmos Laundromat (First Cycle)",
    url: "https://test-streams.mux.dev/x36xhg/main.m3u8", // fall back to sintel
    group: "Sci-Fi Movies",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    type: "vod",
    description: "On a desolate island, a suicidal sheep named Franck meets a quirky salesman who offers him the deal of a lifetime: a magical washing machine that transports him into exciting new realities.",
    duration: "10 min",
    poster: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=300&q=80",
    releaseYear: 2015
  }
];

export const DEMO_PLAYLIST = {
  id: "demo-playlist-id",
  name: "Glow Premium Demo Link",
  url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u",
  epgUrl: "https://iptv-org.github.io/epg/guides/us.xml",
  channels: [
    ...DEMO_LIVE_CHANNELS,
    ...DEMO_VOD_MOVIES
  ]
};
