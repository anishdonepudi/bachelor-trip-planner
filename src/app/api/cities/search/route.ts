import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const username = process.env.GEONAMES_USERNAME;
  if (!username) {
    return NextResponse.json(
      { error: "GEONAMES_USERNAME not configured" },
      { status: 500 }
    );
  }

  const url = new URL("https://secure.geonames.org/searchJSON");
  url.searchParams.set("name_startsWith", q);
  url.searchParams.set("featureClass", "P");
  url.searchParams.set("orderby", "population");
  url.searchParams.set("maxRows", "10");
  url.searchParams.set("username", username);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "GeoNames API error" },
      { status: 502 }
    );
  }

  const data = await res.json();

  if (data.status) {
    // GeoNames returns { status: { message, value } } on error
    return NextResponse.json(
      { error: data.status.message ?? "GeoNames error" },
      { status: 502 }
    );
  }

  const results = (data.geonames ?? []).map(
    (g: {
      name: string;
      adminName1: string;
      countryName: string;
      countryCode: string;
      lat: string;
      lng: string;
      population: number;
    }) => ({
      name: g.name,
      state: g.adminName1 || undefined,
      country: g.countryName,
      countryCode: g.countryCode,
      lat: parseFloat(g.lat),
      lng: parseFloat(g.lng),
      population: g.population,
    })
  );

  return NextResponse.json(results);
}
