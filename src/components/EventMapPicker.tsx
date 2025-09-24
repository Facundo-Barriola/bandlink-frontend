"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Asegurá tu token en .env.local => NEXT_PUBLIC_MAPBOX_TOKEN
if (!mapboxgl.accessToken) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}

export type EventMapPickerProps = {
  initialLat?: number | null;
  initialLon?: number | null;
  height?: number; // px
  onPick?: (lat: number, lon: number) => void;
  enableGeolocation?: boolean;
  showMyLocationButton?: boolean;
};

/**
 * Componente inline y simple para seleccionar coordenadas con Mapbox.
 * No hace fetch ni abre diálogos: sólo emite onPick(lat, lon) al clickear.
 */
export default function EventMapPicker({
  initialLat,
  initialLon,
  height = 420,
  onPick,
  enableGeolocation = true,
  showMyLocationButton = true,
}: EventMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [ready, setReady] = useState(false);

  const fallbackCenter = { lon: -58.3816, lat: -34.6037 }; // CABA

  useEffect(() => {
    if (!containerRef.current) return;

    const center = [initialLon ?? fallbackCenter.lon, initialLat ?? fallbackCenter.lat] as [number, number];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      setReady(true);
      // Si vienen coords iniciales, colocar marker
      if (initialLat != null && initialLon != null) {
        placeMarker(initialLon, initialLat);
      }
    });

    const onClick = (ev: mapboxgl.MapMouseEvent) => {
      const lon = ev.lngLat.lng;
      const lat = ev.lngLat.lat;
      placeMarker(lon, lat);
      onPick?.(lat, lon);
    };
    map.on("click", onClick);

    const onError = (e: any) => {
      // para debug: ver consola si hay error de token
      // eslint-disable-next-line no-console
      console.error("Mapbox error:", e?.error || e);
    };
    map.on("error", onError);

    return () => {
      try { map.off("click", onClick); } catch {}
      try { map.off("error", onError); } catch {}
      try { map.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function placeMarker(lon: number, lat: number) {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const ll = markerRef.current!.getLngLat();
        onPick?.(ll.lat, ll.lng);
      });
    } else {
      markerRef.current.setLngLat([lon, lat]);
    }
  }

  function useMyLocation() {
    if (!enableGeolocation || !navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        mapRef.current!.flyTo({ center: [lon, lat], zoom: 14 });
        placeMarker(lon, lat);
        onPick?.(lat, lon);
      },
      () => {
        // si falla, no hacemos nada
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
  }

  return (
    <div className="relative">
      {showMyLocationButton && (
        <button
          type="button"
          onClick={useMyLocation}
          className="absolute z-10 left-3 top-3 rounded-md bg-white/90 px-3 py-1 text-xs shadow hover:bg-white"
          disabled={!ready}
          title="Usar mi ubicación"
        >
          Mi ubicación
        </button>
      )}
      <div ref={containerRef} style={{ width: "100%", height, borderRadius: 12, overflow: "hidden" }} />
    </div>
  );
}
