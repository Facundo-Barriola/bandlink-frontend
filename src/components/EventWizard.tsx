"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarPlus, Users, Shield } from "lucide-react";

function MapboxSearchBox(props: {
  accessToken: string;
  placeholder?: string;
  country?: string;
  language?: string;
  limit?: number;
  types?: string;
  className?: string;
  onRetrieve?: (ev: any) => void;
}) {
  const { accessToken, placeholder, country = "AR", language = "es", limit = 5, types = "address,poi", className, onRetrieve } = props;
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let el: any;
    let mounted = true;

    (async () => {
      // Registra el web component en el navegador
      await import("@mapbox/search-js-web");
      if (!mounted || !hostRef.current) return;

      // Crear el custom element y setear props/attrs
      el = document.createElement("mapbox-search-box");
      el.setAttribute("access-token", accessToken);
      el.setAttribute("country", country);
      el.setAttribute("language", language);
      el.setAttribute("limit", String(limit));
      el.setAttribute("types", types);
      if (placeholder) el.setAttribute("placeholder", placeholder);

      // Listener para cuando el usuario selecciona un resultado
      const handleRetrieve = (ev: any) => onRetrieve?.(ev);
      el.addEventListener("retrieve", handleRetrieve);

      // Limpiar contenedor y montar
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(el);

      // Cleanup
      return () => {
        el?.removeEventListener("retrieve", handleRetrieve);
      };
    })();

    return () => {
      mounted = false;
      // desmontar
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [accessToken, country, language, limit, types, placeholder, onRetrieve]);

  return <div ref={hostRef} className={className} />;
}

function getCityAndProvince(f: any): { city: string | null; province: string | null; neighborhood: string | null } {
  const props = f?.properties ?? {};
  const ctxObj = props?.context ?? {};                    // <- objeto: { region: {name}, place: {name}, ... }
  const ctxArr = Array.isArray(f?.context) ? f.context :  // <- array clásico: [{id:'region.x', text:'...' }, ...]
                 (Array.isArray(props?.context) ? props.context : []);

  const nameOf = (x: any) => (x?.name ?? x?.text ?? null);
  const findInArr = (prefix: string) => {
    const it = ctxArr.find((c: any) => String(c?.id || "").startsWith(prefix));
    return nameOf(it);
  };
  const first = (...vals: any[]) => vals.find(v => typeof v === "string" && v.trim()) ?? null;

  const city = first(
    props.place, props.locality, props.city,
    nameOf((ctxObj as any).place), nameOf((ctxObj as any).locality), nameOf((ctxObj as any).district),
    findInArr("place."), findInArr("locality."), findInArr("district.")
  );

  const province = first(
    props.region, props.state,
    nameOf((ctxObj as any).region),
    findInArr("region.")
  );

  const neighborhood = first(
    props.neighborhood,
    nameOf((ctxObj as any).neighborhood),
    findInArr("neighborhood.")
  );
  console.log("Parsed location:", { city, province, neighborhood });
  return { city, province, neighborhood };
}

export type CreateEventDialogProps = {
  trigger?: React.ReactNode;
  onCreated?: (event: any) => void;
  apiBaseUrl?: string;   // p.ej. http://localhost:4000
};

export default function EventWizard({
  trigger,
  onCreated,
  apiBaseUrl,
}: CreateEventDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const API = React.useMemo(
    () => apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    [apiBaseUrl]
  );
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // ---- form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [capacityMax, setCapacityMax] = React.useState<string>("");

  const [street, setStreet] = React.useState("");
  const [streetNum, setStreetNum] = React.useState<string>("");
  const [addressDesc, setAddressDesc] = React.useState("");
  const [cityName, setCityName] = React.useState<string | null>(null);
  const [provinceName, setProvinceName] = React.useState<string | null>(null);
  const [neighborhoodName, setNeighborhoodName] = React.useState<string | null>(null);

  // Coordenadas capturadas
  const [lat, setLat] = React.useState<number | null>(null);
  const [lon, setLon] = React.useState<number | null>(null);

  const [startsAtLocal, setStartsAtLocal] = React.useState("");
  const [endsAtLocal, setEndsAtLocal] = React.useState("");

  React.useEffect(() => {
    let coll: any; // AddressAutofillCollection

    (async () => {
      // carga dinámica segura en Next.js
      const mod = await import("@mapbox/search-js-web");
      // crea la colección que “observa” el formulario
      coll = mod.autofill({
        accessToken: MAPBOX_TOKEN,
        options: { country: "AR", language: "es", limit: 5 },
      });

      if (formRef.current) coll.observe(formRef.current);

      // cuando el usuario selecciona una sugerencia:
      const onRetrieve = (ev: any) => {
        const f =
          ev?.detail?.feature ||
          ev?.detail?.features?.[0] ||
          null;
        const coords = Array.isArray(f?.geometry?.coordinates)
          ? f.geometry.coordinates
          : null;

        if (coords && typeof coords[0] === "number" && typeof coords[1] === "number") {
          setLon(coords[0]);
          setLat(coords[1]);
        }

        const line =
          f?.properties?.address_line1 ||
          f?.properties?.name ||
          f?.place_name ||
          "";
        const m = String(line).match(/^(.+?)\s+(\d+[A-Za-z\-]*)\b/);
        if (m) {
          if (!street) setStreet(m[1]);
          if (!streetNum) setStreetNum(m[2]);
        }
        const { city, province, neighborhood } = getCityAndProvince(f);
        setCityName(city);
        setProvinceName(province);
        setNeighborhoodName(neighborhood)
      };

      const onSuggest = (_ev: any) => {

      };

      coll.addEventListener("retrieve", onRetrieve);
      coll.addEventListener("suggest", onSuggest);

      return () => {
        coll?.removeEventListener("retrieve", onRetrieve);
        coll?.removeEventListener("suggest", onSuggest);
        coll?.remove?.();
      };
    })();
  }, [MAPBOX_TOKEN]);

  function resetForm() {
    setName("");
    setDescription("");
    setVisibility("public");
    setCapacityMax("");
    setStreet("");
    setStreetNum("");
    setAddressDesc("");
    setStartsAtLocal("");
    setEndsAtLocal("");
    setLat(null);
    setLon(null);
    setError(null);
  }

  async function geocodeBasic(q: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const r = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const json = await r.json().catch(() => null);
      const f = Array.isArray(json?.features) ? json.features[0] : null;
      if (!f) return null;

      const lon =
        typeof f.lon === "number" ? f.lon :
          Array.isArray(f.center) ? f.center[0] :
            Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates[0] : null;

      const lat =
        typeof f.lat === "number" ? f.lat :
          Array.isArray(f.center) ? f.center[1] :
            Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates[1] : null;

      if (typeof lat === "number" && typeof lon === "number") return { lat, lon };
    } catch { }
    return null;
  }

  function handleRetrieve(ev: any) {
    const f = ev?.detail?.features?.[0];
    if (!f) return;

    // coordenadas [lon, lat]
    const coords = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates : null;
    if (coords && typeof coords[0] === "number" && typeof coords[1] === "number") {
      setLon(coords[0]);
      setLat(coords[1]);
    }

    // Heurística simple para calle/número desde address_line1 o place_name
    const line =
      f?.properties?.address_line1 ||
      f?.properties?.name ||
      f?.place_name ||
      "";
    const m = String(line).match(/^(.+?)\s+(\d+[A-Za-z\-]*)\b/);
    if (m) {
      if (!street) setStreet(m[1]);
      if (!streetNum) setStreetNum(m[2]);
    }

    const { city, province, neighborhood } = getCityAndProvince(f);
    setCityName(city);
    setProvinceName(province);
    setNeighborhoodName(neighborhood);
    console.log("Parsed city/province:", city, province);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (!startsAtLocal) return setError("La fecha/hora de inicio es obligatoria.");
    if (!street.trim() || !streetNum) return setError("Faltan datos de la dirección (calle y número).");

    const startsAtIso = new Date(startsAtLocal).toISOString();
    const endsAtIso = endsAtLocal ? new Date(endsAtLocal).toISOString() : undefined;

    // Fallback por si el usuario no eligió de la lista
    let finalLat = lat;
    let finalLon = lon;
    if (finalLat == null || finalLon == null) {
      const q = `${street} ${streetNum}, Argentina`;
      const coords = await geocodeBasic(q);
      finalLat = coords?.lat ?? null;
      finalLon = coords?.lon ?? null;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      visibility,
      capacityMax: capacityMax ? Number(capacityMax) : null,
      address: {
        street: street.trim(),
        streetNum: Number(streetNum),
        addressDesc: addressDesc.trim() || null,
        lat: finalLat,
        lon: finalLon,
        cityName,        
        provinceName,
        neighborhoodName,
      },
      startsAtIso,
      endsAtIso,
    };
    const body = JSON.stringify(payload);
    console.log("Creating event with", body);
    setLoading(true);
    try {
      const res = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Error creando el evento");
      onCreated?.(json.data);
      resetForm();
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#65558F] text-white" type="button">Nuevo evento</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Crear evento</DialogTitle>
          <DialogDescription>Completa los campos y publicá tu evento.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Jam del viernes" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility" className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Visibilidad
              </Label>
              <Select value={visibility} onValueChange={(v: "public" | "private") => setVisibility(v)}>
                <SelectTrigger id="visibility">
                  <SelectValue placeholder="Seleccioná" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" placeholder="Contá de qué trata tu evento" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="capacity" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Capacidad máxima (opcional)
              </Label>
              <Input
                id="capacity"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="50"
                value={capacityMax}
                onChange={(e) => setCapacityMax(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>

            {/* 🔎 Buscador Mapbox (inyectado) */}
            <div className="md:col-span-2">
              <Label className="mb-1 block">Buscar dirección</Label>
              <MapboxSearchBox
                accessToken={MAPBOX_TOKEN}
                placeholder="Escribí la dirección (ej. 'Av. Corrientes 1234')"
                country="AR"
                language="es"
                limit={5}
                types="address,poi"
                className="w-full"
                onRetrieve={handleRetrieve}
              />
              {(lat != null && lon != null) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Coordenadas: <span className="font-mono">lat {lat.toFixed(6)}, lon {lon.toFixed(6)}</span>
                </p>
              )}
            </div>

            {/* Campos manuales (se prellenan si se pudo parsear) */}
            <div className="space-y-2">
              <Label htmlFor="street">Calle</Label>
              <Input id="street" placeholder="Av. Corrientes"
                name="street"
                autoComplete="street-address"
                value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetNum">Número</Label>
              <Input
                id="streetNum"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1234"
                value={streetNum}
                onChange={(e) => setStreetNum(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressDesc">Referencia (opcional)</Label>
              <Input id="addressDesc" placeholder="Piso 2, puerta negra" value={addressDesc} onChange={(e) => setAddressDesc(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startsAt">Inicio</Label>
              <Input id="startsAt" type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Fin (opcional)</Label>
              <Input id="endsAt" type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
              Crear evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
