"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck2, Loader2, MapPin, Shield, Users } from "lucide-react";
import LocationCascade, { LocationCascadeValue } from "@/components/LocationCascade";

export type EditEventDialogProps = {
  eventId: number;
  trigger?: React.ReactElement;
  onUpdated?: (event: any) => void;
  apiBaseUrl?: string;
  token?: string;
};

type SelectedLoc = {
  provinceId?: string | null;
  provinceName?: string | null;
  municipioId?: string | null;
  municipioName?: string | null;
  idCity?: number | null;
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
  const [loc, setLoc] = React.useState<SelectedLoc>({});

  const API = React.useMemo(
    () => apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    [apiBaseUrl]
  );

  // form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [capacityMax, setCapacityMax] = React.useState<string>("");

  const [startsAtLocal, setStartsAtLocal] = React.useState("");
  const [endsAtLocal, setEndsAtLocal] = React.useState("");

  const [changeAddress, setChangeAddress] = React.useState(false);
  const [idCity, setIdCity] = React.useState<string>("");
  const [street, setStreet] = React.useState("");
  const [streetNum, setStreetNum] = React.useState<string>("");
  const [addressDesc, setAddressDesc] = React.useState("");


  const handleLocChange = React.useCallback((val: LocationCascadeValue) => {
    setLoc({
      provinceId: val.provinceId ?? null,
      provinceName: val.provinceName ?? null,
      municipioId: val.municipioId ?? null,
      municipioName: val.municipioName ?? null,
      idCity: val.idCity ?? null,
    });
    setIdCity(val.idCity ? String(val.idCity) : "");
  }, []);

  async function geocodeAR(opts: {
    provinceName?: string | null;
    municipioName?: string | null;
    street?: string;
    number?: string;
  }): Promise<{ lat: number; lon: number } | null> {
    const { provinceName, municipioName, street, number } = opts;
    if (!provinceName || !street || !number) return null;
    const q = `${street} ${number}, ${municipioName ?? ""}, ${provinceName}, Argentina`.replace(/\s+,/g, ",");

    try {
      const r = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!r.ok) return null;
      const json = await r.json();
      const f = Array.isArray(json?.features) ? json.features[0] : null;
      if (f && typeof f.lat === "number" && typeof f.lon === "number") {
        return { lat: f.lat, lon: f.lon };
      }
    } catch { }
    return null;
  }

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
    setIdCity("");
    setStreet("");
    setStreetNum("");
    setAddressDesc("");
  }

  function resetAll() {
    setName("");
    setDescription("");
    setVisibility("public");
    setCapacityMax("");
    setStartsAtLocal("");
    setEndsAtLocal("");
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
        const e = json.data ?? json; // por si el API devuelve plano
        setName(e.name ?? "");
        setDescription(e.description ?? "");
        setVisibility((e.visibility as any) === "private" ? "private" : "public");
        setCapacityMax(e.capacityMax != null ? String(e.capacityMax) : "");
        setStartsAtLocal(toInputValue(e.startsAt));
        setEndsAtLocal(toInputValue(e.endsAt));
        resetAddress();
      } catch (err: any) {
        if (!alive) return;
        setError(err.message || "Error al cargar el evento");
      } finally {
        if (alive) setLoadingEvent(false);
      }
    })();
    return () => { alive = false; };
  }, [open, API, eventId, token]);

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
      // permitir fallback: nombres obligatorios, idCity opcional
      if (!loc?.provinceName || !loc?.municipioName || !street.trim() || !streetNum) {
        return setError("Completá provincia, ciudad/municipio, calle y número para cambiar la dirección.");
      }

      // geocodificá para lat/lon (usando tu proxy de Mapbox)
      const coords = await geocodeAR({
        provinceName: loc.provinceName!,
        municipioName: loc.municipioName!,
        street,
        number: streetNum,
      });

      const address: any = {
        street: street.trim(),
        streetNum: Number(streetNum),
        addressDesc: addressDesc.trim() || null,
        provinceName: loc.provinceName,
        municipioName: loc.municipioName,
        georef: {
          provinceId: loc.provinceId ?? null,
          municipioId: loc.municipioId ?? null,
        },
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
      };

      if (idCity) address.idCity = Number(idCity); 

      payload.address = address;
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

            {/* Cambiar dirección (opcional) */}
            <div className="md:col-span-2 space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox id="chgaddr" checked={changeAddress} onCheckedChange={(v) => setChangeAddress(Boolean(v))} />
                <Label htmlFor="chgaddr" className="cursor-pointer flex items-center gap-2"><MapPin className="h-4 w-4" /> Cambiar dirección</Label>
              </div>

              {changeAddress && (
                <div className="grid grid-cols-1 gap-4">
                  <LocationCascade
                    proxyBaseUrl="/api/georef"
                    geocodeBaseUrl="/api/geocode/search"
                    className="w-full"
                    onChange={(val) => {
                      setLoc({
                        provinceId: val.provinceId ?? null,
                        provinceName: val.provinceName ?? null,
                        municipioId: val.municipioId ?? null,
                        municipioName: val.municipioName ?? null,
                        idCity: val.idCity ?? null,
                      });
                      setIdCity(val.idCity ? String(val.idCity) : "");
                    }}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street">Calle</Label>
                      <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="streetNum">Número</Label>
                      <Input id="streetNum" inputMode="numeric" pattern="[0-9]*" value={streetNum} onChange={(e) => setStreetNum(e.target.value.replace(/[^0-9]/g, ""))} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor="addressDesc">Referencia (opcional)</Label>
                      <Input id="addressDesc" value={addressDesc} onChange={(e) => setAddressDesc(e.target.value)} />
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
