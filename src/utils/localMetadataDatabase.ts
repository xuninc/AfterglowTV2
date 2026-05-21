import { MediaMetadata } from '../types/media';

// ==========================================
// 1. REFINED TITLE CLEANER (Regex Cleanup)
// ==========================================
export const cleanIPTVTitle = (title: string): string => {
  let cleaned = title;

  // Preserve the raw TV Episode markers if they exist so the type detector can read them later,
  // but strip resolution/codec/braces spam.
  
  // Remove bracket/parentheses specs like [1080p], (French), [ENG-Multi]
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
  cleaned = cleaned.replace(/\([^\)]*\)/g, ' ');

  // Common IPTV clutter patterns to replace with whitespace
  const clutterRegex = /\b(1080p|720p|480p|2160p|4k|2k|8k|fhd|uhd|hd|sd|hevc|h264|h265|x264|x265|bluray|webrip|web-dl|webdl|bdrip|dvdrip|camrip|hdrip|proper|repack|remux|multi|multisub|subbed|sub|dual[- ]audio|truehd|atmos|dd5\.1|ac3|aac|dts|xvid|divx|h\.264|h\.265)\b/gi;
  cleaned = cleaned.replace(clutterRegex, ' ');

  // Platform/source tags
  const sourceRegex = /\b(netflix|hbo|disney\+?|amazon|prime|apple-tv|peacock|paramount\+?|hulu|showtime|starz|ufc|wwe|shadowclan|deflate|fgt|yts|rarbg|eztv|tgx|galaxytv)\b/gi;
  cleaned = cleaned.replace(sourceRegex, ' ');

  // Language tags
  const languageRegex = /\b(en[-_]us|en[-_]gb|fr[-_]fr|es[-_]es|english|french|spanish|german|italian|russian|polish|latino|multi-sub|dual[-_]audio)\b/gi;
  cleaned = cleaned.replace(languageRegex, ' ');

  // Extra punctuation lines, underscores, periods, pipes
  cleaned = cleaned.replace(/[_.\-\/\\|:+]+/g, ' ');

  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

// ==========================================
// 2. MEDIA TYPE & SEASON/EPISODE DETECTOR
// ==========================================
export interface ParsedInfo {
  mediaType: 'movie' | 'tv_episode' | 'tv_show' | 'unknown';
  cleanedTitle: string; // Title with SxxExx and specs stripped
  showTitle?: string;
  movieTitle?: string;
  season?: number;
  episode?: number;
  year?: number;
}

export const parseMediaTitle = (rawTitle: string): ParsedInfo => {
  const result: ParsedInfo = {
    mediaType: 'movie',
    cleanedTitle: ''
  };

  // Try to find release year first e.g. 1999 or 2024
  const yearMatch = rawTitle.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
  }

  const cleaned = cleanIPTVTitle(rawTitle);

  // Match episode formats:
  // F1: Supernatural S15E05
  // F2: Supernatural 15x05
  // F3: Supernatural Season 15 Episode 5
  // F4: Supernatural S.15 E.05
  // F5: Supernatural - 15 - 05
  const patterns = [
    // S15E05 / S15.E05 / S15_E05
    /\bS(\d{1,2})[- ._]?E(\d{1,3})\b/i,
    // 15x05 / 15x99 (not matching 1920x1080)
    /\b(?<!\d\d\d)(\d{1,2})x(\d{1,3})\b/i,
    // Season 15 Episode 5
    /\bSeason[- ._]?(\d{1,2})[- ._]?Episode[- ._]?(\d{1,3})\b/i,
    // S.15 E.05
    /\bS\.?(\d{1,2})[- ._]?E\.?(\d{1,2})\b/i,
    // Supernatural - 15 - 05
    /\s+[-_]?\s*(\d{1,2})\s*[-_]\s*(\d{1,3})\b/i
  ];

  let matchesEpisode = false;
  for (const regex of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      const season = parseInt(match[1]);
      const episode = parseInt(match[2]);
      
      // Sanitization: Ensure they aren't resolution tags misidentified
      if (season < 100 && episode < 300) {
        matchesEpisode = true;
        result.mediaType = 'tv_episode';
        result.season = season;
        result.episode = episode;

        // Extract show title by splitting at the episode identifier
        const splitIndex = cleaned.search(regex);
        let showTitle = cleaned.substring(0, splitIndex).trim();
        // Remove trailing hyphens or separators
        showTitle = showTitle.replace(/[-_:.\|]+$/, '').trim();
        result.showTitle = titleCase(showTitle);
        result.cleanedTitle = result.showTitle;
        break;
      }
    }
  }

  if (!matchesEpisode) {
    // Check if it's explicitly a whole TV show rather than episode or movie (contains "complete", "season x" without episode, etc.)
    const wholeShowMatch = cleaned.match(/\b(Season|S)\s*(\d{1,2})\b/i);
    if (wholeShowMatch) {
      result.mediaType = 'tv_show';
      result.season = parseInt(wholeShowMatch[2]);
      
      const idx = cleaned.search(/\b(Season|S)\s*(\d{1,2})\b/i);
      result.showTitle = titleCase(cleaned.substring(0, idx).trim().replace(/[-_:.\|]+$/, '').trim());
      result.cleanedTitle = result.showTitle;
    } else {
      result.mediaType = 'movie';
      // Movie Title: Strip the year from the final display title
      let movieTitle = cleaned;
      if (result.year) {
        movieTitle = movieTitle.replace(new RegExp(`\\b${result.year}\\b`, 'g'), '');
      }
      movieTitle = movieTitle.replace(/\s+/g, ' ').trim();
      result.movieTitle = titleCase(movieTitle);
      result.cleanedTitle = result.movieTitle;
    }
  }

  return result;
};

const titleCase = (text: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return '';
      if (['tv', 'vod', 'fbi', 'cia', 'ufo', 'hls', 'epg'].includes(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim();
};

// ==========================================
// 3. SECURE LOCAL METADATA DATABASE (TMDb / OMDb)
// ==========================================

export interface MetadataRecord {
  title: string;
  mediaType: 'movie' | 'tv_show';
  genres: string[];
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  rating?: number;
  duration?: string;
  year?: number;
  episodes?: Record<string, { title: string; overview: string; rating?: number; duration?: string }>;
}

export const LOCAL_METADATA_INDEX: Record<string, MetadataRecord> = {
  "supernatural": {
    title: "Supernatural",
    mediaType: "tv_show",
    genres: ["Drama", "Mystery", "Sci-Fi & Fantasy"],
    overview: "Two brothers follow their father's footsteps as hunters, fighting evil supernatural beings of many kinds, including monsters, demons, and gods.",
    posterUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1000&q=80",
    rating: 8.4,
    year: 2005,
    episodes: {
      "15x5": { title: "Proverbs 17:3", overview: "Sam and Dean are baffled when they investigate the deaths of two brothers. But a routine case becomes a fight for survival when they discover Chuck is pulling the strings.", rating: 8.9, duration: "42m" },
      "15x1": { title: "Back and to the Future", overview: "Sam, Dean and Castiel are left to defend the world after all the souls in Hell have been released and are back on Earth to kill.", rating: 8.2, duration: "41m" },
      "15x20": { title: "Carry On", overview: "The thrilling and emotional journey of the Winchester brothers comes to an end in the legendary series finale. The final hunt is on.", rating: 9.1, duration: "50m" },
      "1x1": { title: "Pilot", overview: "Sam and Dean Winchester's mother was killed by an evil supernatural force. Years later, their father goes missing, prompting a legendary quest.", rating: 8.5, duration: "44m" }
    }
  },
  "the manson family": {
    title: "The Manson Family",
    mediaType: "movie",
    genres: ["Thriller & Horror", "Crime", "Documentary & Science"],
    overview: "A chilling, unflinching look at Charles Manson, his hypnotic hold over his impressionable followers, and the series of gruesome, ritualistic murders in the summer of 1969.",
    posterUrl: "https://images.unsplash.com/photo-1505635330303-319539796671?w=400&q=80", // Monochromatic ominous shadows
    backdropUrl: "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1000&q=80",
    rating: 6.8,
    duration: "1h 35m",
    year: 2009
  },
  "sintel": {
    title: "Sintel",
    mediaType: "movie",
    genres: ["Kids & Animation", "Sci-Fi & Fantasy"],
    overview: "A lonely young woman named Sintel bonds with a helpless baby dragon she names Scales. When the dragon is kidnapped by a beast, Sintel embarks on a dangerous world-spanning quest to recover her friend.",
    posterUrl: "https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?w=400&q=80", // clay model dragon
    backdropUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1000&q=80",
    rating: 7.9,
    duration: "15m",
    year: 2010
  },
  "tears of steel": {
    title: "Tears of Steel",
    mediaType: "movie",
    genres: ["Sci-Fi & Fantasy", "Action & Adventure"],
    overview: "Set in a sci-fi post-apocalyptic Amsterdam, a group of rebel specialists attempt to utilize a high-end virtual scanner to reconstruct a crucial romantic memory to stop a rogue robotic army from conquering the globe.",
    posterUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80",
    rating: 7.2,
    duration: "12m",
    year: 2012
  },
  "big buck bunny": {
    title: "Big Buck Bunny",
    mediaType: "movie",
    genres: ["Comedy & Entertainment", "Kids & Animation"],
    overview: "A giant rabbit with a heart of gold wakes up to find his peaceful woodland habitat ruined by three obnoxious rodents. He constructs a series of highly creative and hilarious traps to exact comedy revenge.",
    posterUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1000&q=80",
    rating: 8.1,
    duration: "10m",
    year: 2008
  },
  "cosmos laundromat": {
    title: "Cosmos Laundromat",
    mediaType: "movie",
    genres: ["Sci-Fi & Fantasy", "Kids & Animation", "Drama & Romance"],
    overview: "On a desolate island, a suicidal sheep named Franck meets a quirky interdimensional salesman who sets him on a journey through multiple fascinating parallel universes using a spin-cycle washing machine.",
    posterUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1000&q=80",
    rating: 8.0,
    duration: "10m",
    year: 2015
  },
  "interstellar": {
    title: "Interstellar",
    mediaType: "movie",
    genres: ["Sci-Fi & Fantasy", "Drama & Romance"],
    overview: "When Earth faces a global crop blight, a team of pioneering astronauts embark on a desperate journey through a wormhole to find a habitable new home for humanity.",
    posterUrl: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80",
    rating: 8.7,
    duration: "2h 49m",
    year: 2014
  },
  "inception": {
    title: "Inception",
    mediaType: "movie",
    genres: ["Sci-Fi & Fantasy", "Action & Adventure"],
    overview: "A professional thief who steals secrets from deep within the subconscious during dream-sharing states is hired for the impossible inverted task: planting an idea.",
    posterUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80",
    backdropUrl: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1000&q=80",
    rating: 8.8,
    duration: "2h 28m",
    year: 2010
  }
};

// ==========================================
// 4. EMBEDDING COGNITIVE LEVEL COMPLEMENTS (Word-N-Gram Cosine Similarity)
// ==========================================
/**
 * Performs local word TF-IDF vector mapping and calculates the Cosine Similarity 
 * coefficient between [0, 1.0] to mimic the output of a sentence embedding model (MiniLM).
 */
export const calculateMiniLMSimilarity = (source: string, target: string): number => {
  const tokenize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2); // filter out short stop words
  };

  const wordsSrc = tokenize(source);
  const wordsTgt = tokenize(target);

  if (wordsSrc.length === 0 || wordsTgt.length === 0) return 0;

  // Build term frequency map
  const tfSrc: Record<string, number> = {};
  const tfTgt: Record<string, number> = {};
  const allTerms = new Set<string>();

  wordsSrc.forEach(w => {
    tfSrc[w] = (tfSrc[w] || 0) + 1;
    allTerms.add(w);
  });
  wordsTgt.forEach(w => {
    tfTgt[w] = (tfTgt[w] || 0) + 1;
    allTerms.add(w);
  });

  // Calculate dot product and vectors length
  let dotProduct = 0;
  let lenSrcSq = 0;
  let lenTgtSq = 0;

  allTerms.forEach(term => {
    const v1 = tfSrc[term] || 0;
    const v2 = tfTgt[term] || 0;
    dotProduct += v1 * v2;
    lenSrcSq += v1 * v1;
    lenTgtSq += v2 * v2;
  });

  if (lenSrcSq === 0 || lenTgtSq === 0) return 0;
  return dotProduct / (Math.sqrt(lenSrcSq) * Math.sqrt(lenTgtSq));
};

// ==========================================
// 5. DETERMINISTIC FUZZY PIPELINE RESOLVER
// ==========================================
export const performLocalOnDeviceMatch = (rawTitle: string, providerSource: string = "IPTV Link"): MediaMetadata => {
  const parsed = parseMediaTitle(rawTitle);
  const nowStr = new Date().toISOString();

  // Matcher fallback default metadata
  const metadata: MediaMetadata = {
    rawTitle,
    cleanedTitle: parsed.cleanedTitle,
    displayTitle: parsed.cleanedTitle,
    mediaType: parsed.mediaType,
    season: parsed.season,
    episode: parsed.episode,
    year: parsed.year,
    genres: ["General VOD"],
    overview: "On-device catalogued medium. No description available.",
    posterUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80", // standard cinematic background
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1000&q=80",
    providerSource,
    metadataProvider: 'Local Database',
    metadataId: `loc-${Math.abs(hashString(rawTitle))}`,
    confidenceScore: 30, // low confidence for baseline fallback class
    lastScannedAt: nowStr,
    lastMatchedAt: nowStr
  };

  // 1. Exact or Fuzzy matching search on database index keys (using clean title)
  let bestKey = "";
  let bestScore = 0;

  for (const key of Object.keys(LOCAL_METADATA_INDEX)) {
    // Exact or direct substring match yields high score
    const cleanLower = parsed.cleanedTitle.toLowerCase();
    let score = 0;
    
    if (cleanLower === key) {
      score = 0.95;
    } else if (cleanLower.includes(key) || key.includes(cleanLower)) {
      score = 0.75;
    } else {
      // Execute the Sentence Transformer simulation
      score = calculateMiniLMSimilarity(parsed.cleanedTitle, key);
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  // 2. Map metadata from the matched catalog if confidence is significant (> 0.25)
  if (bestScore > 0.25) {
    const matchedRecord = LOCAL_METADATA_INDEX[bestKey];
    metadata.metadataId = `${matchedRecord.mediaType === 'tv_show' ? 'tv' : 'movie'}-${bestKey}`;
    metadata.genres = matchedRecord.genres;
    metadata.backdropUrl = matchedRecord.backdropUrl;
    
    // Scale precision based on match correctness
    let finalConfidence = Math.round(bestScore * 100);
    
    // Exact match boost
    if (parsed.cleanedTitle.toLowerCase() === bestKey) {
      finalConfidence = 99;
    }

    if (matchedRecord.mediaType === "tv_show" && (parsed.mediaType === "tv_episode" || parsed.mediaType === "tv_show")) {
      metadata.showTitle = matchedRecord.title;
      metadata.mediaType = parsed.mediaType;

      // Extract high confidence details for episodes if season/episode matched
      if (parsed.season && parsed.episode && matchedRecord.episodes) {
        const epKey = `${parsed.season}x${parsed.episode}`;
        const epRecord = matchedRecord.episodes[epKey];
        if (epRecord) {
          metadata.episodeTitle = epRecord.title;
          metadata.overview = epRecord.overview;
          metadata.displayTitle = `${matchedRecord.title} - S${padZero(parsed.season)}E${padZero(parsed.episode)} - ${epRecord.title}`;
          metadata.posterUrl = matchedRecord.posterUrl;
          metadata.confidenceScore = Math.min(100, finalConfidence + 10); // Season Episode match boost
        } else {
          metadata.episodeTitle = `Episode ${parsed.episode}`;
          metadata.overview = `Season ${parsed.season}, Episode ${parsed.episode} of ${matchedRecord.title}.`;
          metadata.displayTitle = `${matchedRecord.title} - S${padZero(parsed.season)}E${padZero(parsed.episode)}`;
          metadata.posterUrl = matchedRecord.posterUrl;
          metadata.confidenceScore = Math.round(finalConfidence * 0.85); // lower because episode specs unspecified
        }
      } else {
        // Just the general show
        metadata.overview = matchedRecord.overview;
        metadata.displayTitle = `${matchedRecord.title} (Season ${parsed.season || 1})`;
        metadata.posterUrl = matchedRecord.posterUrl;
        metadata.confidenceScore = finalConfidence;
      }
    } else {
      // It is a movie!
      metadata.movieTitle = matchedRecord.title;
      metadata.mediaType = 'movie';
      metadata.overview = matchedRecord.overview;
      metadata.posterUrl = matchedRecord.posterUrl;
      metadata.displayTitle = matchedRecord.title + (parsed.year ? ` (${parsed.year})` : '');
      metadata.year = parsed.year || matchedRecord.year;
      metadata.confidenceScore = finalConfidence;
    }
    
    metadata.metadataProvider = 'Local Database';
    metadata.lastMatchedAt = new Date().toISOString();
  } else {
    // Dynamic Fallback Classifying on-the-fly (deterministic model parsing fallback)
    // Infers beautiful genres based on common title keyword categories
    metadata.confidenceScore = 40; // baseline parsed confidence
    metadata.displayTitle = parsed.cleanedTitle + (parsed.year ? ` (${parsed.year})` : '');
    
    // Assign posters dynamically based on inferred classifications
    const genres = detectGenresFromKeywords(parsed.cleanedTitle);
    metadata.genres = genres;
    
    // Use the getStablePoster fallback as built
    const primaryGenre = genres[0] || 'General VOD';
    metadata.posterUrl = getPosterForChannel(parsed.cleanedTitle, primaryGenre);
  }

  return metadata;
};

// Basic keyword classifier rules
const detectGenresFromKeywords = (title: string): string[] => {
  const lower = title.toLowerCase();
  const genres: string[] = [];

  if (/\b(action|gun|fury|chase|war|soldier|fight|strike|agent|kill|force|danger)\b/i.test(lower)) {
    genres.push("Action & Adventure");
  }
  if (/\b(sci-fi|cyber|planet|universe|space|astronaut|laser|robot|clone|inter|tears|steel|future|time)\b/i.test(lower)) {
    genres.push("Sci-Fi & Fantasy");
  }
  if (/\b(comedy|laugh|joke|funny|fun|show|parody|spoof|bunny)\b/i.test(lower)) {
    genres.push("Comedy & Entertainment");
  }
  if (/\b(love|romance|heart|date|husband|affair|drama|tear)\b/i.test(lower)) {
    genres.push("Drama & Romance");
  }
  if (/\b(scary|murder|horror|slasher|terror|blood|gore|thriller|dead|kill|suicide|crime|psycho|sinister|evil|creepy|demon|vampire|zombie|manson)\b/i.test(lower)) {
    genres.push("Thriller & Horror");
  }
  if (/\b(documentary|science|nasa|history|earth|facts|biography)\b/i.test(lower)) {
    genres.push("Documentary & Science");
  }
  if (/\b(animation|kids|family|cartoon|pixar|disney|toy)\b/i.test(lower)) {
    // Verify Charles Manson or horror elements don't creep in
    if (!/\b(manson|slasher|horror|scary|gore|suicide)\b/i.test(lower)) {
      genres.push("Kids & Animation");
    }
  }

  if (genres.length === 0) genres.push("General VOD");
  return genres;
};

// Hash strings for stable matching IDs
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const padZero = (n: number) => n < 10 ? `0${n}` : `${n}`;

const THEME_POSTER_FALLBACKS: Record<string, string[]> = {
  "Action & Adventure": [
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&q=80",
    "https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=400&q=80"
  ],
  "Sci-Fi & Fantasy": [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
    "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80"
  ],
  "Comedy & Entertainment": [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80",
    "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400&q=80"
  ],
  "Drama & Romance": [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80",
    "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=400&q=80"
  ],
  "Thriller & Horror": [
    "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80",
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=400&q=80"
  ],
  "Documentary & Science": [
    "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=400&q=80",
    "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=400&q=80"
  ],
  "Kids & Animation": [
    "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&q=80",
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80"
  ],
  "General VOD": [
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80",
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80"
  ]
};

const getPosterForChannel = (name: string, category: string): string => {
  const images = THEME_POSTER_FALLBACKS[category] || THEME_POSTER_FALLBACKS["General VOD"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
};
