import { parse, isValid } from 'date-fns';

interface EPGProgram {
  start: Date;
  end: Date;
  title: string;
  description?: string;
}

export const parseEPG = (xmlString: string): Record<string, EPGProgram[]> => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const programs = xmlDoc.getElementsByTagName("programme");
  const epgData: Record<string, EPGProgram[]> = {};

  // XMLTV date format: YYYYMMDDHHMMSS +HHMM or YYYYMMDDHHMMSS
  const parseXMLTVDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    
    // Remove space and timezone for simplified parsing if present
    const cleanDate = dateStr.split(' ')[0];
    
    // We'll try a few common lengths
    if (cleanDate.length >= 14) {
        const format = 'yyyyMMddHHmmss';
        const parsed = parse(cleanDate.substring(0, 14), format, new Date());
        return isValid(parsed) ? parsed : new Date();
    } else if (cleanDate.length >= 8) {
        const format = 'yyyyMMdd';
        const parsed = parse(cleanDate.substring(0, 8), format, new Date());
        return isValid(parsed) ? parsed : new Date();
    }
    
    return new Date();
  };

  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    const channelId = p.getAttribute("channel");
    if (!channelId) continue;

    const start = parseXMLTVDate(p.getAttribute("start") || "");
    const end = parseXMLTVDate(p.getAttribute("stop") || "");
    const title = p.getElementsByTagName("title")[0]?.textContent || "No Title";
    const description = p.getElementsByTagName("desc")[0]?.textContent || "";

    if (!epgData[channelId]) {
      epgData[channelId] = [];
    }

    epgData[channelId].push({ start, end, title, description });
  }

  return epgData;
};
