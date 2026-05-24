import express from "express";
import path from "path";
import axios from "axios";
import parser from "iptv-playlist-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

// Helper to check if a file has a video extension
function isVideoFile(filename: string): boolean {
  const extensions = [".mp4", ".mkv", ".avi", ".mov", ".ts", ".wmv", ".m4v", ".flv"];
  const ext = path.extname(filename).toLowerCase();
  return extensions.includes(ext);
}

// Deep nested directory walker (capped at depth 3)
async function scanLocalDirectory(dirPath: string, currentDepth = 1, maxDepth = 3): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory() && currentDepth < maxDepth) {
        const subFiles = await scanLocalDirectory(fullPath, currentDepth + 1, maxDepth);
        files.push(...subFiles.map(subFile => path.join(entry.name, subFile)));
      } else if (entry.isFile() && isVideoFile(entry.name)) {
        files.push(entry.name);
      }
    }
  } catch (err) {
    throw err;
  }
  return files;
}

// Simulated movie/TV show files if local paths do not exist in the Cloud Run environment
function getSimulatedFilesForPath(dirPath: string): string[] {
  const lowerPath = dirPath.toLowerCase();
  if (lowerPath.includes("tv") || lowerPath.includes("show") || lowerPath.includes("series")) {
    return [
      "Stranger.Things.S01E01.Vanishing.Of.Will.Byers.1080p.mkv",
      "Stranger.Things.S01E02.The.Weirdo.on.Maple.Street.1080p.mkv",
      "Breaking.Bad.S01E01.Pilot.720p.mkv",
      "Breaking.Bad.S01E02.Cat's.in.the.Bag.720p.mkv",
      "Supernatural.S15E01.Back.and.to.the.Future.HD.mp4",
      "Supernatural.S15E05.Proverbs.17.3.1080p.mkv"
    ];
  } else if (lowerPath.includes("movie") || lowerPath.includes("film") || lowerPath.includes("cinema")) {
    return [
      "The.Matrix.1999.Remastered.1080p.Bluray.mp4",
      "Inception.2010.2160p.UHD.mkv",
      "Interstellar.2014.IMAX.1080p.mkv",
      "Sintel.2010.OpenMovie.1080p.mkv",
      "Tears.of.Steel.2012.SciFi.720p.mp4",
      "Cosmos.Laundromat.2015.Special.Edition.mkv"
    ];
  } else {
    return [
      "The.Matrix.1999.Remastered.1080p.Bluray.mp4",
      "Inception.2010.2160p.UHD.mkv",
      "Stranger.Things.S01E01.1080p.mkv",
      "Supernatural.S15E05.Proverbs.17.3.1080p.mkv",
      "Sintel.2010.OpenMovie.1080p.mkv",
      "Big.Buck.Bunny.2008.Cartoon.1080p.mkv"
    ];
  }
}

dotenv.config();

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Fallback M3U Parser in case standard parsers miss non-conforming lines or throw errors
  function parseM3uFallback(m3uText: string): any {
    const items: any[] = [];
    const lines = m3uText.split(/\r?\n/);
    let currentItem: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.toUpperCase().startsWith("#EXTINF:")) {
        currentItem = {
          name: "Unknown Channel",
          tvg: { id: "", name: "", logo: "", url: "" },
          group: { title: "General" },
          url: ""
        };

        // Extract tvg-id
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i) || line.match(/tvg-id=([^,\s]+)/i);
        if (tvgIdMatch) {
          currentItem.tvg.id = tvgIdMatch[1];
        }

        // Extract tvg-logo
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i) || line.match(/tvg-logo=([^,\s]+)/i);
        if (logoMatch) {
          currentItem.tvg.logo = logoMatch[1];
        }

        // Extract group-title
        const groupMatch = line.match(/group-title="([^"]*)"/i) || line.match(/group-title=([^,\s]+)/i);
        if (groupMatch) {
          currentItem.group.title = groupMatch[1];
        }

        // Extract name (last comma to end of line)
        const commaIndex = line.lastIndexOf(",");
        if (commaIndex !== -1) {
          currentItem.name = line.substring(commaIndex + 1).trim();
        }
      } else if (line.startsWith("#")) {
        // Skip comment lines or other unparsed tag types
      } else if (line.startsWith("http://") || line.startsWith("https://") || line.includes("://") || line.endsWith(".m3u8") || line.endsWith(".ts")) {
        if (currentItem) {
          currentItem.url = line;
          items.push(currentItem);
          currentItem = null;
        } else {
          // Plain URL link directly
          const urlParts = line.split("/");
          const lastPart = urlParts[urlParts.length - 1] || "Channel";
          items.push({
            name: lastPart.replace(/\.[^/.]+$/, ""),
            tvg: { id: "", name: "", logo: "", url: "" },
            group: { title: "General" },
            url: line
          });
        }
      }
    }

    return { header: {}, items };
  }

  // API: Fetch and Parse M3U
  app.get("/api/playlist", async (req, res) => {
    const { url, userAgent } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const resolvedUserAgent = typeof userAgent === "string" && userAgent
      ? userAgent
      : "VLC/3.0.18 LibVLC/3.0.18";

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent": resolvedUserAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });

      const rawData = response.data && typeof response.data === "string" ? response.data.trim() : "";
      
      // Perform validation checks to detect HTML landing/blocking pages returned as 200 OK
      if (rawData.startsWith("<!DOCTYPE html") || rawData.startsWith("<html") || rawData.includes("<body") || rawData.includes("<html")) {
        return res.status(400).json({
          error: "Incompatible data source",
          details: "The playlist URL returned an HTML website instead of a valid M3U playlist file. This usually occurs if the provider blocks direct program requests, if secure authorization is required, or if the credentials embedded in the URL are invalid. Double-check your setup link parameters."
        });
      }

      let result: any = null;
      try {
        result = parser.parse(response.data);
      } catch (parseErr: any) {
        console.warn("Main IPTV M3U parser failed, fell back to manual parsing:", parseErr.message);
      }

      // If standard parser failed or found zero items, activate manual fallback parser
      if (!result || !result.items || result.items.length === 0) {
        console.log("No items matched using traditional M3U parser. Initiating custom line-by-line fallback parsing...");
        result = parseM3uFallback(response.data);
      }

      console.log(`Playlist Loaded Successfully. Channels registered: ${result.items ? result.items.length : 0}`);
      res.json(result);
    } catch (error: any) {
      console.error("Playlist fetch failed:", error.message);
      res.status(500).json({ 
        error: "Failed to fetch playlist", 
        details: error.response?.data?.details || error.message || "Request timed out. Please check that the URL is correct and active." 
      });
    }
  });

  // API: Fetch EPG (Pass-through for now, or parse later)
  app.get("/api/epg", async (req, res) => {
    const { url, userAgent } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const resolvedUserAgent = typeof userAgent === "string" && userAgent
      ? userAgent
      : "VLC/3.0.18 LibVLC/3.0.18";

    try {
      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          "User-Agent": resolvedUserAgent,
          "Accept": "application/xml,text/xml,*/*;q=0.8"
        }
      });
      res.set("Content-Type", "application/xml");
      res.send(response.data);
    } catch (error: any) {
      console.error("EPG Sync Error:", error.message);
      res.status(500).json({ error: "Failed to fetch XMLTV EPG data feed" });
    }
  });

  // API: AI-powered VOD Classification & Movie Metadata Enrichment Gateway
  app.post("/api/vod/classify", async (req, res) => {
    const { titles } = req.body;
    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({ error: "An array of titles is required in the body" });
    }

    try {
      const ai = getGenAI();
      const prompt = `Classify this batch of on-demand content titles (movies or TV shows) into standard entertainment sectors.
Available Sectors: "Action & Adventure", "Sci-Fi & Fantasy", "Comedy & Entertainment", "Drama & Romance", "Thriller & Horror", "Documentary & Science", "Kids & Animation", "General VOD".

Titles to classify:
${JSON.stringify(titles)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalTitle: { type: Type.STRING, description: "The exact matching title from the provided list" },
                group: { type: Type.STRING, description: "The classified sector, strictly one of: Action & Adventure, Sci-Fi & Fantasy, Comedy & Entertainment, Drama & Romance, Thriller & Horror, Documentary & Science, Kids & Animation, General VOD" },
                releaseYear: { type: Type.INTEGER, description: "Estimated year of release, defaults to 2024" },
                duration: { type: Type.STRING, description: "Average duration, format like: 1h 45m or 2h 15m (or 42m for TV show episodes)" },
                description: { type: Type.STRING, description: "A high-quality engaging 1-2 sentence description of the plot or theme." }
              },
              required: ["originalTitle", "group", "releaseYear", "duration", "description"]
            }
          }
        }
      });

      const text = response.text ? response.text.trim() : "[]";
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.warn("Gemini VOD classification fallback triggered:", error.message);
      
      // Completely offline deterministic on-device simulation fallback
      const fallbackResults = titles.map(title => {
        const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 2024;
        
        let group = "General VOD";
        const lower = title.toLowerCase();
        
        if (/\b(action|gun|fury|chase|war|soldier|fight|strike|agent|kill|danger)\b/i.test(lower)) {
          group = "Action & Adventure";
        } else if (/\b(sci-fi|cyber|planet|universe|space|astronaut|laser|robot|clone|inter|tears|steel|future|time)\b/i.test(lower)) {
          group = "Sci-Fi & Fantasy";
        } else if (/\b(comedy|laugh|joke|funny|fun|show|parody|spoof|bunny)\b/i.test(lower)) {
          group = "Comedy & Entertainment";
        } else if (/\b(love|romance|heart|date|husband|affair|drama|tear)\b/i.test(lower)) {
          group = "Drama & Romance";
        } else if (/\b(scary|murder|horror|slasher|terror|blood|gore|thriller|dead|kill|suicide|crime|psycho|sinister|evil|creepy|demon|vampire|zombie|manson)\b/i.test(lower)) {
          group = "Thriller & Horror";
        } else if (/\b(documentary|science|nasa|history|earth|facts|biography)\b/i.test(lower)) {
          group = "Documentary & Science";
        } else if (/\b(animation|kids|family|cartoon|pixar|disney|toy)\b/i.test(lower)) {
          if (!/\b(manson|slasher|horror|scary|gore|suicide)\b/i.test(lower)) {
            group = "Kids & Animation";
          }
        }

        return {
          originalTitle: title,
          group,
          releaseYear: year,
          duration: "2h 15m",
          description: `Cleaned cinematic stream: ${title.replace(/[\W_]+/g, ' ').trim()}.`
        };
      });

      res.json(fallbackResults);
    }
  });

  // API: Scan Monitored Folder paths for Personal Media
  app.post("/api/library/scan", async (req, res) => {
    const { paths, simulate } = req.body;
    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "An array of paths is required" });
    }

    const results: Record<string, { files: string[]; status: "active" | "unreachable" }> = {};

    for (const folderPath of paths) {
      if (!folderPath || typeof folderPath !== "string") continue;
      
      try {
        const stats = await fs.promises.stat(folderPath);
        if (!stats.isDirectory()) {
          throw new Error("Path is not a directory");
        }
        
        const files = await scanLocalDirectory(folderPath);
        results[folderPath] = {
          files,
          status: "active"
        };
      } catch (error: any) {
        if (simulate) {
          // Fallback to simulated media downloaded folder in sandboxed remote container
          const simulatedFiles = getSimulatedFilesForPath(folderPath);
          results[folderPath] = {
            files: simulatedFiles,
            status: "active"
          };
        } else {
          results[folderPath] = {
            files: [],
            status: "unreachable"
          };
        }
      }
    }

    res.json({ results });
  });

  // API: Stalker Portal MAG/MAC Address Proxy Gateway
  app.get("/api/stalker", async (req, res) => {
    const { portalUrl, mac } = req.query;
    if (!portalUrl || !mac || typeof portalUrl !== "string" || typeof mac !== "string") {
      return res.status(400).json({ error: "Portal URL and MAC address are required" });
    }

    try {
      // 1. Perform server-side Handshake to mimic STB portal authentication
      const cleanPortal = portalUrl.endsWith("/") ? portalUrl : `${portalUrl}/`;
      const handshakeUrl = `${cleanPortal}server/load.php?type=stb&action=handshake&mac=${encodeURIComponent(mac)}`;
      
      const handshake = await axios.get(handshakeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stb appWebKit/533.3 Safari/533.3",
          "X-User-MAC": mac,
          "Accept": "*/*"
        },
        timeout: 60000
      });

      // Retrieve registration/token if any
      const token = handshake.data?.js?.token || "";
      
      // 2. Fetch CTV channel list
      const channelsUrl = `${cleanPortal}server/load.php?type=itv&action=get_all_channels`;
      const channelsResponse = await axios.get(channelsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stb appWebKit/533.3 Safari/533.3",
          "X-User-MAC": mac,
          "Authorization": token ? `Bearer ${token}` : "",
          "Cookie": `mac=${mac};`,
          "Accept": "*/*"
        },
        timeout: 60000
      });

      if (!channelsResponse.data || !channelsResponse.data.js || !Array.isArray(channelsResponse.data.js.data)) {
        throw new Error("Invalid Stalker response format or Access Denied");
      }

      // Map Stalker MAG channels to standard format
      const mappedChannels = channelsResponse.data.js.data.map((ch: any) => ({
        name: ch.name || `Channel ${ch.number || ""}`,
        url: ch.cmd?.replace("ffmpeg ", "") || "",
        group: ch.tv_genre_id || "Stalker Broadcast",
        logo: ch.logo || ""
      }));

      res.json({ name: "Stalker Portal Link", channels: mappedChannels });
    } catch (error: any) {
      console.warn("Stalker handshake/fetch blocked by middleware firewall:", error.message);
      // Stalker portal API's are notorious for limiting access strictly to registered local network devices.
      // We return a descriptive error detailing that access is blocked but we can trigger fallback
      res.status(403).json({ 
        error: "Forbidden", 
        details: "Stalker middleware blocked request (typical of remote MAG devices). Fallback demo setup is enabled." 
      });
    }
  });

  // API: CORS and Mixed Content Stream Proxy
  app.get("/api/stream-proxy", async (req, res) => {
    const { url, userAgent } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL parameter is required");
    }

    const resolvedUserAgent = typeof userAgent === "string" && userAgent
      ? userAgent
      : "VLC/3.0.18 LibVLC/3.0.18";

    try {
      const decodedUrl = decodeURIComponent(url);

      const headers: Record<string, string> = {
        "User-Agent": resolvedUserAgent,
        "Accept": "*/*",
      };

      // Handle common m3u8 headers or standard chunk requests
      const isM3u8 = decodedUrl.toLowerCase().includes(".m3u8") || 
                     decodedUrl.toLowerCase().includes("m3u8");

      if (isM3u8) {
        // Fetch as text to rewrite URLs so child streams and chunks are proxied as well
        const textResponse = await axios.get(decodedUrl, {
          headers,
          timeout: 10005,
          responseType: "text",
        });

        const lines = textResponse.data.split(/\r?\n/);
        const outputLines = lines.map((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // If line starts with '#', check if there is an embedded URI to rewrite (e.g., encryption keys or sub-playlists)
          if (trimmed.startsWith("#")) {
            let updatedLine = line;
            // Match URI="http://..." or URI="something.m3u8"
            const uriMatches = line.match(/URI="([^"]+)"/);
            if (uriMatches) {
              const originalUri = uriMatches[1];
              try {
                const absoluteUri = new URL(originalUri, decodedUrl).href;
                let proxiedUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`;
                if (resolvedUserAgent) {
                  proxiedUri += `&userAgent=${encodeURIComponent(resolvedUserAgent)}`;
                }
                updatedLine = line.replace(`URI="${originalUri}"`, `URI="${proxiedUri}"`);
              } catch (e) {
                // Ignore invalid URLs
              }
            }
            return updatedLine;
          }

          // If the line is a relative/absolute stream or segment URL
          try {
            const absoluteUrl = new URL(trimmed, decodedUrl).href;
            let proxiedUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUrl)}`;
            if (resolvedUserAgent) {
              proxiedUri += `&userAgent=${encodeURIComponent(resolvedUserAgent)}`;
            }
            return proxiedUri;
          } catch (e) {
            return line;
          }
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "*");
        return res.send(outputLines.join("\n"));
      }

      // Otherwise it is a binary chunk (.ts), license key, etc. Stream/Pipe directly.
      const response = await axios({
        method: "get",
        url: decodedUrl,
        headers,
        responseType: "stream",
        timeout: 15000,
        validateStatus: () => true,
      });

      res.status(response.status);
      const contentType = response.headers["content-type"];
      if (contentType && typeof contentType === "string") {
        res.setHeader("Content-Type", contentType);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      
      response.data.pipe(res);
    } catch (err: any) {
      console.warn("Stream proxy exception:", err.message);
      if (!res.headersSent) {
        res.status(502).send(`Stream proxy failed: ${err.message}`);
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Afterglow TV backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
