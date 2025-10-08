import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const provincia = sp.get("provincia");
  const municipio = sp.get("municipio");
  const direccion = sp.get("direccion");
  if (!provincia || !direccion) {
    return NextResponse.json({ error: "provincia y direccion requeridas" }, { status: 400 });
  }

  const url =
    `https://apis.datos.gob.ar/georef/api/direcciones?` +
    `provincia=${encodeURIComponent(provincia)}` +
    (municipio ? `&municipio=${encodeURIComponent(municipio)}` : "") +
    `&direccion=${encodeURIComponent(direccion)}&max=1`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: `Georef: ${r.status}` }, { status: r.status });

  const data = await r.json();
  return NextResponse.json(data);
}
