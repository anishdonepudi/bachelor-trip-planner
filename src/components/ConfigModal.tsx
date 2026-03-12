"use client";

import { useState } from "react";
import { CityConfig } from "@/lib/types";
import { CITY_AIRPORTS } from "@/lib/airports";
import { CitySelect } from "./CitySelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfigModalProps {
  cities: CityConfig[];
  onSave: (cities: CityConfig[]) => void;
}

export function ConfigModal({ cities: initialCities, onSave }: ConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CityConfig[]>(initialCities);
  const [saving, setSaving] = useState(false);

  // Reset local state when dialog opens or initialCities changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setCities(initialCities);
    setOpen(isOpen);
  };

  const totalPeople = cities.reduce((sum, c) => sum + c.people, 0);
  const hasChanges = JSON.stringify(cities) !== JSON.stringify(initialCities);

  const addCity = () => {
    setCities([
      ...cities,
      { city: "", people: 1, primaryAirports: [], nearbyAirports: [] },
    ]);
  };

  const removeCity = (index: number) => {
    setCities(cities.filter((_, i) => i !== index));
  };

  const updateCity = (index: number, field: string, value: string | number) => {
    const updated = [...cities];
    if (field === "city") {
      const cityName = value as string;
      updated[index] = {
        ...updated[index],
        city: cityName,
        primaryAirports: CITY_AIRPORTS[cityName]?.primary ?? [],
        nearbyAirports: CITY_AIRPORTS[cityName]?.nearby ?? [],
      };
    } else if (field === "people") {
      updated[index] = { ...updated[index], people: value as number };
    }
    setCities(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const total = cities.reduce((sum, c) => sum + c.people, 0);
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cities,
          destination_airport: "CUN",
          total_people: total,
        }),
      });
      if (res.ok) {
        onSave(cities);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  // Cities already selected (for excluding from dropdown)
  const selectedCityNames = cities.map((c) => c.city).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-all text-sm font-medium" />
        }
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Config
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Group Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="text-sm text-zinc-400">
            Total: {totalPeople} people from {cities.length} cities
          </div>

          {cities.map((city, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <CitySelect
                  value={city.city}
                  onChange={(name) => updateCity(i, "city", name)}
                  excludeCities={selectedCityNames.filter((c) => c !== city.city)}
                />
                <input
                  type="number"
                  value={city.people}
                  onChange={(e) =>
                    updateCity(i, "people", parseInt(e.target.value) || 1)
                  }
                  min={1}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:border-zinc-500"
                />
                <span className="text-xs text-zinc-500 w-6">ppl</span>
                <button
                  onClick={() => removeCity(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addCity}
            className="w-full py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
          >
            + Add City
          </button>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex-1 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {saving ? "Saving..." : "Save & Refresh Data"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
