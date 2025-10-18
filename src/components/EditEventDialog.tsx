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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck2, Loader2, MapPin, Shield, Users } from "lucide-react";

/* === Wrapper simple para <mapbox-search-box> === */
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
      await import("@mapbox/search-js-web");
      if (!mounted || !hostRef.current) return;

      el = document.createElement("mapbox-search-box");
      el.setAttribute("access-token", accessToken);
      el.setAttribute("country", country);
      el.setAttribute("language", language);
      el.setAttribute("limit", String(limit));
      el.setAttribute("types", types);
      if (placeholder) el.setAttribute("placeholder", placeholder);

      const handleRetrieve = (ev: any) => onRetrieve?.(ev);
      el.addEventListener("retrieve", handleRetrieve);

      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(el);

      return () => {
        el?.removeEventListener("retrieve", handleRetrieve);
      };
    })();

    return () => {
      mounted = false;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [accessToken, country, language, limit, types, placeholder, onRetrieve]);

  return <div ref={hostRef} className={className} />;
}

/* === Extraer ciudad/provincia/barrio del feature de Mapbox === */
function getCityAndProvince(f: any): { city: string | null; province: string | null; neighborhood: string | null } {
  const props = f?.properties ?? {};
  const ctxObj = props?.context ?? {};
  const ctxArr = Array.isArray(f?.context) ? f.context : (Array.isArray(props?.context) ? props.context : []);
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

  return { city, province, neighborhood };
}

export type EditEventDialogProps = {
  eventId: number;
  trigger?: React.ReactElement;
  onUpdated?: (event: any) => void;
  apiBaseUrl?: string;
  token?: string;
};

export default function EditEventDialog({
  eventId,
  trigger,
  onUpdated,
  apiBaseUrl,
  token,
}: EditEventDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingEvent, setLoadingEvent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const API = React.useMemo(
    () => apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    [apiBaseUrl]
  );
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [capacityMax, setCapacityMax] = React.useState<string>("");

  const [startsAtLocal, setStartsAtLocal] = React.useState("");
  const [endsAtLocal, setEndsAtLocal] = React.useState("");

  // Dirección actual (preview)
  const [currentAddress, setCurrentAddress] = React.useState<string>("");

  // Cambiar dirección (opcional)
  const [changeAddress, setChangeAddress] = React.useState(false);
  const [street, setStreet] = React.useState("");
  const [streetNum, setStreetNum] = React.useState<string>("");
  const [addressDesc, setAddressDesc] = React.useState("");
  const [cityName, setCityName] = React.useState<string | null>(null);
  const [provinceName, setProvinceName] = React.useState<string | null>(null);
  const [neighborhoodName, setNeighborhoodName] = React.useState<string | null>(null);
  const [lat, setLat] = React.useState<number | null>(null);
  const [lon, setLon] = React.useState<number | null>(null);

  function toInputValue(raw?: string | null) {
    if (!raw) return "";
    const s = String(raw);
    if (s.length >= 16 && s.includes("T")) return s.slice(0, 16);
    try {
      const d = new Date(s);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const HH = String(d.getHours()).padStart(2, "0");
      const MM = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
    } catch {
      return "";
    }
  }

  function resetAddress() {
    setChangeAddress(false);
    setStreet("");
    setStreetNum("");
    setAddressDesc("");
    setCityName(null);
    setProvinceName(null);
    setNeighborhoodName(null);
    setLat(null);
    setLon(null);
  }

  function resetAll() {
    setName("");
    setDescription("");
    setVisibility("public");
    setCapacityMax("");
    setStartsAtLocal("");
    setEndsAtLocal("");
    setCurrentAddress("");
    resetAddress();
    setError(null);
  }

  // Cargar evento cuando se abre el dialog
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        setLoadingEvent(true);
        setError(null);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API}/events/${eventId}`, {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar el evento");
        if (!alive) return;

        const e = json.data ?? json;
        setName(e.name ?? "");
        setDescription(e.description ?? "");
        setVisibility((e.visibility as any) === "private" ? "private" : "public");
        setCapacityMax(e.capacityMax != null ? String(e.capacityMax) : "");
        setStartsAtLocal(toInputValue(e.startsAt));
        setEndsAtLocal(toInputValue(e.endsAt));

        const a = e.address ?? {};
        const preview = [
          a.street && `${a.street} ${a.streetNum ?? ""}`.trim(),
          a.neighborhoodName,
          a.cityName,
          a.provinceName,
        ].filter(Boolean).join(", ");
        setCurrentAddress(preview || "");
        resetAddress(); // limpiamos el bloque de cambio
      } catch (err: any) {
        if (!alive) return;
        setError(err.message || "Error al cargar el evento");
      } finally {
        if (alive) setLoadingEvent(false);
      }
    })();
    return () => { alive = false; };
  }, [open, API, eventId, token]);

  /* === Handler de selección desde Mapbox === */
  function handleRetrieve(ev: any) {
    const f = ev?.detail?.feature || ev?.detail?.features?.[0] || null;
    if (!f) return;

    const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : null;
    if (coords && typeof coords[0] === "number" && typeof coords[1] === "number") {
      setLon(coords[0]);
      setLat(coords[1]);
    }

    const line = f?.properties?.address_line1 || f?.properties?.name || f?.place_name || "";
    const m = String(line).match(/^(.+?)\s+(\d+[A-Za-z\-]*)\b/);
    if (m) {
      if (!street) setStreet(m[1]);
      if (!streetNum) setStreetNum(m[2]);
    }

    const { city, province, neighborhood } = getCityAndProvince(f);
    setCityName(city);
    setProvinceName(province);
    setNeighborhoodName(neighborhood);
    // console.log("Mapbox:", { city, province, neighborhood, coords });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("El nombre es obligatorio.");
    if (!startsAtLocal) return setError("La fecha/hora de inicio es obligatoria.");

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      visibility,
      capacityMax: capacityMax ? Number(capacityMax) : null,
      startsAtIso: new Date(startsAtLocal).toISOString(),
      endsAtIso: endsAtLocal ? new Date(endsAtLocal).toISOString() : null,
    };

    if (changeAddress) {
      if (!street.trim() || !streetNum) {
        return setError("Completá calle y número (podés elegir desde el buscador).");
      }
      payload.address = {
        street: street.trim(),
        streetNum: Number(streetNum),
        addressDesc: addressDesc.trim() || null,
        lat,     // pueden ir null si no seleccionó del buscador
        lon,
        cityName,
        provinceName,
        neighborhoodName,
      };
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API}/events/${eventId}`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar el evento");
      onUpdated?.(json.data ?? json);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 rounded-2xl"><CalendarCheck2 className="h-4 w-4" /> Editar evento</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar evento</DialogTitle>
          <DialogDescription>Actualizá los campos necesarios y guardá los cambios.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4" disabled={loadingEvent}>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Capacidad máxima (opcional)
              </Label>
              <Input id="capacity" inputMode="numeric" pattern="[0-9]*" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startsAt">Inicio</Label>
              <Input id="startsAt" type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAt">Fin (opcional)</Label>
              <Input id="endsAt" type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
            </div>

            {/* Dirección actual + Cambiar dirección */}
            <div className="md:col-span-2 space-y-3 border-t pt-4">
              {currentAddress && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Dirección actual:</span> {currentAddress}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Checkbox id="chgaddr" checked={changeAddress} onCheckedChange={(v) => setChangeAddress(Boolean(v))} />
                <Label htmlFor="chgaddr" className="cursor-pointer flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Cambiar dirección
                </Label>
              </div>

              {changeAddress && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
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
                        Coordenadas: <span className="font-mono">lat {lat?.toFixed(6)}, lon {lon?.toFixed(6)}</span>
                      </p>
                    )}
                    {(cityName || provinceName || neighborhoodName) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {neighborhoodName ? `${neighborhoodName}, ` : ""}{cityName || "—"}{cityName ? ", " : " "}{provinceName || "—"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Calle</Label>
                      <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Av. Corrientes" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="streetNum">Número</Label>
                      <Input id="streetNum" inputMode="numeric" pattern="[0-9]*" value={streetNum} onChange={(e) => setStreetNum(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1234" />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="addressDesc">Referencia (opcional)</Label>
                      <Input id="addressDesc" value={addressDesc} onChange={(e) => setAddressDesc(e.target.value)} placeholder="Piso 2, puerta negra" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || loadingEvent}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={loading || loadingEvent}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck2 className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
