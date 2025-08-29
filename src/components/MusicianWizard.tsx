"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Select, { OnChangeValue } from "react-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Instrument = { idInstrument: number; instrumentName: string };
type Genre = { idGenre: number; genreName: string }
type Step = 1 | 2 | 3;

type SkillLevel = "beginner" | "intermediate" | "advanced" | "professional";
type ExperienceOption = { value: SkillLevel; label: string };

type Visibility = "city" | "province" | "country" | "global";

type WizardCompletePayload = {
  profile: {
    displayName: string;
    bio: string | null;
    idAddress: number | null; // no lo pedimos en el wizard
    latitude: number | null;
    longitude: number | null;
  };
  musician: {
    birthDate: string;
    experienceYears: number | null
    skillLevel: SkillLevel;
    isAvailable: boolean;
    travelRadiusKm: number;
    visibility: Visibility;
    instruments: { idInstrument: number; isPrimary: boolean }[];
    genres: { idGenre: number }[];
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

  //Perfil básico
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<string>(""); // yyyy-mm-dd
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"musico" | "sala" | null>(null);

  // ——— Geolocalización
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // ——— Instrumentos & Géneros
  const [instrumentsRaw, setInstrumentsRaw] = useState<Instrument[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<Instrument[]>([]);
  const [primaryInstrumentId, setPrimaryInstrumentId] = useState<number | null>(null);
  const [genresRaw, setGenresRaw] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);

  // ——— Config músico
  const [experienceYears, setExperienceYears] = useState<number | "">("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("intermediate");
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [travelRadiusKm, setTravelRadiusKm] = useState<number | "">("");
  const [visibility, setVisibility] = useState<Visibility>("city");

  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const displayName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" "),
    [firstName, lastName]
  );

  const instrumentIds = selectedInstruments.map(i => i.idInstrument);

  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as T;
  }
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted) return;
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setGeoError(null);
        },
        (e) => {
          if (!mounted) return;
          console.error(e);
          setGeoError("No se pudo obtener la ubicación automáticamente.");
        },
        { enableHighAccuracy: true }
      );
    }
    // Instrumentos
    (async () => {
      try {
        setLoadingInstruments(true);
        const data = await apiGet<Instrument[]>("/directory/instruments");
        if (!mounted) return;
        data.sort((a, b) => a.instrumentName.localeCompare(b.instrumentName, "es"));
        setInstrumentsRaw(data);
      } finally {
        setLoadingInstruments(false);
      }
    })();

    // Géneros
    (async () => {
      try {
        setLoadingGenres(true);
        const data = await apiGet<Genre[]>("/directory/genres");
        if (!mounted) return;
        data.sort((a, b) => a.genreName.localeCompare(b.genreName, "es"));
        setGenresRaw(data);
      } finally {
        setLoadingGenres(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (primaryInstrumentId == null) return;
    const stillSelected = selectedInstruments.some((i) => i.idInstrument === primaryInstrumentId);
    if (!stillSelected) setPrimaryInstrumentId(null);
  }, [selectedInstruments, primaryInstrumentId]);

  // —— Validaciones por paso
  const canNextStep1 = displayName.trim().length > 0 && !!birthDate;
  const needPrimary = selectedInstruments.length > 0 && primaryInstrumentId == null;
  const canNextStep2 = selectedInstruments.length > 0 && selectedGenres.length > 0 && !needPrimary;

  const canSubmit = !!skillLevel && !needPrimary;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setStep(1);
      }}
    >
      <DialogContent
        className="sm:max-w-[560px] rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[#65558F]">Registro Músico</DialogTitle>
          <DialogDescription>3 pasos rápidos</DialogDescription>
        </DialogHeader>

        <div className="mb-2 text-sm text-muted-foreground">Paso {step} de 3</div>

        <Card className="shadow-none border-0">
          <CardContent className="p-0 grid gap-4">
            {err && <div className="text-red-600 text-sm">{err}</div>}

            {/* Paso 1: Básico + geolocalización */}
            {step === 1 && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Nombre</label>
                  <input
                    className="border rounded-lg p-2 w-full"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Apellido</label>
                  <input
                    className="border rounded-lg p-2 w-full"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Fecha Nacimiento</label>
                  <input
                    type="date"
                    className="border rounded-lg p-2 w-full"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[#65558F] text-sm">Descripción</label>
                  <textarea
                    className="border rounded-lg p-2 w-full h-20"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 text-xs text-muted-foreground">
                  {geoError
                    ? <span className="text-red-600">{geoError}</span>
                    : latitude != null && longitude != null
                      ? <>Ubicación detectada: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong></>
                      : "Obteniendo ubicación..."}
                </div>
              </section>
            )}

            {/* Paso 2: Instrumentos + principal + géneros */}
            {step === 2 && (
              <section className="grid gap-4">
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

                {selectedInstruments.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-[#65558F] mb-2">Seleccioná el instrumento principal</div>
                    <div className="grid gap-2">
                      {selectedInstruments.map((i) => (
                        <label key={i.idInstrument} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="primaryInstrument"
                            checked={primaryInstrumentId === i.idInstrument}
                            onChange={() => setPrimaryInstrumentId(i.idInstrument)}
                          />
                          <span>{i.instrumentName}</span>
                        </label>
                      ))}
                    </div>
                    {needPrimary && (
                      <div className="text-xs text-red-600 mt-1">Elegí un instrumento principal.</div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-[#65558F] text-sm">Géneros</label>
                  <Select<Genre, true>
                    isMulti
                    isLoading={loadingGenres}
                    options={genresRaw}
                    value={selectedGenres}
                    onChange={(vals: OnChangeValue<Genre, true>) =>
                      setSelectedGenres(vals as Genre[])
                    }
                    getOptionLabel={(g) => g.genreName}
                    getOptionValue={(g) => String(g.idGenre)}
                    placeholder="Selecciona géneros"
                    className="text-[#65558F]"
                  />
                </div>
              </section>
            )}

            {/* Paso 3: Configuración de disponibilidad y experiencia */}
            {step === 3 && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Años de experiencia</label>
                  <input
                    type="number"
                    className="border rounded-lg p-2 w-full"
                    value={typeof experienceYears === "number" ? experienceYears : ""}
                    onChange={(e) =>
                      setExperienceYears(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
                    }
                  />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Nivel</label>
                  <select
                    className="border rounded-lg p-2 w-full"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                  >
                    <option value="beginner">Principiante</option>
                    <option value="intermediate">Intermedio</option>
                    <option value="advanced">Avanzado</option>
                    <option value="professional">Profesional</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isAvailable"
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                  />
                  <label htmlFor="isAvailable" className="text-sm text-[#65558F]">Disponible para tocar</label>
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Radio de viaje (km)</label>
                  <input
                    type="number"
                    className="border rounded-lg p-2 w-full"
                    value={typeof travelRadiusKm === "number" ? travelRadiusKm : ""}
                    onChange={(e) =>
                      setTravelRadiusKm(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))
                    }
                  />
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Visibilidad</label>
                  <select
                    className="border rounded-lg p-2 w-full"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                  >
                    <option value="city">Ciudad</option>
                    <option value="province">Provincia</option>
                    <option value="country">País</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </section>
            )}

            {/* Footer */}
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
                  disabled={!canSubmit}
                  onClick={() => {
                    const instruments = selectedInstruments.map((i) => ({
                      idInstrument: i.idInstrument,
                      isPrimary: i.idInstrument === primaryInstrumentId,
                    }));
                    const genres = selectedGenres.map((g) => ({ idGenre: g.idGenre }));

                    const payload: WizardCompletePayload = {
                      profile: {
                        displayName,
                        bio: bio || null,
                        idAddress: null,
                        latitude,
                        longitude,
                      },
                      musician: {
                        birthDate: birthDate,
                        experienceYears: typeof experienceYears === "number" ? experienceYears : 1,
                        skillLevel,
                        isAvailable,
                        travelRadiusKm: typeof travelRadiusKm === "number" ? travelRadiusKm : 10,
                        visibility,
                        instruments,
                        genres,
                      },
                    };
                    onComplete?.(payload);
                    onOpenChange(false);
                  }}
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
}