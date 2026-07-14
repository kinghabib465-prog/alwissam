/**
 * Normalize Google Maps paste input into embed + openable link URLs.
 * Accepts: iframe HTML, /maps/embed links, place URLs, short goo.gl links, plain query text.
 */
export function extractMapsInput(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const iframeSrc = trimmed.match(/src=["']([^"']+)["']/i);
  return (iframeSrc?.[1] || trimmed).trim();
}

export function toGoogleMapsEmbedUrl(raw: string): string {
  const input = extractMapsInput(raw);
  if (!input) return "";

  if (/\/maps\/embed/i.test(input) || /[?&]output=embed\b/i.test(input)) {
    return input;
  }

  const atMatch = input.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (atMatch) {
    const [, lat, lng] = atMatch;
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }

  try {
    const url = new URL(input);

    const q = url.searchParams.get("q") || url.searchParams.get("query");
    if (q) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
    }

    const place = url.pathname.match(/\/maps\/place\/([^/]+)/i);
    if (place?.[1]) {
      return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(place[1]))}&z=16&output=embed`;
    }

    const dir = url.pathname.match(/\/maps\/dir\/([^/]+)/i);
    if (dir?.[1] && dir[1] !== "") {
      const parts = url.pathname.split("/").filter(Boolean);
      const dest = parts[parts.length - 1];
      if (dest && dest !== "dir") {
        return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(dest))}&z=16&output=embed`;
      }
    }

    // Short links / any other Maps URL → embed via q=
    if (
      url.hostname.includes("google.") ||
      url.hostname.includes("goo.gl") ||
      url.hostname.includes("maps.app")
    ) {
      return `https://www.google.com/maps?q=${encodeURIComponent(input)}&z=16&output=embed`;
    }
  } catch {
    // plain address text
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(input)}&z=16&output=embed`;
}

export function toGoogleMapsOpenUrl(raw: string): string {
  const input = extractMapsInput(raw);
  if (!input) return "";

  if (/^https?:\/\//i.test(input)) return input;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input)}`;
}

export function normalizeMapsFields(input: {
  mapsEmbedUrl?: string;
  mapsLink?: string;
}): { mapsEmbedUrl: string; mapsLink: string } {
  const primary = extractMapsInput(
    input.mapsEmbedUrl || input.mapsLink || "",
  );
  const secondary = extractMapsInput(input.mapsLink || "");

  const sourceForEmbed = primary || secondary;
  const sourceForLink = secondary || primary;

  return {
    mapsEmbedUrl: toGoogleMapsEmbedUrl(sourceForEmbed),
    mapsLink: toGoogleMapsOpenUrl(sourceForLink),
  };
}
