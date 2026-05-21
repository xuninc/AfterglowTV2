export interface MediaMetadata {
  id?: string; // unique ID or hash of the rawTitle
  rawTitle: string;
  cleanedTitle: string;
  displayTitle: string;
  mediaType: 'movie' | 'tv_show' | 'tv_episode' | 'unknown';
  showTitle?: string;
  movieTitle?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  year?: number;
  genres: string[];
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  providerSource: string;
  metadataProvider: 'TMDb' | 'OMDb' | 'Local Database';
  metadataId: string;
  confidenceScore: number; // 0-100 score
  lastScannedAt: string;
  lastMatchedAt: string;
  userEditedOverride?: boolean;
}

export interface LibraryStatistics {
  totalMovies: number;
  totalShows: number;
  totalEpisodes: number;
  totalUnmatched: number;
  scanProgress: number; // 0 to 100
  scoringAccuracy: number; // average confidence score
}
