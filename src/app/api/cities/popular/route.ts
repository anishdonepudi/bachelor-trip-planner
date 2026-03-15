import { NextResponse } from "next/server";
import popularCities from "@/data/popular-cities.json";

export async function GET() {
  return NextResponse.json(popularCities, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
