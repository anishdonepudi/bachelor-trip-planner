"use client";

interface ScoreBadgeProps {
  score: number;
  rank: number;
}

export function ScoreBadge({ score, rank }: ScoreBadgeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (score >= 60) return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    if (score >= 40) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    if (score >= 20) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono text-zinc-500">#{rank}</span>
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${getColor(score)}`}
      >
        <span>{score}</span>
        <span className="text-[10px] opacity-70">/100</span>
      </div>
    </div>
  );
}
