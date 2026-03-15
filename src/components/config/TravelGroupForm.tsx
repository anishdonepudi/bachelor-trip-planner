"use client";

import { CityConfig } from "@/lib/types";
import { CitySelect } from "../CitySelect";

interface TravelGroupFormProps {
  cities: CityConfig[];
  onCitiesChange: (cities: CityConfig[]) => void;
  onEdited?: () => void;
}

export function TravelGroupForm({ cities, onCitiesChange, onEdited }: TravelGroupFormProps) {
  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  const addCity = () => {
    onEdited?.();
    onCitiesChange([...cities, { city: "", people: 1, primaryAirports: [], nearbyAirports: [] }]);
  };

  const removeCity = (index: number) => {
    onEdited?.();
    onCitiesChange(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index: number, field: string, value: string | number, airports?: { primary: string[]; nearby: string[] }) => {
    onEdited?.();
    const updated = [...cities];
    if (field === "city") {
      const cityName = value as string;
      updated[index] = {
        ...updated[index],
        city: cityName,
        primaryAirports: airports?.primary ?? [],
        nearbyAirports: airports?.nearby ?? [],
      };
    } else if (field === "people") {
      updated[index] = { ...updated[index], people: value as number };
    }
    onCitiesChange(updated);
  };

  return (
    <div className="space-y-2">
      {cities.map((city, i) => (
        <div key={i} className="group relative p-3 rounded-md bg-[var(--surface-1)] border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors duration-150">
          <div className="flex items-start gap-2.5">
            <span className="text-[11px] font-mono font-semibold text-[var(--text-3)] w-4 text-right mt-2.5 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <CitySelect
                value={city.city}
                onChange={(name, airports) => updateCity(i, "city", name, airports)}
                excludeCities={selectedCityNames.filter((c) => c !== city.city)}
                currentAirports={city.city ? { primary: city.primaryAirports, nearby: city.nearbyAirports } : undefined}
              />
            </div>
            <div className="flex items-center shrink-0">
              <button onClick={() => updateCity(i, "people", Math.max(1, city.people - 1))}
                className="w-8 h-8 rounded-l-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <div className="w-10 h-8 bg-[var(--surface-2)] border-y border-[var(--border-default)] flex items-center justify-center">
                <span className="text-sm font-semibold font-mono tabular-nums text-[var(--text-1)]">{city.people}</span>
              </div>
              <button onClick={() => updateCity(i, "people", city.people + 1)}
                className="w-8 h-8 rounded-r-md bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors duration-150">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <button onClick={() => removeCity(i)}
              className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors duration-150 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <button onClick={addCity}
        className="w-full py-3 rounded-md border border-dashed border-[var(--border-default)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-1)] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-1.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add City
      </button>
    </div>
  );
}
