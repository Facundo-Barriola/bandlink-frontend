"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const DEFAULT_PROXY = "/api/georef";
const DEFAULT_GEOCODE = "/api/geocode/search";

// Provincias offline para sugerencias en fallback (datalist)
const PROVINCIAS_AR = [
  "Ciudad Autónoma de Buenos Aires","Buenos Aires","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos",
  "Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis",
  "Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego, Antártida e Islas del Atlántico Sur","Tucumán",
];

// ---- Tipos
type Province = { id: string; nombre: string };
type Municipio = { id: string; nombre: string };

type ApiProvincia = { id: string | number; nombre: string };
type ApiMunicipio = { id: string | number; nombre: string };
type ProvinciasResp = { provincias?: ApiProvincia[] };
type MunicipiosResp = { municipios?: ApiMunicipio[] };

export type LocationCascadeValue = {
  country: "Argentina";
  provinceId?: string | null;
  provinceName?: string | null;
  municipioId?: string | null;
  municipioName?: string | null;
  idCity?: number | null;
};

type Props = {
  className?: string;
  disabled?: boolean;
  defaultProvinceId?: string;
  defaultMunicipioId?: string;
  proxyBaseUrl?: string;
  geocodeBaseUrl?: string;
  onChange?: (loc: LocationCascadeValue) => void;
};

export default function LocationCascade({
  className,
  disabled,
  defaultProvinceId,
  defaultMunicipioId,
  proxyBaseUrl,
  geocodeBaseUrl,
  onChange,
}: Props) {
  const base = proxyBaseUrl ?? DEFAULT_PROXY;
  const geocodeBase = geocodeBaseUrl ?? DEFAULT_GEOCODE;

  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [municipios, setMunicipios] = React.useState<Municipio[]>([]);
  const [provinceId, setProvinceId] = React.useState<string | undefined>(defaultProvinceId);
  const [municipioId, setMunicipioId] = React.useState<string | undefined>(defaultMunicipioId);

  const [loadingProv, setLoadingProv] = React.useState(false);
  const [loadingMun, setLoadingMun] = React.useState(false);
  const [georefDown, setGeorefDown] = React.useState(false);

  // Fallback de provincia: texto + sugerencias
  const [provinceQuery, setProvinceQuery] = React.useState("");
  // Fallback de ciudad: texto + sugerencias Mapbox
  const [cityQuery, setCityQuery] = React.useState("");
  const [cityOptions, setCityOptions] = React.useState<Array<{ id: string; nombre: string }>>([]);
  const debounceRef = React.useRef<number | undefined>(undefined);

  const selectedProvince = React.useMemo(
    () => provinces.find((p) => p.id === provinceId) || null,
    [provinces, provinceId]
  );
  const selectedProvinceName =
    georefDown ? (provinceQuery || "") : (selectedProvince?.nombre ?? "");

  // 1) Cargar provincias (si falla, activamos fallback)
  React.useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingProv(true);
        const res = await fetch(`${base}/provincias`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const isFallback = res.headers.get("x-fallback") === "true";
        setGeorefDown(Boolean(isFallback));

        const json: ProvinciasResp = await res.json();
        const api: ApiProvincia[] = Array.isArray(json?.provincias) ? json.provincias : [];
        const mapped: Province[] = api.map((p) => ({ id: String(p.id), nombre: p.nombre }));
        setProvinces(mapped);
      } catch (e) {
        setGeorefDown(true);
        setProvinces([]);
      } finally {
        setLoadingProv(false);
      }
    })();
    return () => ctrl.abort();
  }, [base]);

  // 2) Municipios (solo si NO estamos en fallback y hay provincia elegida)
  React.useEffect(() => {
    if (!provinceId || georefDown) {
      setMunicipios([]);
      setMunicipioId(undefined);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingMun(true);
        const res = await fetch(
          `${base}/municipios?provincia=${encodeURIComponent(provinceId)}`,
          { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" }
        );
        const isFallback = res.headers.get("x-fallback") === "true";
        if (isFallback) setGeorefDown(true);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: MunicipiosResp = await res.json();
        const api: ApiMunicipio[] = Array.isArray(json?.municipios) ? json.municipios : [];
        const list: Municipio[] = api.map((m) => ({ id: String(m.id), nombre: m.nombre }));
        setMunicipios(list);
        if (!list.some((m) => m.id === municipioId)) setMunicipioId(undefined);
      } catch {
        setMunicipios([]);
        setMunicipioId(undefined);
        setGeorefDown(true);
      } finally {
        setLoadingMun(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, provinceId, georefDown]);

  // 3) Fallback: autocompletar ciudades con Mapbox usando el nombre de provincia
  React.useEffect(() => {
    if (!georefDown) return;
    if (!selectedProvinceName) {
      setCityOptions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!cityQuery || cityQuery.trim().length < 3) {
      setCityOptions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const q = `${cityQuery.trim()}, ${selectedProvinceName}`;
        const r = await fetch(`${geocodeBase}?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await r.json().catch(() => ({}));
        const feats: any[] = Array.isArray(json?.features) ? json.features : [];
        const opts = feats
          .map((f) => f.municipioName || f.addressLine)
          .filter(Boolean)
          .map((name: string, i: number) => ({ id: String(i), nombre: String(name) }));
        const seen = new Set<string>();
        const unique = opts.filter((o) => (seen.has(o.nombre) ? false : seen.add(o.nombre)));
        setCityOptions(unique.slice(0, 10));
      } catch {
        setCityOptions([]);
      }
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQuery, geocodeBase, georefDown, selectedProvinceName]);

  // 4) Reportar hacia arriba (IDs si hay catálogo; nombres si estamos en fallback)
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  React.useEffect(() => {
    const provName = selectedProvinceName || null;
    const provId   = georefDown ? null : (selectedProvince?.id ?? null);
    const mun      = georefDown ? undefined : municipios.find((m) => m.id === municipioId);

    onChangeRef.current?.({
      country: "Argentina",
      provinceId: provId,
      provinceName: provName,
      municipioId: georefDown ? null : (mun?.id ?? null),
      municipioName: georefDown ? (cityQuery || null) : (mun?.nombre ?? null),
      idCity: georefDown ? null : (mun?.id ? Number(mun.id) : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId, provinceQuery, municipioId, georefDown, cityQuery, municipios, selectedProvinceName]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* País */}
        <div className="space-y-2">
          <Label>País</Label>
          <Select value="AR" disabled>
            <SelectTrigger><SelectValue placeholder="Argentina" /></SelectTrigger>
            <SelectContent><SelectItem value="AR">Argentina</SelectItem></SelectContent>
          </Select>
        </div>

        {/* Provincia */}
        <div className="space-y-2">
          <Label>Provincia</Label>

          {!georefDown ? (
            <Select
              value={provinceId ?? ""}
              disabled={disabled || loadingProv}
              onValueChange={(v) => {
                setProvinceId(v || undefined);
                setMunicipioId(undefined);
                setCityQuery("");
                setProvinceQuery(""); // limpiamos texto de fallback si venía de antes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingProv ? "Cargando..." : "Seleccioná provincia"} />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <Input
                list="prov_ar_opts"
                value={provinceQuery}
                onChange={(e) => {
                  setProvinceQuery(e.target.value);
                  setProvinceId(undefined); // no hay ID oficial en fallback
                  setMunicipioId(undefined);
                  setCityQuery("");
                }}
                disabled={disabled}
                placeholder="Escribí tu provincia..."
              />
              <datalist id="prov_ar_opts">
                {PROVINCIAS_AR.map((n) => (<option key={n} value={n} />))}
              </datalist>
              <p className="text-xs text-amber-600">Georef no responde: ingresá la provincia manualmente.</p>
            </div>
          )}
        </div>

        {/* Ciudad / Municipio */}
        <div className="space-y-2 md:col-span-2">
          <Label>Ciudad / Municipio</Label>

          {!georefDown ? (
            <Select
              value={municipioId ?? ""}
              disabled={disabled || !provinceId || loadingMun}
              onValueChange={(v) => setMunicipioId(v || undefined)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !provinceId
                      ? "Seleccioná una provincia primero"
                      : loadingMun
                      ? "Cargando..."
                      : "Seleccioná ciudad/municipio"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {municipios.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <Input
                list="cities_ar_opts"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                disabled={disabled || !selectedProvinceName}
                placeholder={!selectedProvinceName ? "Ingresá provincia primero" : "Escribí tu ciudad/municipio..."}
              />
              <datalist id="cities_ar_opts">
                {cityOptions.map((o) => (<option key={o.id} value={o.nombre} />))}
              </datalist>
              <p className="text-xs text-amber-600">
                Georef no responde: usando búsqueda por Mapbox para la ciudad.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
