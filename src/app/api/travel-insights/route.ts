import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DestinationData } from "@/lib/types/tourism";
import { generateTourismData } from "@/lib/gemini";

interface MonthEvent {
  name: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  type?: "holiday" | "festival";
}

interface MonthInsight {
  month: number; // 1-12
  label: string;
  avgHighC: number;
  avgLowC: number;
  avgHighF: number;
  avgLowF: number;
  precipitationMm: number;
  yearly?: YearWeather[];
  crowd: number; // 1-5, 0 = unknown
  season: "peak" | "shoulder" | "off" | "unknown";
  events: MonthEvent[];
  score: number; // 1-10 overall recommendation
  recommendation: "great" | "good" | "okay" | "avoid";
}

interface TravelInsightsResponse {
  months: MonthInsight[];
  dailyAverages?: Record<string, { highC: number; lowC: number }>; // "MM-DD" → 3-year avg
  notes?: string;
  hasWeatherData: boolean;
  hasTourismData: boolean;
}

// In-memory cache: "lat,lng" → weather data (survives within same process lifecycle)
const weatherCache = new Map<string, { data: WeatherResult; fetchedAt: number }>();
const holidayCache = new Map<string, { data: NagerHoliday[]; fetchedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface YearWeather {
  year: number;
  highC: number;
  lowC: number;
  precipMm: number;
}

interface DailyAvg {
  highC: number;
  lowC: number;
}

interface MonthlyWeather {
  month: number;
  avgHighC: number;
  avgLowC: number;
  precipitationMm: number;
  yearly: YearWeather[];
}

interface WeatherResult {
  monthly: MonthlyWeather[];
  daily: Record<string, DailyAvg>; // "MM-DD" → 3-year avg
}

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  types: string[];
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function fetchWeatherData(lat: number, lng: number): Promise<WeatherResult> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  // Fetch 3 years of daily data from Open-Meteo archive API (free, no key)
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 2;
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status}`);
  }

  const data = await res.json();
  const daily = data.daily;

  if (!daily?.time || !daily?.temperature_2m_max) {
    throw new Error("Invalid weather data");
  }

  // Aggregate daily data into monthly averages, per year and overall
  // Also compute per-day-of-year averages (3-year avg for each calendar day)
  const yearMonthBuckets = new Map<string, { highs: number[]; lows: number[]; precip: number[] }>();
  const monthBuckets: { highs: number[]; lows: number[]; precip: number[] }[] =
    Array.from({ length: 12 }, () => ({ highs: [], lows: [], precip: [] }));
  const dayBuckets = new Map<string, { highs: number[]; lows: number[] }>(); // "MM-DD" → values

  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i] as string;
    const year = parseInt(date.split("-")[0], 10);
    const month = parseInt(date.split("-")[1], 10) - 1; // 0-11
    const mmdd = date.slice(5); // "MM-DD"

    if (daily.temperature_2m_max[i] != null) monthBuckets[month].highs.push(daily.temperature_2m_max[i]);
    if (daily.temperature_2m_min[i] != null) monthBuckets[month].lows.push(daily.temperature_2m_min[i]);
    if (daily.precipitation_sum[i] != null) monthBuckets[month].precip.push(daily.precipitation_sum[i]);

    const key = `${year}-${month}`;
    if (!yearMonthBuckets.has(key)) yearMonthBuckets.set(key, { highs: [], lows: [], precip: [] });
    const ym = yearMonthBuckets.get(key)!;
    if (daily.temperature_2m_max[i] != null) ym.highs.push(daily.temperature_2m_max[i]);
    if (daily.temperature_2m_min[i] != null) ym.lows.push(daily.temperature_2m_min[i]);
    if (daily.precipitation_sum[i] != null) ym.precip.push(daily.precipitation_sum[i]);

    // Daily buckets for per-day-of-year averages
    if (!dayBuckets.has(mmdd)) dayBuckets.set(mmdd, { highs: [], lows: [] });
    const db = dayBuckets.get(mmdd)!;
    if (daily.temperature_2m_max[i] != null) db.highs.push(daily.temperature_2m_max[i]);
    if (daily.temperature_2m_min[i] != null) db.lows.push(daily.temperature_2m_min[i]);
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const years = [startYear, startYear + 1, endYear];

  const monthlyData: MonthlyWeather[] = monthBuckets.map((bucket, i) => {
    const yearly: YearWeather[] = years.map(year => {
      const ym = yearMonthBuckets.get(`${year}-${i}`);
      return {
        year,
        highC: ym ? Math.round(avg(ym.highs) * 10) / 10 : 0,
        lowC: ym ? Math.round(avg(ym.lows) * 10) / 10 : 0,
        precipMm: ym ? Math.round(sum(ym.precip) * 10) / 10 : 0,
      };
    });
    return {
      month: i + 1,
      avgHighC: Math.round(avg(bucket.highs) * 10) / 10,
      avgLowC: Math.round(avg(bucket.lows) * 10) / 10,
      precipitationMm: Math.round((sum(bucket.precip) / 3) * 10) / 10,
      yearly,
    };
  });

  // Build daily averages map: "MM-DD" → { highC, lowC }
  const dailyAverages: Record<string, DailyAvg> = {};
  for (const [mmdd, bucket] of dayBuckets) {
    dailyAverages[mmdd] = {
      highC: Math.round(avg(bucket.highs)),
      lowC: Math.round(avg(bucket.lows)),
    };
  }

  const result: WeatherResult = { monthly: monthlyData, daily: dailyAverages };
  weatherCache.set(cacheKey, { data: result, fetchedAt: Date.now() });

  if (weatherCache.size > 500) {
    const oldest = [...weatherCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
    weatherCache.delete(oldest[0]);
  }

  return result;
}

/**
 * Fetch public holidays from Nager.Date API for the next 12 months.
 * Fetches current year and next year, then filters to the rolling window.
 */
async function fetchHolidays(countryCode: string): Promise<NagerHoliday[]> {
  const cacheKey = countryCode.toUpperCase();
  const cached = holidayCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  const allHolidays: NagerHoliday[] = [];

  for (const year of years) {
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${cacheKey}`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Only include global public holidays (not regional/observances)
          allHolidays.push(
            ...data.filter((h: NagerHoliday) =>
              h.global && h.types?.includes("Public")
            )
          );
        }
      }
    } catch {
      // Nager.Date may not support this country — skip silently
    }
  }

  holidayCache.set(cacheKey, { data: allHolidays, fetchedAt: Date.now() });

  if (holidayCache.size > 200) {
    const oldest = [...holidayCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
    holidayCache.delete(oldest[0]);
  }

  return allHolidays;
}

function scoreMonth(
  weather: MonthlyWeather | null,
  crowd: number,
  season: "peak" | "shoulder" | "off" | "unknown"
): number {
  let score = 5;

  if (weather) {
    const high = weather.avgHighC;
    if (high >= 20 && high <= 28) score += 2;
    else if (high >= 15 && high <= 32) score += 1;
    else if (high > 35) score -= 2;
    else if (high < 10) score -= 1;
    else if (high > 32) score -= 1;

    if (weather.precipitationMm < 30) score += 1;
    else if (weather.precipitationMm > 150) score -= 2;
    else if (weather.precipitationMm > 100) score -= 1;
  }

  if (crowd > 0) {
    if (crowd <= 2) score += 2;
    else if (crowd === 3) score += 1;
    else if (crowd === 4) score -= 0;
    else if (crowd >= 5) score -= 1;
  }

  if (season === "shoulder") score += 1;

  return Math.max(1, Math.min(10, score));
}

/** Assign recommendations relative to the 12-month set */
function assignRecommendations(months: { score: number }[]): ("great" | "good" | "okay" | "avoid")[] {
  const sorted = [...months].map((m, i) => ({ score: m.score, i })).sort((a, b) => b.score - a.score);

  const recommendations: ("great" | "good" | "okay" | "avoid")[] = new Array(12).fill("okay");

  // Top 25% → great, next 25% → good, next 25% → okay, bottom 25% → avoid
  for (let rank = 0; rank < sorted.length; rank++) {
    const pct = rank / sorted.length;
    let rec: "great" | "good" | "okay" | "avoid";
    if (pct < 0.25) rec = "great";
    else if (pct < 0.5) rec = "good";
    else if (pct < 0.75) rec = "okay";
    else rec = "avoid";
    recommendations[sorted[rank].i] = rec;
  }

  return recommendations;
}

/**
 * Look up tourism data:
 * 1. Supabase tourism_data table (cached)
 * 2. Gemini Flash on-demand generation (cached to DB)
 */
async function getTourismData(cityName: string, location?: { countryCode?: string; country?: string; state?: string }): Promise<DestinationData | null> {
  const normalized = cityName.toLowerCase().trim();

  // Try cache with exact name and common variants (e.g. "new york city" ↔ "new york")
  const variants = [normalized];
  if (normalized.endsWith(" city")) variants.push(normalized.slice(0, -5));
  else variants.push(normalized + " city");

  try {
    const { data: rows } = await supabaseAdmin
      .from("tourism_data")
      .select("data")
      .in("city", variants)
      .limit(1);

    if (rows?.[0]?.data) {
      return rows[0].data as DestinationData;
    }
  } catch {
    // Table may not exist yet or query failed — fall through
  }

  const generated = await generateTourismData(cityName, location);
  if (generated) {
    supabaseAdmin
      .from("tourism_data")
      .upsert({
        city: normalized,
        data: generated.data,
        model_used: generated.model,
        source: "gemini",
        generated_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn("Failed to cache tourism data:", error.message);
      });

    return generated.data;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const city = request.nextUrl.searchParams.get("city") ?? "";
  const countryCode = request.nextUrl.searchParams.get("country") ?? "";
  const countryName = request.nextUrl.searchParams.get("countryName") ?? "";
  const stateName = request.nextUrl.searchParams.get("stateName") ?? "";

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    // Fetch weather, tourism, and holidays in parallel
    const [weatherResult, tourism, holidays] = await Promise.all([
      fetchWeatherData(latitude, longitude).catch((e) => {
        console.warn("Weather fetch failed:", e);
        return null;
      }),
      getTourismData(city, { countryCode, country: countryName, state: stateName }),
      countryCode ? fetchHolidays(countryCode).catch(() => []) : Promise.resolve([]),
    ]);

    const hasWeatherData = !!weatherResult;
    const hasTourismData = !!tourism;

    // Build month insights
    const months: MonthInsight[] = MONTH_LABELS.map((label, i) => {
      const monthNum = i + 1;
      const weather = weatherResult?.monthly[i] ?? null;
      const tourismMonth = tourism?.months[i];
      const crowd = tourismMonth?.crowd ?? 0;
      const season = tourismMonth?.season ?? "unknown";

      // Festival events from Gemini (with approximate dates if available)
      const festivalEvents: MonthEvent[] = tourism?.events
        .filter(e => e.month === monthNum)
        .map(e => ({
          name: e.name,
          description: e.description,
          date: e.date,
          type: "festival" as const,
        })) ?? [];

      // Public holidays from Nager.Date (both years — component filters by tile year)
      const holidayEvents: MonthEvent[] = holidays
        .filter(h => {
          const month = parseInt(h.date.split("-")[1], 10);
          return month === monthNum;
        })
        .map(h => ({
          name: h.name,
          description: h.localName !== h.name ? h.localName : undefined,
          date: h.date,
          type: "holiday" as const,
        }));

      // Merge: holidays first, then festivals
      const events = [...holidayEvents, ...festivalEvents];

      const score = scoreMonth(weather, crowd, season);

      return {
        month: monthNum,
        label,
        avgHighC: weather?.avgHighC ?? 0,
        avgLowC: weather?.avgLowC ?? 0,
        avgHighF: weather ? Math.round(weather.avgHighC * 9 / 5 + 32) : 0,
        avgLowF: weather ? Math.round(weather.avgLowC * 9 / 5 + 32) : 0,
        precipitationMm: weather?.precipitationMm ?? 0,
        yearly: weather?.yearly,
        crowd,
        season,
        events,
        score,
        recommendation: "okay" as const, // placeholder
      };
    });

    // Assign recommendations relative to the 12-month set
    const recommendations = assignRecommendations(months);
    for (let i = 0; i < months.length; i++) {
      months[i].recommendation = recommendations[i];
    }

    const response: TravelInsightsResponse = {
      months,
      dailyAverages: weatherResult?.daily,
      notes: tourism?.notes,
      hasWeatherData,
      hasTourismData,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": hasTourismData && hasWeatherData
          ? "public, s-maxage=86400, stale-while-revalidate=604800"
          : "no-cache",
      },
    });
  } catch (error) {
    console.error("Travel insights error:", error);
    return NextResponse.json({ error: "Failed to fetch travel insights" }, { status: 500 });
  }
}
