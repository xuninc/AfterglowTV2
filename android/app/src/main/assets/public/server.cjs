var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_iptv_playlist_parser = __toESM(require("iptv-playlist-parser"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
function isVideoFile(filename) {
  const extensions = [".mp4", ".mkv", ".avi", ".mov", ".ts", ".wmv", ".m4v", ".flv"];
  const ext = import_path.default.extname(filename).toLowerCase();
  return extensions.includes(ext);
}
async function scanLocalDirectory(dirPath, currentDepth = 1, maxDepth = 3) {
  const files = [];
  try {
    const entries = await import_fs.default.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path.default.join(dirPath, entry.name);
      if (entry.isDirectory() && currentDepth < maxDepth) {
        const subFiles = await scanLocalDirectory(fullPath, currentDepth + 1, maxDepth);
        files.push(...subFiles.map((subFile) => import_path.default.join(entry.name, subFile)));
      } else if (entry.isFile() && isVideoFile(entry.name)) {
        files.push(entry.name);
      }
    }
  } catch (err) {
    throw err;
  }
  return files;
}
function getSimulatedFilesForPath(dirPath) {
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
import_dotenv.default.config();
var aiClient = null;
function getGenAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/playlist", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await import_axios.default.get(url, { timeout: 1e4 });
      const result = import_iptv_playlist_parser.default.parse(response.data);
      res.json(result);
    } catch (error) {
      console.error("Playlist fetch error:", error.message);
      res.status(500).json({ error: "Failed to fetch playlist", details: error.message });
    }
  });
  app.get("/api/epg", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await import_axios.default.get(url, { timeout: 15e3 });
      res.set("Content-Type", "application/xml");
      res.send(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch EPG" });
    }
  });
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
            type: import_genai.Type.ARRAY,
            items: {
              type: import_genai.Type.OBJECT,
              properties: {
                originalTitle: { type: import_genai.Type.STRING, description: "The exact matching title from the provided list" },
                group: { type: import_genai.Type.STRING, description: "The classified sector, strictly one of: Action & Adventure, Sci-Fi & Fantasy, Comedy & Entertainment, Drama & Romance, Thriller & Horror, Documentary & Science, Kids & Animation, General VOD" },
                releaseYear: { type: import_genai.Type.INTEGER, description: "Estimated year of release, defaults to 2024" },
                duration: { type: import_genai.Type.STRING, description: "Average duration, format like: 1h 45m or 2h 15m (or 42m for TV show episodes)" },
                description: { type: import_genai.Type.STRING, description: "A high-quality engaging 1-2 sentence description of the plot or theme." }
              },
              required: ["originalTitle", "group", "releaseYear", "duration", "description"]
            }
          }
        }
      });
      const text = response.text ? response.text.trim() : "[]";
      res.json(JSON.parse(text));
    } catch (error) {
      console.warn("Gemini VOD classification fallback triggered:", error.message);
      const fallbackResults = titles.map((title) => {
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
          description: `Cleaned cinematic stream: ${title.replace(/[\W_]+/g, " ").trim()}.`
        };
      });
      res.json(fallbackResults);
    }
  });
  app.post("/api/library/scan", async (req, res) => {
    const { paths, simulate } = req.body;
    if (!paths || !Array.isArray(paths)) {
      return res.status(400).json({ error: "An array of paths is required" });
    }
    const results = {};
    for (const folderPath of paths) {
      if (!folderPath || typeof folderPath !== "string") continue;
      try {
        const stats = await import_fs.default.promises.stat(folderPath);
        if (!stats.isDirectory()) {
          throw new Error("Path is not a directory");
        }
        const files = await scanLocalDirectory(folderPath);
        results[folderPath] = {
          files,
          status: "active"
        };
      } catch (error) {
        if (simulate) {
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
  app.get("/api/stalker", async (req, res) => {
    const { portalUrl, mac } = req.query;
    if (!portalUrl || !mac || typeof portalUrl !== "string" || typeof mac !== "string") {
      return res.status(400).json({ error: "Portal URL and MAC address are required" });
    }
    try {
      const cleanPortal = portalUrl.endsWith("/") ? portalUrl : `${portalUrl}/`;
      const handshakeUrl = `${cleanPortal}server/load.php?type=stb&action=handshake&mac=${encodeURIComponent(mac)}`;
      const handshake = await import_axios.default.get(handshakeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stb appWebKit/533.3 Safari/533.3",
          "X-User-MAC": mac,
          "Accept": "*/*"
        },
        timeout: 6e4
      });
      const token = handshake.data?.js?.token || "";
      const channelsUrl = `${cleanPortal}server/load.php?type=itv&action=get_all_channels`;
      const channelsResponse = await import_axios.default.get(channelsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stb appWebKit/533.3 Safari/533.3",
          "X-User-MAC": mac,
          "Authorization": token ? `Bearer ${token}` : "",
          "Cookie": `mac=${mac};`,
          "Accept": "*/*"
        },
        timeout: 6e4
      });
      if (!channelsResponse.data || !channelsResponse.data.js || !Array.isArray(channelsResponse.data.js.data)) {
        throw new Error("Invalid Stalker response format or Access Denied");
      }
      const mappedChannels = channelsResponse.data.js.data.map((ch) => ({
        name: ch.name || `Channel ${ch.number || ""}`,
        url: ch.cmd?.replace("ffmpeg ", "") || "",
        group: ch.tv_genre_id || "Stalker Broadcast",
        logo: ch.logo || ""
      }));
      res.json({ name: "Stalker Portal Link", channels: mappedChannels });
    } catch (error) {
      console.warn("Stalker handshake/fetch blocked by middleware firewall:", error.message);
      res.status(403).json({
        error: "Forbidden",
        details: "Stalker middleware blocked request (typical of remote MAG devices). Fallback demo setup is enabled."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Afterglow TV backend running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
