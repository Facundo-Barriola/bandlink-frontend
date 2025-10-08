import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&orden=nombre&max=100&formato=json";
  const r = await fetch(url, { cache: "no-store" }); // o { next: { revalidate: 86400 } }
  if (!r.ok) return NextResponse.json({ error: `Georef: ${r.status}` }, { status: r.status });
  const data = await r.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
  });
}
