export const DEFAULT_USER_AGENT = 'VLC/3.0.18 LibVLC/3.0.18';

export const USER_AGENT_PRESETS = [
  { label: 'VLC Media Player (Default)', value: DEFAULT_USER_AGENT },
  { label: 'TiviMate AndroidTV (Compatibility)', value: 'TiviMate/4.7.0 (Xiaomi MiTV-MSSP3; Android 9)' },
  { label: 'Standard Chrome Browser', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' },
  { label: 'IPTV Smarters', value: 'IPTVSmarters' },
];

export const normalizeUserAgent = (userAgent?: string | null) => {
  const trimmed = typeof userAgent === 'string' ? userAgent.trim() : '';
  return trimmed || DEFAULT_USER_AGENT;
};