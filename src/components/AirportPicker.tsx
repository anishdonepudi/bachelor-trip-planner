"use client";

interface AirportPickerProps {
  airports: { primary: string[]; nearby: string[] };
  selected: string;
  onSelect: (iata: string) => void;
  showValidation?: boolean;
}

export function AirportPicker({ airports, selected, onSelect, showValidation }: AirportPickerProps) {
  const hasPrimary = airports.primary.length > 0;
  const hasNearby = airports.nearby.length > 0;

  if (!hasPrimary && !hasNearby) {
    return <p className="mt-1.5 text-xs text-[var(--text-3)]">No airports found nearby</p>;
  }

  const chipClass = (iata: string) =>
    iata === selected
      ? "px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[var(--blue)] text-white cursor-pointer transition-colors duration-150"
      : "px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-default)] cursor-pointer hover:border-[var(--border-active)] transition-colors duration-150";

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1.5">
        {airports.primary.map((iata) => (
          <button key={iata} type="button" onClick={() => onSelect(iata)} className={chipClass(iata)}>
            {iata}
          </button>
        ))}
      </div>
      {hasNearby && (
        <>
          <span className="block text-[9px] text-[var(--text-3)] uppercase tracking-wider mt-2 mb-1">Nearby</span>
          <div className="flex flex-wrap gap-1.5">
            {airports.nearby.map((iata) => (
              <button key={iata} type="button" onClick={() => onSelect(iata)} className={chipClass(iata)}>
                {iata}
              </button>
            ))}
          </div>
        </>
      )}
      {showValidation && !selected && (
        <p className="mt-1 text-xs text-[var(--gold)]">Select a destination airport</p>
      )}
    </div>
  );
}
