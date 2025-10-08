"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/app/context/userContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Users, Music2, CalendarDays, Wifi, LocateFixed } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// --------- Tipos ----------
export type POIType = "musician" | "studio" | "event";
type Coord = { lat: number; lon: number };
export type POI = { id: string | number; type: POIType; name: string; location: Coord };
type LiveUser = { idUser: number; displayName?: string; lat: number; lon: number; updatedAt: number };

// --------- Utils ----------
function haversineKm(a: Coord, b: Coord) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const c1 = Math.cos(a.lat * Math.PI / 180);
  const c2 = Math.cos(b.lat * Math.PI / 180);
  const v = s1 * s1 + c1 * c2 * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(v));
}

function toGeoJSON(features: POI[]) {
  return {
    type: "FeatureCollection",
    features: features.map((p) => ({
      type: "Feature",
      properties: { id: p.id, name: p.name, poiType: p.type },
      geometry: { type: "Point", coordinates: [p.location.lon, p.location.lat] },
    })),
  } as GeoJSON.FeatureCollection;
}

function circlePolygon(lon: number, lat: number, radiusMeters: number, steps = 64) {
  const coords: [number, number][] = [];
  const d = radiusMeters / 1000 / 6371; // rad
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const brng = (i * 2 * Math.PI) / steps;
    const lat2 = Math.asin(Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(brng));
    const lon2 =
      lonR +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(lat2)
      );
    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  } as GeoJSON.Feature;
}

// ---------- Chips / Switch (UI helpers) ----------
function Chip({
  active, onClick, children, className = "",
}: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 inline-flex items-center gap-2 rounded-full border text-sm transition
        ${active ? "bg-[#65558F] text-white border-[#65558F]" : "bg-white/80 hover:bg-white border-gray-200 text-gray-700"} ${className}`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Switch({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? "bg-[#65558F]" : "bg-gray-300"}`}>
        <span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition ${checked ? "translate-x-4" : ""}`} />
      </span>
      <input className="sr-only" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

// ========= Componente =========
export default function Map({
  allPois,
  initialRadiusKm = 5,
}: {
  allPois: POI[];
  initialRadiusKm?: number;
}) {
  const { user, ready } = useUser();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialized = useRef(false);

  // Estado UI
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [showMusicians, setShowMusicians] = useState(true);
  const [showStudios, setShowStudios] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [shareLive, setShareLive] = useState(false);

  // Estado data
  const [userPos, setUserPos] = useState<(Coord & { accuracy?: number }) | null>(null);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);

  const API = useMemo(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", []);

  // ----- Geolocalización: mejor muestra (~5s) -----
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserPos({ lat: -34.6037, lon: -58.3816, accuracy: 500 });
      return;
    }
    let watchId: number | null = null;
    let best: GeolocationPosition | null = null;
    const start = Date.now();

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!best || accuracy < best.coords.accuracy) best = pos;
        const ageMs = Date.now() - start;
        const chosen = ageMs < 5000 && best ? best : pos; // 5s para estabilizar
        setUserPos({
          lat: chosen.coords.latitude,
          lon: chosen.coords.longitude,
          accuracy: chosen.coords.accuracy,
        });
      },
      () => {
        setUserPos({ lat: -34.6037, lon: -58.3816, accuracy: 1500 }); // CABA fallback
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
  }, []);

  // ----- Inicializar mapa (una sola vez) -----
  useEffect(() => {
    if (initialized.current) return;
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-58.3816, -34.6037],
      zoom: 12,
    });
    mapRef.current = map;
    initialized.current = true;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // source/layer: yo (me)
      map.addSource("me", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-58.3816, -34.6037] },
          properties: {},
        },
      });
      map.addLayer({
        id: "me-point",
        type: "circle",
        source: "me",
        paint: {
          "circle-radius": 8,
          "circle-color": "#1d4ed8",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // source/layers: radio de búsqueda
      map.addSource("search-area", {
        type: "geojson",
        data: circlePolygon(-58.3816, -34.6037, initialRadiusKm * 1000),
      });
      map.addLayer({
        id: "search-fill",
        type: "fill",
        source: "search-area",
        paint: { "fill-color": "#1d4ed8", "fill-opacity": 0.1 },
      });
      map.addLayer({
        id: "search-outline",
        type: "line",
        source: "search-area",
        paint: { "line-color": "#1d4ed8", "line-width": 2 },
      });

      // source/layer: nearby (POIs)
      map.addSource("nearby", { type: "geojson", data: toGeoJSON([]) });
      map.addLayer({
        id: "nearby-points",
        type: "circle",
        source: "nearby",
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "poiType"],
            "musician", "#ef4444",
            "studio", "#10b981",
            "event", "#f59e0b",
            "#6b7280",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });

      map.on("click", "nearby-points", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const [lon, lat] = (f.geometry as any).coordinates as [number, number];
        const name = f.properties?.name ?? "Sin nombre";
        const type = f.properties?.poiType ?? "poi";
        new mapboxgl.Popup().setLngLat([lon, lat]).setHTML(`<b>${name}</b><br/>${type}`).addTo(map);
      });
      map.on("mouseenter", "nearby-points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "nearby-points", () => (map.getCanvas().style.cursor = ""));
    });

    return () => { try { map.remove(); } catch { } mapRef.current = null; initialized.current = false; };
  }, [initialRadiusKm]);

  // ----- POIs filtrados por radio/checkboxes -----
  const filteredNearby = useMemo(() => {
    if (!userPos) return [];
    const byType = (t: POIType) =>
      (t === "musician" && showMusicians) ||
      (t === "studio" && showStudios) ||
      (t === "event" && showEvents);
    return allPois.filter((p) => byType(p.type) && haversineKm(userPos, p.location) <= radiusKm);
  }, [allPois, userPos, radiusKm, showMusicians, showStudios, showEvents]);

  const sortedNearby = useMemo(() => {
    const list = filteredNearby.map((p) => ({
      ...p,
      distanceKm: userPos ? haversineKm(userPos, p.location) : null,
    }));
    list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return list as (POI & { distanceKm: number | null })[];
  }, [filteredNearby, userPos]);

  // ----- Actualizar fuentes (me, search-area, nearby) -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !userPos) return;

    // mover "me"
    const meSrc = map.getSource("me") as mapboxgl.GeoJSONSource | undefined;
    if (meSrc) {
      meSrc.setData({
        type: "Feature",
        geometry: { type: "Point", coordinates: [userPos.lon, userPos.lat] },
        properties: {},
      });
    }

    // actualizar radio
    const area = map.getSource("search-area") as mapboxgl.GeoJSONSource | undefined;
    if (area) area.setData(circlePolygon(userPos.lon, userPos.lat, radiusKm * 1000));

    // actualizar nearby
    const src = map.getSource("nearby") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(toGeoJSON(filteredNearby));
  }, [userPos, radiusKm, filteredNearby]);

  // ----- Recentrar si me moví > 200m -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;
    const c = map.getCenter();
    const distKm = haversineKm({ lat: c.lat, lon: c.lng }, userPos);
    if (distKm > 0.2) {
      map.easeTo({ center: [userPos.lon, userPos.lat], duration: 600 });
    }
  }, [userPos]);

  // ----- Live users: cargar/actualizar layer -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const srcId = "live-users";
    const layerId = "live-users-points";

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: liveUsers.map(u => ({
        type: "Feature",
        properties: { idUser: u.idUser, name: u.displayName ?? `User ${u.idUser}` },
        geometry: { type: "Point", coordinates: [u.lon, u.lat] },
      })),
    };

    const src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined;
    if (!src) {
      map.addSource(srcId, {
        type: "geojson",
        data,
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      });
      map.addLayer({
        id: "live-users-clusters",
        type: "circle",
        source: "live-users",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 16,
          "circle-color": "#9333ea",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      map.addLayer({
        id: "live-users-cluster-count",
        type: "symbol",
        source: "live-users",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
      });
      map.addLayer({
        id: layerId,
        type: "circle",
        source: srcId,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": "#9333ea",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });
      map.on("click", layerId, (e) => {
        const f = e.features?.[0]; if (!f) return;
        const [lon, lat] = (f.geometry as any).coordinates as [number, number];
        const name = f.properties?.name ?? "Usuario";
        new mapboxgl.Popup().setLngLat([lon, lat]).setHTML(`<b>${name}</b><br/>en línea`).addTo(map);
      });

      map.on("click", "live-users-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["live-users-clusters"] });
        const clusterId = features[0].properties?.cluster_id;
        (map.getSource("live-users") as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const center = (features[0].geometry as any).coordinates;
          map.easeTo({ center, zoom });
        });
      });

      map.on("mouseenter", layerId, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layerId, () => (map.getCanvas().style.cursor = ""));
    } else {
      src.setData(data);
    }
  }, [liveUsers]);

  // ----- Color de mi punto según sharing -----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (map.getLayer("me-point")) {
      map.setPaintProperty("me-point", "circle-color", shareLive ? "#9333ea" : "#1d4ed8");
    }
  }, [shareLive]);

  // ----- Push de presencia -----
  useEffect(() => {
    if (!shareLive || !userPos || !ready) return;
    const idUser = user?.idUser ?? 0;
    if (!idUser) return;
    if ((userPos.accuracy ?? 9999) > 1000) return;

    let cancelled = false;
    let timer: any;

    const push = async () => {
      try {
        await fetch(`${API}/presence`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idUser,
            lat: userPos.lat,
            lon: userPos.lon,
            displayName: user?.email?.split("@")[0] ?? `User ${idUser}`,
          }),
        });
      } catch { }
    };

    const loop = async () => {
      if (cancelled) return;
      await push();
      timer = setTimeout(loop, 10_000);
    };

    loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [shareLive, userPos, user?.idUser, ready, API, user?.email]);

  // ----- Pull de presencia cerca cada 6s -----
  useEffect(() => {
    if (!userPos) return;
    let cancelled = false;
    let timer: any;

    const pull = async () => {
      try {
        const url = new URL(`${API}/presence/near`);
        url.searchParams.set("lat", String(userPos.lat));
        url.searchParams.set("lon", String(userPos.lon));
        url.searchParams.set("radiusKm", String(radiusKm));
        const res = await fetch(url, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;

        const meId = user?.idUser;
        const list: LiveUser[] = Array.isArray(json.data) ? json.data : [];
        const filtered = !meId ? list : list.filter(u => (shareLive ? true : u.idUser !== meId));
        if (!cancelled) setLiveUsers(filtered);
      } catch { }
    };

    const loop = async () => {
      if (cancelled) return;
      await pull();
      timer = setTimeout(loop, 6_000);
    };

    loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userPos, radiusKm, shareLive, user?.idUser, API]);

  // ----- Helpers UI -----
  const focusPoi = (p: POI) => {
    const map = mapRef.current; if (!map) return;
    map.easeTo({ center: [p.location.lon, p.location.lat], zoom: 14, duration: 600 });
  };

  // ========= UI =========
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#65558F]">Descubrir cerca</h1>
          <p className="text-sm text-muted-foreground">
            Filtrá músicos, salas y eventos por radio de búsqueda. Compartí tu ubicación para aparecer en vivo.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Encontrados</span>
          <span className="px-2 py-1 rounded-full bg-violet-100 text-[#65558F] font-medium">{filteredNearby.length}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,360px] gap-4">
        {/* MAPA + Overlay de controles */}
        <div className="relative rounded-2xl border bg-background shadow-sm overflow-hidden">
          {/* Overlay de controles */}
          <div className="absolute z-10 top-3 left-3 right-3 md:right-auto">
            <div className="backdrop-blur bg-white/80 border rounded-xl shadow-sm p-2 md:p-3 flex flex-wrap items-center gap-2">
              <Chip active={showMusicians} onClick={() => setShowMusicians(v => !v)}>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <Users className="w-4 h-4" /><span>Músicos</span>
              </Chip>
              <Chip active={showStudios} onClick={() => setShowStudios(v => !v)}>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <Music2 className="w-4 h-4" /><span>Salas</span>
              </Chip>
              <Chip active={showEvents} onClick={() => setShowEvents(v => !v)}>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <CalendarDays className="w-4 h-4" /><span>Eventos</span>
              </Chip>

              <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

              <Switch
                checked={shareLive}
                onChange={setShareLive}
                label={<span className="inline-flex items-center gap-1"><Wifi className="w-4 h-4" /> Compartir en vivo</span>}
              />

              <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

              <div className="flex items-center gap-2 ml-auto md:ml-0 w-full md:w-auto">
                <span className="text-sm text-gray-700">Radio</span>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-40 accent-[#65558F]"
                />
                <span className="text-sm font-medium text-[#65558F]">{radiusKm} km</span>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "560px" }}
          />

          {/* Footer overlay: mi ubicación + precisión */}
          <div className="absolute bottom-3 left-3 right-3 md:right-auto z-10">
            <div className="backdrop-blur bg-white/80 border rounded-xl shadow-sm px-3 py-2 text-xs text-gray-700 flex items-center gap-2">
              <LocateFixed className="w-4 h-4 text-[#65558F]" />
              <span>Mi ubicación: </span>
              <span className="font-medium">{userPos ? `${userPos.lat.toFixed(4)}, ${userPos.lon.toFixed(4)}` : "—"}</span>
              <span className="text-gray-500">· Precisión: {userPos?.accuracy ? `${Math.round(userPos.accuracy)} m` : "—"}</span>
              <span className="ml-auto hidden md:inline">POIs en radio: <b>{filteredNearby.length}</b></span>
            </div>
          </div>
        </div>

        {/* Panel lateral de resultados */}
        <aside className="rounded-2xl border bg-background shadow-sm p-3 md:p-4 max-h-[560px] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-[#65558F]">Resultados</div>
            <div className="text-xs text-muted-foreground">Ordenados por cercanía</div>
          </div>
          {sortedNearby.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/30">
              No hay resultados dentro de {radiusKm} km.
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedNearby.map((p) => (
                <li key={`${p.type}-${p.id}`}
                    className="p-3 rounded-xl border hover:shadow-sm transition cursor-pointer group"
                    onClick={() => focusPoi(p)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${p.type === "musician" ? "bg-red-500" : p.type === "studio" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <div className="font-medium">{p.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km` : "—"}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border
                      ${p.type === "musician" ? "bg-red-50 text-red-700 border-red-200" :
                         p.type === "studio" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                         "bg-amber-50 text-amber-700 border-amber-200"}`}
                    >
                      {p.type === "musician" ? "Músico/a" : p.type === "studio" ? "Sala" : "Evento"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
