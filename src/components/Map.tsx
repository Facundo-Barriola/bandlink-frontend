"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";


export type POIType = "musician" | "studio" | "event";
type Coord = { lat: number; lon: number };
export type POI = { id: string | number; type: POIType; name: string; location: Coord };

// --- util distancia
function haversineKm(a: Coord, b: Coord) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const c1 = Math.cos(a.lat * Math.PI / 180);
  const c2 = Math.cos(b.lat * Math.PI / 180);
  const aVal = s1 * s1 + c1 * c2 * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aVal));
}

// --- convertir POIs a GeoJSON
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

// --- círculo (polígono) en torno a lon/lat
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



export default function Map({
    allPois,
    initialRadiusKm = 5,
}: {
    allPois: POI[];
    initialRadiusKm?: number;
}) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
      const [userPos, setUserPos] = useState<Coord | null>(null);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [showMusicians, setShowMusicians] = useState(true);
  const [showStudios, setShowStudios] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserPos({ lat: -34.6037, lon: -58.3816 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setUserPos({ lat: -34.6037, lon: -58.3816 }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }, []);

    const filteredNearby = useMemo(() => {
    if (!userPos) return [];
    const byType = (t: POIType) =>
      (t === "musician" && showMusicians) ||
      (t === "studio" && showStudios) ||
      (t === "event" && showEvents);
    return allPois.filter((p) => byType(p.type) && haversineKm(userPos, p.location) <= radiusKm);
  }, [allPois, userPos, radiusKm, showMusicians, showStudios, showEvents]);

    useEffect(() => {
    if (!mapContainerRef.current || !userPos) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [userPos.lon, userPos.lat],
      zoom: 12,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Marker “Estás acá”
      map.addSource("me", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [userPos.lon, userPos.lat] },
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

      // Círculo de búsqueda (CU51)
      map.addSource("search-area", {
        type: "geojson",
        data: circlePolygon(userPos.lon, userPos.lat, radiusKm * 1000),
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

      // POIs cercanos (CU48/49)
      map.addSource("nearby", { type: "geojson", data: toGeoJSON(filteredNearby) });
      map.addLayer({
        id: "nearby-points",
        type: "circle",
        source: "nearby",
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "poiType"],
            "musician",
            "#ef4444",
            "studio",
            "#10b981",
            "event",
            "#f59e0b",
            "#6b7280",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#fff",
        },
      });

      // Popup
      map.on("click", "nearby-points", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const [lon, lat] = (f.geometry as any).coordinates as [number, number];
        const name = f.properties?.name ?? "Sin nombre";
        const type = f.properties?.poiType ?? "poi";
        new mapboxgl.Popup().setLngLat([lon, lat]).setHTML(`<b>${name}</b><br/>${type}`).addTo(map);
      });

      map.on("mouseenter", "nearby-points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "nearby-points", () => (map.getCanvas().style.cursor = ""));
    });

    return () => map.remove();
  }, [userPos]);


    useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // círculo
    const area = map.getSource("search-area") as mapboxgl.GeoJSONSource | undefined;
    if (area && userPos) area.setData(circlePolygon(userPos.lon, userPos.lat, radiusKm * 1000));

    // puntos
    const src = map.getSource("nearby") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(toGeoJSON(filteredNearby));
  }, [filteredNearby, radiusKm, userPos]);

    return(
    <div className="flex flex-col gap-3">
      {/* Controles (CU50/CU51) */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showMusicians} onChange={(e) => setShowMusicians(e.target.checked)} />
          Músicos
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showStudios} onChange={(e) => setShowStudios(e.target.checked)} />
          Salas
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} />
          Eventos
        </label>

        <div className="flex items-center gap-2 ml-4">
          <span>Radio:</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
          />
          <b>{radiusKm} km</b>
        </div>

        <div className="ml-auto">
          Encontrados: <b>{filteredNearby.length}</b>
        </div>
      </div>

      {/* Mapa */}
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "500px", borderRadius: "8px", overflow: "hidden" }}
      />
    </div>
  );
}


