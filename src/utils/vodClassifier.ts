import { Channel } from '../store/useStore';

// Exclude kid rating if title contains adult, slaughter, crime, psycho, or creepy keywords e.g., "The Manson Family"
export const ADULT_OR_DARK_RE = /\b(manson|murder|slasher|horror|scary|terror|blood|gore|thriller|dead|kill|suicide|crime|mobster|gangster|hostage|psycho|sinister|evil|creepy|vampire|zombie|demonic|demon|exorcist|haunting|cannibal|cult)\b/i;

const CURATED_POSTER_THEMES: Record<string, string[]> = {
  "Action & Adventure": [
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&q=80", // Race car speed
    "https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=400&q=80", // Fighter jet
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80", // Explosive action abstract
    "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&q=80", // Climbing adventure
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80"  // Motorbike adrenaline
  ],
  "Sci-Fi & Fantasy": [
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80", // Neon cyberpunk city
    "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&q=80", // Astronaut in space
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80", // Deep digital galaxy
    "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80", // Abstract tech landscape
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&q=80"  // Cosmic night sky
  ],
  "Comedy & Entertainment": [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80", // Popcorn retro cinema
    "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400&q=80", // Neon comedy sign
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&q=80", // Party vibes and lights
    "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80", // Joyful event
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&q=80"  // Theater stage lights
  ],
  "Drama & Romance": [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80", // Couple holding hands
    "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400&q=80", // Rainy windowpane
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80", // Sunset seaside pier
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80", // Emotional landscape
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80"  // Vintage crimson rose
  ],
  "Thriller & Horror": [
    "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80", // Foggy eerie woods
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=400&q=80", // Dark ominous corridor
    "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=400&q=80", // Full moon night
    "https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?w=400&q=80", // Misty gothic woods
    "https://images.unsplash.com/photo-1505635330303-319539796671?w=400&q=80"  // Monochromatic shadow art
  ],
  "Documentary & Science": [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80", // Satellite view of globe
    "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=400&q=80", // Vintage video camera
    "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400&q=80", // Scientific laboratory setup
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80", // Ancient scrolls and maps
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80"  // Deep forest ecology
  ],
  "Kids & Animation": [
    "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80", // Vibrant nursery toys
    "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400&q=80", // Clay modeled animated figures
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80", // Whimsical balloons
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&q=80", // Golden carousel ride
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80"  // Playful creative canvas
  ],
  "General VOD": [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80", // Theater seating broad view
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80", // Retro neon Cinema marquee
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80", // Professional camera focus
    "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=400&q=80"  // Hot buttered popcorn bucket
  ]
};

export const getStablePoster = (title: string, category: string): string => {
  const images = CURATED_POSTER_THEMES[category] || CURATED_POSTER_THEMES["General VOD"];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
};

// Dynamic thematic keywords to group VOD streams into cohesive entertainment channels
const CATEGORY_RULES = [
  {
    group: "Action & Adventure",
    keywords: [/action/i, /adventure/i, /kill/i, /die/i, /dead/i, /agent/i, /weapon/i, /fury/i, /cop/i, /force/i, /soldier/i, /war/i, /fight/i, /hunter/i, /strike/i, /matrix/i, /bond/i, /wick/i, /fast/i, /furious/i, /mission/i, /impossible/i]
  },
  {
    group: "Sci-Fi & Fantasy",
    keywords: [/sci-fi/i, /scifi/i, /fantasy/i, /star/i, /trek/i, /wars/i, /space/i, /alien/i, /cyber/i, /robot/i, /galaxy/i, /universe/i, /tears/i, /steel/i, /sintel/i, /avatar/i, /matrix/i, /dune/i, /planet/i, /future/i, /time/i]
  },
  {
    group: "Comedy & Entertainment",
    keywords: [/comedy/i, /joke/i, /funny/i, /laugh/i, /bunny/i, /show/i, /club/i, /spoof/i, /parody/i, /fun/i, /standup/i]
  },
  {
    group: "Drama & Romance",
    keywords: [/drama/i, /romance/i, /love/i, /heart/i, /date/i, /tragedy/i, /affair/i, /story/i, /life/i, /tears/i]
  },
  {
    group: "Thriller & Horror",
    keywords: [/thriller/i, /horror/i, /scary/i, /ghost/i, /witch/i, /evil/i, /dark/i, /shadow/i, /blood/i, /silent/i, /quiet/i, /scream/i, /nightmare/i, /fear/i, /monster/i, /psycho/i, /crime/i, /cop/i, /mystery/i]
  },
  {
    group: "Documentary & Science",
    keywords: [/documentary/i, /doc/i, /science/i, /nasa/i, /earth/i, /history/i, /fact/i, /nature/i, /wild/i, /animal/i, /space/i, /cosmos/i, /wash/i, /laundromat/i, /biography/i]
  },
  {
    group: "Kids & Animation",
    keywords: [/animation/i, /cartoon/i, /kids/i, /family/i, /toy/i, /disney/i, /pixar/i, /anime/i, /bunny/i, /sintel/i]
  }
];

// Fallback thematic posters for different genres if none are supplied or scraped
const POSTER_THEMES: Record<string, string> = {
  "Action & Adventure": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
  "Sci-Fi & Fantasy": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
  "Comedy & Entertainment": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80",
  "Drama & Romance": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80",
  "Thriller & Horror": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80",
  "Documentary & Science": "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=400&q=80",
  "Kids & Animation": "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
  "General VOD": "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80"
};

// Auto extract release year from title if present like "The Batman (2022)"
export const extractReleaseYear = (title: string): number | undefined => {
  const match = title.match(/\((\d{4})\)/) || title.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1]) : undefined;
};

// Clean name string to remove trailing years, brackets, resolutions, and quality tags
export const cleanMediaTitle = (title: string): string => {
  let cleaned = title;

  // 1. Remove bracketed specs and parenthetical metadata e.g., [1080p], (2024), [ENG], [MULTISUB]
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
  cleaned = cleaned.replace(/\([^\)]*\)/g, ' ');

  // 2. Clear common video quality, audio, streaming sources, and resolution labels
  const junkTerms = [
    /\b(1080p|720p|480p|2160p|4k|2k|8k|fhd|uhd|hd|sd|hevc|h264|h265|x264|x265|bluray|webrip|webdl|web-dl|bdrip|dvdrip|camrip|hdrip|proper|remux|multi|multisub|subbed|sub|dual[- ]audio|truehd|atmos|dd5\.1|ac3|aac|dts|xvid|divx|h\.264|h\.265)\b/gi,
    /\b(netflix|hbo|disney\+?|amazon|prime|apple-tv|peacock|paramount\+?|hulu|showtime|starz)\b/gi,
    /\b(vod|series|cinema|movie|film|fanzone|box[- ]office|ppv|nordic|scandinavia|baltic|latino|spanish|french|italian|german|swedish|danish|norwegian|finnish|polish|russian|turkish|arabic|hindi|tamil|telugu|korean|chinese|japanese|espanol|latam|castellano)\b/gi,
    /\b(en[-_]us|en[-_]gb|fr[-_]fr|es[-_]es|it|de|pt|ru|tr|pl|ar)\b/gi
  ];
  
  for (const pattern of junkTerms) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // 3. Remove standalone year markers like 1950 through 2029
  cleaned = cleaned.replace(/\b(19\d{2}|20\d{2})\b/g, ' ');

  // 4. Clean up punctuation dividers, pipes, trailing colons, slashes, or trailing/leading dashes
  cleaned = cleaned
    .replace(/^[\s\|\-\:\/\\[\]\(\)\+]+/, '')
    .replace(/[\s\|\-\:\/\\[\]\(\)\+]+$/, '')
    .replace(/[\s\|\-\:\/\\[\]\(\)\+]+/g, ' ')
    .trim();

  // 5. If everything was stripped, fall back to a minimally cleaned version of original title
  if (cleaned.length < 2) {
    cleaned = title.replace(/[\[\]]/g, '').trim();
  }

  // 6. Title Case formatting for pristine modern typography representation
  return cleaned
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return '';
      // Retain acronyms like 'VOD' or 'TV' if needed, otherwise capitalize first letter
      if (['tv', 'vod', 'fbi', 'cia', 'ufo'].includes(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim();
};

// Basic static cache mapping legendary blockbuster titles directly to clean categories and info
const FAMOUS_VOD_REGISTRY: Record<string, { group: string; duration: string; releaseYear: number; description: string }> = {
  "top gun": {
    group: "Action & Adventure",
    duration: "1h 50m",
    releaseYear: 1986,
    description: "An elite fighter pilot enters a competitive naval flight academy training school."
  },
  "top gun: maverick": {
    group: "Action & Adventure",
    duration: "2h 10m",
    releaseYear: 2022,
    description: "Maverick returns to train a group of graduation recruits for an extreme specialized mission."
  },
  "avatar": {
    group: "Sci-Fi & Fantasy",
    duration: "2h 42m",
    releaseYear: 2009,
    description: "A paraplegic Marine dispatched to the moon Pandora becomes torn between following his orders and protecting the nature."
  },
  "interstellar": {
    group: "Sci-Fi & Fantasy",
    duration: "2h 49m",
    releaseYear: 2014,
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival on alternate worlds."
  },
  "inception": {
    group: "Sci-Fi & Fantasy",
    duration: "2h 28m",
    releaseYear: 2010,
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea."
  },
  "the dark knight": {
    group: "Thriller & Horror",
    duration: "2h 32m",
    releaseYear: 2008,
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept his greatest psychological test."
  },
  "gladiator": {
    group: "Action & Adventure",
    duration: "2h 35m",
    releaseYear: 2000,
    description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family."
  },
  "avatar: the way of water": {
    group: "Sci-Fi & Fantasy",
    duration: "3h 12m",
    releaseYear: 2022,
    description: "Jake Sully lives with his newfound family on the extrasolar moon Pandora. Soon, a familiar threat returns."
  },
  "dune: part two": {
    group: "Sci-Fi & Fantasy",
    duration: "2h 46m",
    releaseYear: 2024,
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family."
  },
  "spider-man: no way home": {
    group: "Sci-Fi & Fantasy",
    duration: "2h 28m",
    releaseYear: 2021,
    description: "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help. Astray spell tears the multiverse open."
  }
};

/**
 * Intelligent client-side heuristic classifier
 */
export const classifyVODChannel = (channel: Channel): Channel => {
  const resultChannel = { ...channel, type: 'vod' as const };
  const cleanedText = cleanMediaTitle(channel.name);
  const normalizedLower = cleanedText.toLowerCase();

  // Store the elegant title directly as the displayed name property
  resultChannel.name = cleanedText;

  const getPosterForChannel = (name: string, group: string) => {
    if (channel.poster && channel.poster.startsWith('http') && !channel.poster.toLowerCase().includes('placeholder')) {
      return channel.poster;
    }
    return getStablePoster(name, group);
  };

  // Try registry exact match
  if (FAMOUS_VOD_REGISTRY[normalizedLower]) {
    const reg = FAMOUS_VOD_REGISTRY[normalizedLower];
    resultChannel.group = reg.group;
    resultChannel.duration = reg.duration;
    resultChannel.releaseYear = reg.releaseYear;
    resultChannel.description = reg.description;
    resultChannel.poster = getPosterForChannel(cleanedText, reg.group);
    return resultChannel;
  }

  // Try registry fuzzy substring matches
  for (const [key, reg] of Object.entries(FAMOUS_VOD_REGISTRY)) {
    if (normalizedLower.includes(key)) {
      resultChannel.group = reg.group;
      if (!resultChannel.duration) resultChannel.duration = reg.duration;
      if (!resultChannel.releaseYear) resultChannel.releaseYear = reg.releaseYear;
      resultChannel.poster = getPosterForChannel(cleanedText, reg.group);
      return resultChannel;
    }
  }

  // Check IPTV built-in playlist group mapping if it matches our core sectors
  if (channel.group) {
    for (const rule of CATEGORY_RULES) {
      if (channel.group.toLowerCase().includes(rule.group.toLowerCase().split(' ')[0])) {
        // Exclude dark/adult content from Kids/Animation
        if (rule.group === "Kids & Animation" && ADULT_OR_DARK_RE.test(channel.name)) {
          continue;
        }
        resultChannel.group = rule.group;
        resultChannel.poster = getPosterForChannel(cleanedText, rule.group);
        return resultChannel;
      }
    }
  }

  // Fallback to keyword heuristics on name
  for (const rule of CATEGORY_RULES) {
    const matched = rule.keywords.some(regex => regex.test(channel.name) || regex.test(channel.group || ''));
    if (matched) {
      // Exclude dark/adult content from Kids/Animation
      if (rule.group === "Kids & Animation" && ADULT_OR_DARK_RE.test(channel.name)) {
        continue;
      }
      resultChannel.group = rule.group;
      resultChannel.poster = getPosterForChannel(cleanedText, rule.group);
      if (!resultChannel.releaseYear) {
        resultChannel.releaseYear = extractReleaseYear(channel.name) || 2024;
      }
      return resultChannel;
    }
  }

  // Clean title default categorizer fallback
  resultChannel.group = "General VOD";
  resultChannel.poster = getPosterForChannel(cleanedText, "General VOD");
  if (!resultChannel.releaseYear) {
    resultChannel.releaseYear = extractReleaseYear(channel.name) || 2024;
  }
  if (!resultChannel.duration) {
    resultChannel.duration = "2h 15m";
  }
  return resultChannel;
};
