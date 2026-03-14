import {
  WeekendData,
  WeekendScore,
  DateRange,
  CityConfig,
  FlightCategory,
  BudgetTier,
  ScoringAlgorithm,
  RankChangeMap,
  RankChangeInfo,
  CityPriceChange,
  AirbnbChange,
} from "./types";
import { scoreAllWeekends } from "./scoring";

export function computeRankChanges(
  previousData: WeekendData,
  currentScores: WeekendScore[],
  dateRanges: DateRange[],
  flightCategory: FlightCategory,
  budgetTier: BudgetTier,
  cities: CityConfig[],
  priorityCity: string,
  scoringAlgorithm: ScoringAlgorithm
): RankChangeMap {
  const previousScores = scoreAllWeekends(
    dateRanges,
    previousData.flights ?? [],
    previousData.flightOptions ?? [],
    previousData.airbnbListings ?? [],
    flightCategory,
    budgetTier,
    cities,
    priorityCity,
    scoringAlgorithm
  );

  // Build lookup from previous scores (1-indexed)
  const previousMap = new Map<string, { rank: number; ws: WeekendScore }>();
  previousScores.forEach((ws, i) => {
    previousMap.set(ws.dateRange.id, { rank: i + 1, ws });
  });

  // Count airbnbs per weekend in previous data
  const prevAirbnbCounts = new Map<string, number>();
  for (const a of previousData.airbnbListings ?? []) {
    if (a.budget_tier === budgetTier) {
      prevAirbnbCounts.set(a.date_range_id, (prevAirbnbCounts.get(a.date_range_id) ?? 0) + 1);
    }
  }

  const result: RankChangeMap = {};
  currentScores.forEach((ws, i) => {
    const currentRank = i + 1;
    const prev = previousMap.get(ws.dateRange.id);

    // Build per-city cost changes
    const cityChanges: CityPriceChange[] = ws.perCityCosts.map((currentCity) => {
      const prevCity = prev?.ws.perCityCosts.find((c) => c.city === currentCity.city);
      const prevAvg = prev?.ws.cityAverages[currentCity.city];
      const curAvg = ws.cityAverages[currentCity.city];
      return {
        city: currentCity.city,
        previousFlightCost: prevCity?.flightCost ?? null,
        currentFlightCost: currentCity.flightCost,
        previousStayCost: prevCity?.stayCost ?? null,
        currentStayCost: currentCity.stayCost,
        previousPerPerson: prevCity?.perPersonTotal ?? null,
        currentPerPerson: currentCity.perPersonTotal,
        previousCityAvg: prevAvg?.mean ?? null,
        currentCityAvg: curAvg?.mean ?? null,
      };
    });

    const currentAirbnbCount = ws.airbnbListings.filter((l) => l.budget_tier === budgetTier).length;
    const previousAirbnbCount = prev ? (prevAirbnbCounts.get(ws.dateRange.id) ?? 0) : null;

    // Airbnb selection change
    let airbnbChange: AirbnbChange | null = null;
    if (prev) {
      const prevUrl = prev.ws.selectedAirbnbUrl;
      const curUrl = ws.selectedAirbnbUrl;
      const prevListing = prevUrl
        ? prev.ws.airbnbListings.find((l) => l.airbnb_url === prevUrl)
        : null;
      const curListing = curUrl
        ? ws.airbnbListings.find((l) => l.airbnb_url === curUrl)
        : null;

      const selectionChanged = prevUrl !== curUrl;
      const costChanged = prevListing?.price_per_night !== curListing?.price_per_night;

      if (selectionChanged || costChanged) {
        airbnbChange = {
          previousUrl: prevUrl,
          currentUrl: curUrl,
          previousName: prevListing?.listing_name ?? null,
          currentName: curListing?.listing_name ?? null,
          previousCostPerNight: prevListing?.price_per_night ?? null,
          currentCostPerNight: curListing?.price_per_night ?? null,
          selectionChanged,
        };
      }
    }

    // Fairness: compute cost variance
    const computeVariance = (costs: (number | null)[]) => {
      const valid = costs.filter((c): c is number => c !== null);
      if (valid.length <= 1) return null;
      const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
      return valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length;
    };
    const currentCostVariance = computeVariance(ws.perCityCosts.map((c) => c.perPersonTotal));
    const previousCostVariance = prev
      ? computeVariance(prev.ws.perCityCosts.map((c) => c.perPersonTotal))
      : null;

    // Best value: airbnb rating of selected listing
    const curSelectedListing = ws.selectedAirbnbUrl
      ? ws.airbnbListings.find((l) => l.airbnb_url === ws.selectedAirbnbUrl)
      : null;
    const prevSelectedListing = prev?.ws.selectedAirbnbUrl
      ? prev.ws.airbnbListings.find((l) => l.airbnb_url === prev.ws.selectedAirbnbUrl)
      : null;

    const info: RankChangeInfo = {
      rankDelta: prev ? prev.rank - currentRank : null,
      previousRank: prev?.rank ?? null,
      currentRank,
      previousScore: prev?.ws.score ?? null,
      currentScore: ws.score,
      previousCost: prev?.ws.totalGroupCost ?? null,
      currentCost: ws.totalGroupCost,
      scoringAlgorithm,
      cityChanges,
      previousAirbnbCount,
      currentAirbnbCount,
      airbnbChange,
      previousCostVariance,
      currentCostVariance,
      previousAirbnbRating: prevSelectedListing?.rating ?? null,
      currentAirbnbRating: curSelectedListing?.rating ?? null,
      previousAirbnbReviews: prevSelectedListing?.review_count ?? null,
      currentAirbnbReviews: curSelectedListing?.review_count ?? null,
    };

    result[ws.dateRange.id] = info;
  });

  return result;
}
