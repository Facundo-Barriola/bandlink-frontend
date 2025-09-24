"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

export type Country = { idCountry: number; name: string };
export type Province = { idProvince: number; name: string };
export type City = { idCity: number; name: string };

export type LocationCascadeValue = {
  idCountry: number | null;
  idProvince: number | null;
  idCity: number | null;
  country?: Country | null;
  province?: Province | null;
  city?: City | null;
};

export type LocationCascadeProps = {
  apiBaseUrl?: string;
  value?: LocationCascadeValue;
  onChange?: (next: LocationCascadeValue) => void;
  disabled?: boolean;
  className?: string;
};

function useApiBase(apiBaseUrl?: string) {
  return React.useMemo(
    () => apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    [apiBaseUrl]
  );
}

export default function LocationCascade({ apiBaseUrl, value, onChange, disabled, className }: LocationCascadeProps) {
  const API = useApiBase(apiBaseUrl);

  const [countries, setCountries] = React.useState<Country[]>([]);
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [cities, setCities] = React.useState<City[]>([]);

  const [idCountry, setIdCountry] = React.useState<string>(value?.idCountry ? String(value.idCountry) : "");
  const [idProvince, setIdProvince] = React.useState<string>(value?.idProvince ? String(value.idProvince) : "");
  const [idCity, setIdCity] = React.useState<string>(value?.idCity ? String(value.idCity) : "");

  // Notificar cambios al padre
  const notify = React.useCallback(() => {
    if (!onChange) return;
    const country = countries.find((x) => String(x.idCountry) === idCountry) || null;
    const province = provinces.find((x) => String(x.idProvince) === idProvince) || null;
    const city = cities.find((x) => String(x.idCity) === idCity) || null;
    onChange({
      idCountry: idCountry ? Number(idCountry) : null,
      idProvince: idProvince ? Number(idProvince) : null,
      idCity: idCity ? Number(idCity) : null,
      country,
      province,
      city,
    });
  }, [onChange, countries, provinces, cities, idCountry, idProvince, idCity]);

  React.useEffect(() => { notify(); }, [notify]);

  // 1) Países
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/address/countries`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        const raw = Array.isArray(json) ? json : (json?.data ?? []);
        // map countryDesc -> name
        const list: Country[] = raw.map((c: any) => ({
          idCountry: c.idCountry,
          name: c.countryDesc ?? c.name ?? "",
        }));
        if (!alive) return;
        setCountries(list);
      } catch {
        if (!alive) return;
        setCountries([]);
      }
    })();
    return () => { alive = false; };
  }, [API]);

  // 2) Provincias por país (ruta con PATH PARAM)
  React.useEffect(() => {
    if (!idCountry) { setProvinces([]); setIdProvince(""); setCities([]); setIdCity(""); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/address/${idCountry}/provinces`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        const raw = Array.isArray(json) ? json : (json?.data ?? []);
        const list: Province[] = raw.map((p: any) => ({
          idProvince: p.idProvince,
          name: p.provinceDesc ?? p.name ?? "",
        }));
        if (!alive) return;
        setProvinces(list);
        setIdProvince("");
        setCities([]);
        setIdCity("");
      } catch {
        if (!alive) return;
        setProvinces([]);
        setIdProvince("");
        setCities([]);
        setIdCity("");
      }
    })();
    return () => { alive = false; };
  }, [API, idCountry]);

  // 3) Ciudades por provincia (ruta con PATH PARAM)
  React.useEffect(() => {
    if (!idProvince) { setCities([]); setIdCity(""); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/address/${idProvince}/cities`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        const raw = Array.isArray(json) ? json : (json?.data ?? []);
        const list: City[] = raw.map((c: any) => ({
          idCity: c.idCity,
          name: c.cityDesc ?? c.name ?? "",
        }));
        if (!alive) return;
        setCities(list);
        setIdCity("");
      } catch {
        if (!alive) return;
        setCities([]);
        setIdCity("");
      }
    })();
    return () => { alive = false; };
  }, [API, idProvince]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> País</Label>
          <Select value={idCountry} onValueChange={(v) => setIdCountry(v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná un país" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.idCountry} value={String(c.idCountry)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Provincia</Label>
          <Select
            value={idProvince}
            onValueChange={(v) => setIdProvince(v)}
            disabled={disabled || !idCountry || provinces.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={!idCountry ? "Elegí un país primero" : "Seleccioná provincia"} />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.idProvince} value={String(p.idProvince)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ciudad</Label>
          <Select
            value={idCity}
            onValueChange={(v) => setIdCity(v)}
            disabled={disabled || !idProvince || cities.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={!idProvince ? "Elegí una provincia" : "Seleccioná ciudad"} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.idCity} value={String(c.idCity)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
