/**
 * Gemini Flash client for generating tourism data.
 * Uses Google AI Studio free tier (1,000 req/day for Flash).
 */

import { DestinationData } from "@/lib/types/tourism";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Rate-limit guard: skip calls for 30 seconds after a 429
const RATE_LIMIT_BACKOFF = 30 * 1000;
const _global = globalThis as unknown as { __geminiRateLimitedUntil?: number };
// Reset stale rate limit on module load
_global.__geminiRateLimitedUntil = 0;
function getRateLimitedUntil() { return _global.__geminiRateLimitedUntil ?? 0; }
function setRateLimitedUntil(t: number) { _global.__geminiRateLimitedUntil = t; }

const PROMPT = `You are a travel data expert. Generate tourism data for the city provided.

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "months": [
    {"crowd": <1-5>, "season": "<peak|shoulder|off>"},
    ... (12 entries, index 0 = January, 11 = December)
  ],
  "events": [
    {"name": "<event name>", "month": <1-12>, "date": "<approximate date, e.g. 'Mar 15-22' or 'Late June'>", "description": "<brief description>"}
  ],
  "notes": "<1-2 sentence travel tip>"
}

Rules:
- crowd: 1 = very quiet, 2 = quiet, 3 = moderate, 4 = busy, 5 = very crowded
- season: relative to that city's tourism patterns
- events: include major festivals, cultural events, and seasonal highlights (NOT public holidays — those are handled separately). Only include events specific to this city or region.
- date: provide the approximate dates or date range when the event typically occurs (e.g. "Feb 10-16", "Mid-October", "Late March"). Be as specific as possible.
- notes: 1-2 sentences max about best time to visit
- descriptions: keep under 15 words each
- Be accurate. Do not invent festivals. If unsure about an event, omit it.
- Keep the response concise. Do not add extra fields or commentary.`;

export async function generateTourismData(
  cityName: string,
  location?: { countryCode?: string; country?: string; state?: string }
): Promise<{ data: DestinationData; model: string } | null> {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set, skipping tourism data generation");
    return null;
  }

  if (Date.now() < getRateLimitedUntil()) {
    console.warn("Gemini rate-limited, skipping until", new Date(getRateLimitedUntil()).toISOString());
    return null;
  }

  // Build a full location label: "City, State/Province, Country"
  const parts = [cityName];
  if (location?.state) parts.push(location.state);
  if (location?.country) parts.push(location.country);
  const cityLabel = parts.length > 1 ? parts.join(", ") : (location?.countryCode ? `${cityName}, ${location.countryCode}` : cityName);

  try {
    const res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { text: `City: ${cityLabel}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Gemini API error (${res.status}):`, err);
      if (res.status === 429) {
        setRateLimitedUntil(Date.now() + RATE_LIMIT_BACKOFF);
      }
      return null;
    }

    const result = await res.json();
    const finishReason = result.candidates?.[0]?.finishReason;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini returned no content");
      return null;
    }

    if (finishReason === "MAX_TOKENS") {
      console.error("Gemini response truncated (MAX_TOKENS) for", cityLabel);
      return null;
    }

    const parsed = JSON.parse(text) as DestinationData;

    // Normalize season values (flash-lite may return variants like "busy", "high", "low")
    const SEASON_MAP: Record<string, "peak" | "shoulder" | "off"> = {
      peak: "peak", high: "peak", busy: "peak",
      shoulder: "shoulder", moderate: "shoulder", mid: "shoulder",
      off: "off", low: "off", quiet: "off",
    };
    if (Array.isArray(parsed.months)) {
      for (const m of parsed.months) {
        m.season = SEASON_MAP[m.season?.toLowerCase()] ?? "shoulder";
        m.crowd = Math.max(1, Math.min(5, Math.round(Number(m.crowd) || 3)));
      }
    }

    // Validate structure
    if (
      !Array.isArray(parsed.months) ||
      parsed.months.length !== 12 ||
      !parsed.months.every(
        (m) =>
          typeof m.crowd === "number" &&
          m.crowd >= 1 &&
          m.crowd <= 5 &&
          ["peak", "shoulder", "off"].includes(m.season)
      )
    ) {
      console.error("Gemini returned invalid month data");
      return null;
    }

    if (!Array.isArray(parsed.events)) {
      parsed.events = [];
    }

    return { data: parsed, model: MODEL };
  } catch (err) {
    console.error("Gemini generation failed:", err);
    return null;
  }
}
