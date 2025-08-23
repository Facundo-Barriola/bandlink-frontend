"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Select, { OnChangeValue } from "react-select";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Country = {
  idCountry: number;
  countryCode: string;
  countryDesc: string;
};
type Province = {
  idProvince: number;
  idCountry: number;
  provinceCode: string;
  provinceDesc: string;
};
type City = {
  idCity: number;
  idProvince: number;
  cityDesc: string;
  postalCode: string;
};
type Instrument = { idInstrument: number; instrumentName: string };

export default function MusicianForm() {
  const [role, setRole] = useState<"musico" | "sala" | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [instrumentsRaw, setInstrumentsRaw] = useState<Instrument[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<Instrument[]>([]);

  const [countryId, setCountryId] = useState<number | "">("");
  const [provinceId, setProvinceId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const instrumentIds = selectedInstruments.map(i => i.idInstrument);
  const experienceOptions = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
    { value: 'professional', label: 'Profesional' }]

  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as T;
  }
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoadingCountries(true);
        const data = await apiGet<Country[]>("/address/countries");
        if (!mounted) return;
        // Ordenar por nombre por las dudas
        data.sort((a, b) => a.countryDesc.localeCompare(b.countryDesc, "es"));
        setCountries(data);
        const ar = data.find((c) => c.countryCode?.toUpperCase() === "ARG");
        if (ar) setCountryId(ar.idCountry);
      } catch (e: any) {
        setErr("No se pudieron cargar los países");
      } finally {
        setLoadingCountries(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!countryId) {
      setProvinces([]);
      setProvinceId("");
      setCities([]);
      setCityId("");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoadingProvinces(true);
        setProvinceId("");
        setCities([]);
        setCityId("");
        const data = await apiGet<Province[]>(`/address/${countryId}/provinces`);
        if (!mounted) return;
        data.sort((a, b) => a.provinceDesc.localeCompare(b.provinceDesc, "es"));
        setProvinces(data);
      } catch {
        setErr("No se pudieron cargar las provincias");
        setProvinces([]);
      } finally {
        setLoadingProvinces(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [countryId]);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setCityId("");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoadingCities(true);
        setCityId("");
        const data = await apiGet<City[]>(`/address/${provinceId}/cities`);
        if (!mounted) return;
        data.sort((a, b) => a.cityDesc.localeCompare(b.cityDesc, "es"));
        setCities(data);
      } catch {
        setErr("No se pudieron cargar las ciudades");
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [provinceId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoadingInstruments(true);
        const instruments = await apiGet<Instrument[]>("/directory/instruments");
        if (!mounted) return;
        instruments.sort((a, b) => a.instrumentName.localeCompare(b.instrumentName, "es"));
        setInstrumentsRaw(instruments);
      } catch {
        setErr("No se pudieron cargar los instrumentos");
        setInstrumentsRaw([]);
      } finally {
        setLoadingInstruments(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [])

  const countryPlaceholder = useMemo(
    () => (loadingCountries ? "Cargando países..." : "Selecciona país"),
    [loadingCountries]
  );
  const provincePlaceholder = useMemo(() => {
    if (!countryId) return "Selecciona un país primero";
    return loadingProvinces ? "Cargando provincias..." : "Selecciona provincia";
  }, [countryId, loadingProvinces]
  );
  const cityPlaceholder = useMemo(() => {
    if (!provinceId) return "Selecciona una provincia primero";
    return loadingCities ? "Cargando ciudades..." : "Selecciona ciudad";
  }, [provinceId, loadingCities]
  );
  return (
    <Card className="w-[450px] shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className=" text-[#65558F] text-center">Registro Músico</CardTitle>
      </CardHeader>
      <CardContent className="text-[#65558F] grid grid-cols-2 gap-8">
        <div>
          <label className="text-[#65558F]">Nombre</label>
          <input
            type="text"
            placeholder="Nombre"
            className=" text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Apellido</label>
          <input
            type="text"
            placeholder="Apellido"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Fecha Nacimiento</label>
          <input
            type="date"
            placeholder="Fecha de Nacimiento"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="text-[#65558F]">Pais</label>
          <select name="paises"
            id="paises"
            className="text-[#65558F] border rounded-lg p-2 w-full"
            value={countryId}
            onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
            disabled={loadingCountries}
          >
            <option value="">{countryPlaceholder}</option>
            {countries.map((c) => (
              <option key={c.idCountry} value={c.idCountry}>
                {c.countryDesc}
              </option>))}
          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Provincia</label>
          <select
            name="provincias"
            id="provincias"
            className="text-[#65558F] border rounded-lg p-2 w-full"
            value={provinceId}
            onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : "")}
            disabled={!countryId || loadingProvinces}
          >
            <option value="">{provincePlaceholder}</option>
            {provinces.map((p) => (
              <option key={p.idProvince} value={p.idProvince}>
                {p.provinceDesc}
              </option>))}
          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Ciudad</label>
          <select name="ciudades"
            id="ciudades"
            className="text-[#65558F] border rounded-lg p-2 w-full"
            value={cityId}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
            disabled={!provinceId || loadingCities}>
            <option value="">{cityPlaceholder}</option>
            {cities.map((c) => (
              <option key={c.idCity} value={c.idCity}>
                {c.cityDesc}
              </option>))}
          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Instrumentos</label>
          <Select<Instrument, true>
            isMulti
            isLoading={loadingInstruments}
            options={instrumentsRaw}
            value={selectedInstruments}
            onChange={(vals) => setSelectedInstruments(vals as Instrument[])}
            getOptionLabel={(i) => i.instrumentName}
            getOptionValue={(i) => String(i.idInstrument)}
            placeholder="Selecciona Instrumentos"
            className="text-[#65558F]"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Nivel de Experiencia</label>
          <Select options={experienceOptions} placeholder="Exp" className="text-[#65558F]" />
        </div>
        <div className="col-span-2">
          <label className="text-[#65558F]">Descripción</label>
          <textarea
            placeholder="Descripción"
            className="text-[#65558F] border rounded-lg p-2 h-24 w-full"
          />
        </div>
        <Button className="bg-[#65558F] text-white w-full">Registrarme</Button>
        <Button
          variant="ghost"
          onClick={() => setRole(null)}
          className=" bg-[#EC221F] text-white w-full"
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};