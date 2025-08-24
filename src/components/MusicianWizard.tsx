"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Select, { OnChangeValue } from "react-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

type Step = 1 | 2 | 3;

type SkillLevel = "beginner" | "intermediate" | "advanced" | "professional";
type ExperienceOption = { value: SkillLevel; label: string };

type Visibility = "city" | "province" | "country" | "global";

type WizardCompletePayload = {
  profile: {
    displayName: string;
    bio: string | null;
  };
  musician: {
    birthDate: string;
    skillLevel: "beginner" | "intermediate" | "advanced" | "professional";
    isAvailable: boolean;
    travelRadiusKm: number;
    visibility: "city" | "province" | "country" | "global";
    instruments: { idInstrument: number; isPrimary: boolean }[];
  };
};

export default function MusicianWizard({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void,
  onComplete?: (payload: WizardCompletePayload) => void
}) {

  const [step, setStep] = useState<Step>(1);
  const next = () =>
    setStep((s): Step => {
      switch (s) {
        case 1: return 2;
        case 2: return 3;
        default: return 3;
      }
    });

  const back = () =>
    setStep((s): Step => {
      switch (s) {
        case 3: return 2;
        case 2: return 1;
        default: return 1;
      }
    });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<string>(""); // yyyy-mm-dd
  const [bio, setBio] = useState("");
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

  const experienceOptions: ExperienceOption[] = [
    { value: "beginner", label: "Principiante" },
    { value: "intermediate", label: "Intermedio" },
    { value: "advanced", label: "Avanzado" },
    { value: "professional", label: "Profesional" },
  ];
  const [experience, setExperience] = useState<typeof experienceOptions[number] | null>(null);

  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as T;
  }
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoadingCountries(true);
        const data = await apiGet<Country[]>("/address/countries");
        if (!mounted) return;
        data.sort((a, b) => a.countryDesc.localeCompare(b.countryDesc, "es"));
        setCountries(data);
        const ar = data.find(c => c.countryCode?.toUpperCase() === "ARG");
        if (ar) setCountryId(ar.idCountry);
      } catch { setErr("No se pudieron cargar los países"); }
      finally { setLoadingCountries(false); }
    })();
    (async () => {
      try {
        setLoadingInstruments(true);
        const data = await apiGet<Instrument[]>("/directory/instruments");
        data.sort((a, b) => a.instrumentName.localeCompare(b.instrumentName, "es"));
        setInstrumentsRaw(data);
      } catch { /* opcional: setErr */ }
      finally { setLoadingInstruments(false); }
    })();
    return () => { mounted = false; };
  }, [open]);

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

  const canNextStep1 = firstName.trim() && lastName.trim() && birthDate;
  const canNextStep2 = countryId && provinceId && cityId;
  const canSubmit = selectedInstruments.length > 0 && !!experience;
  const countryPH = useMemo(
    () => (loadingCountries ? "Cargando países..." : "Selecciona país"),
    [loadingCountries]
  );
  const provincePH = useMemo(() => {
    if (!countryId) return "Selecciona un país primero";
    return loadingProvinces ? "Cargando provincias..." : "Selecciona provincia";
  }, [countryId, loadingProvinces]
  );
  const cityPH = useMemo(() => {
    if (!provinceId) return "Selecciona una provincia primero";
    return loadingCities ? "Cargando ciudades..." : "Selecciona ciudad";
  }, [provinceId, loadingCities]
  );

  function handleSubmit() {
    // acá armar payload simple; luego lo envías a tu endpoint de creación
    const payload = {
      userProfile: {
        displayName: `${firstName} ${lastName}`,
        bio,
        idAddress: null, // si lo usas
        cityId,
      },
      musician: {
        birthDate,
        skillLevel: experience?.value ?? "intermediate",
        isAvailable: true,
        travelRadiusKm: 10,
        visibility: "city",
        instruments: selectedInstruments.map(i => i.idInstrument),
      }
    };
    console.log("SUBMIT", payload);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStep(1); } }}>
      {/* Dialog pone overlay y deshabilita el fondo automáticamente */}
      <DialogContent className="sm:max-w-[520px] rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()} >
        <DialogHeader>
          <DialogTitle className="text-[#65558F]">Registro Músico</DialogTitle>
          <DialogDescription>3 pasos rápidos</DialogDescription>
        </DialogHeader>

        {/* Pequeño indicador de paso */}
        <div className="mb-2 text-sm text-muted-foreground">Paso {step} de 3</div>

        <Card className="shadow-none border-0">
          <CardContent className="p-0 grid gap-4">
            {err && <div className="text-red-600 text-sm">{err}</div>}

            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Nombre</label>
                  <input className="border rounded-lg p-2 w-full" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Apellido</label>
                  <input className="border rounded-lg p-2 w-full" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Fecha Nacimiento</label>
                  <input type="date" className="border rounded-lg p-2 w-full" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-[#65558F] text-sm">Descripción</label>
                  <textarea className="border rounded-lg p-2 w-full h-20" value={bio} onChange={e => setBio(e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">País</label>
                  <select className="border rounded-lg p-2 w-full"
                    value={countryId}
                    onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingCountries}
                  >
                    <option value="">{countryPH}</option>
                    {countries.map(c => <option key={c.idCountry} value={c.idCountry}>{c.countryDesc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Provincia</label>
                  <select className="border rounded-lg p-2 w-full"
                    value={provinceId}
                    onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : "")}
                    disabled={!countryId || loadingProvinces}
                  >
                    <option value="">{provincePH}</option>
                    {provinces.map(p => <option key={p.idProvince} value={p.idProvince}>{p.provinceDesc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Ciudad</label>
                  <select className="border rounded-lg p-2 w-full"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
                    disabled={!provinceId || loadingCities}
                  >
                    <option value="">{cityPH}</option>
                    {cities.map(c => <option key={c.idCity} value={c.idCity}>{c.cityDesc}</option>)}
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Instrumentos</label>
                  <Select<Instrument, true>
                    isMulti
                    isLoading={loadingInstruments}
                    options={instrumentsRaw}
                    value={selectedInstruments}
                    onChange={(vals: OnChangeValue<Instrument, true>) =>
                      setSelectedInstruments(vals as Instrument[])
                    }
                    getOptionLabel={(i) => i.instrumentName}
                    getOptionValue={(i) => String(i.idInstrument)}
                    placeholder="Selecciona instrumentos"
                    className="text-[#65558F]"
                  />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Nivel de Experiencia</label>
                  <Select
                    options={experienceOptions}
                    value={experience}
                    onChange={(v) => setExperience(v)}
                    placeholder="Selecciona nivel"
                    className="text-[#65558F]"
                  />
                </div>
              </div>
            )}

            {/* Footer botones */}
            <div className="mt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={() => (step === 1 ? onOpenChange(false) : back())}>
                {step === 1 ? "Cancelar" : "Atrás"}
              </Button>
              {step < 3 ? (
                <Button
                  className="bg-[#65558F] hover:bg-[#51447A] text-white"
                  onClick={next}
                  disabled={(step === 1 && !canNextStep1) || (step === 2 && !canNextStep2)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  className="bg-[#65558F] hover:bg-[#51447A] text-white"
                  onClick={() => {
                    const payload = {
                      profile: { displayName: `${firstName} ${lastName}`, bio },
                      musician: {
                        birthDate,
                        skillLevel: experience?.value ?? "intermediate",
                        isAvailable: true,
                        travelRadiusKm: 10,
                        visibility: "city" as Visibility,
                        instruments: selectedInstruments.map(i => ({ idInstrument: i.idInstrument, isPrimary: false }))
                      }
                    };
                    onComplete?.(payload);
                    onOpenChange(false);
                  }}
                  disabled={!canSubmit}
                >
                  Finalizar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};