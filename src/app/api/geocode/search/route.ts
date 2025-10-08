import { NextResponse } from "next/server";

const MAPBOX = "https://api.mapbox.com/geocoding/v5/mapbox.places";

function pick(ctx: any[] | undefined, prefix: string) {
  return ctx?.find((c) => typeof c.id === "string" && c.id.startsWith(prefix));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const proximity = searchParams.get("proximity"); // "lon,lat" opcional
  if (!q) return NextResponse.json({ features: [] });

  const params = new URLSearchParams({
    access_token: process.env.MAPBOX_TOKEN ?? "",
    language: "es",
    country: "ar",
    limit: "5",
    types: "address,place,locality,district",
    ...(proximity ? { proximity } : {}),
  });

  const url = `${MAPBOX}/${encodeURIComponent(q)}.json?${params.toString()}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ features: [] }, { status: 200 });

  const json = await r.json();

  const features = (json.features ?? []).map((f: any) => {
    const ctx = f.context ?? [];
    const region = pick(ctx, "region");
    const place = pick(ctx, "place") || pick(ctx, "locality") || pick(ctx, "district");

    return {
      id: f.id,
      addressLine: f.place_name_es || f.place_name || f.text_es || f.text,
      provinceName: region?.text_es || region?.text || null,
      municipioName: place?.text_es || place?.text || null,
      lat: f.center?.[1],
      lon: f.center?.[0],
    };
  });

  return NextResponse.json({ features });
}
