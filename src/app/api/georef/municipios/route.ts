import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const provincia = sp.get("provincia");
  if (!provincia) return NextResponse.json({ error: "provincia requerida" }, { status: 400 });

  const url = `https://apis.datos.gob.ar/georef/api/municipios?provincia=${encodeURIComponent(
    provincia
  )}&campos=id,nombre&orden=nombre&max=5000&aplanar&formato=json`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: `Georef: ${r.status}` }, { status: r.status });

  const data = await r.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
  });
}
