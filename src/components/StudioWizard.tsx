"use client";

import { useEffect, useMemo, useState } from "react";
import Select, { OnChangeValue } from "react-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Step = 1 | 2 | 3 | 4;

type Country = { idCountry: number; countryCode: string; countryDesc: string };
type Province = { idProvince: number; idCountry: number; provinceCode: string; provinceDesc: string };
type City = { idCity: number; idProvince: number; cityDesc: string; postalCode: string };

type Amenity = { idAmenity: number; amenityName: string };
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type OpeningHours = Record<DayKey, Array<[string, string]>>;
type RoomInput = {
  roomName: string;
  capacity?: number | null;
  hourlyPrice: number;
  notes?: string | null;
  equipment?: string[];
  equipmentText?: string;
};

type WizardCompletePayload = {
  profile: {
    displayName: string;
    bio: string | null;
    idAddress: number | null;
    latitude: number | null;
    longitude: number | null;
  };
  studio: {
    legalName?: string | null;
    phone?: string | null;
    website?: string | null;
    cancellationPolicy?: string | null;
    openingHours?: any;
    amenities: { idAmenity: number }[];
    rooms: RoomInput[];
  };
};

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lunes", tue: "Martes", wed: "Miércoles",
  thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo",
};

export default function StudioWizard({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete?: (payload: WizardCompletePayload) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const next = () => setStep((s): Step => (s === 1 ? 2 : s === 2 ? 3 : 4));
  const back = () => setStep((s): Step => (s === 4 ? 3 : s === 3 ? 2 : 1));

  // Estudio
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");

  // Dirección
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryId, setCountryId] = useState<number | "">("");
  const [provinceId, setProvinceId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [street, setStreet] = useState("");
  const [streetNum, setStreetNum] = useState<number | "">("");
  const [addressDesc, setAddressDesc] = useState("");

  // Geo
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Amenities
  const [amenitiesRaw, setAmenitiesRaw] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);

  // Rooms
  const [rooms, setRooms] = useState<RoomInput[]>([
    { roomName: "Sala A", hourlyPrice: 0, capacity: 4, notes: "", equipment: [], equipmentText: "" },
  ]);

  // Loads
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAmenities, setLoadingAmenities] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const [openingHours, setOpeningHours] = useState<OpeningHours>({
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
  });

  function addRange(day: DayKey) {
    setOpeningHours((oh) => ({ ...oh, [day]: [...oh[day], ["09:00", "18:00"]] }));
  }
  function updateRange(day: DayKey, idx: number, which: 0 | 1, value: string) {
    setOpeningHours((oh) => {
      const copy = oh[day].map((r, i) => i === idx ? ([which === 0 ? value : r[0], which === 1 ? value : r[1]]) as [string, string] : r);
      return { ...oh, [day]: copy };
    });
  }
  function removeRange(day: DayKey, idx: number) {
    setOpeningHours((oh) => {
      const copy = oh[day].filter((_, i) => i !== idx);
      return { ...oh, [day]: copy };
    });
  }
  function copyDayToAll(from: DayKey) {
    setOpeningHours((oh) => {
      const src = oh[from];
      return { mon: [...src], tue: [...src], wed: [...src], thu: [...src], fri: [...src], sat: [...src], sun: [...src] };
    });
  }
  function clearAll() {
    setOpeningHours({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  }
  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? json) as T;
  }

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    // Geo
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
        (err) => {
          if (!mounted) return;
          console.error("Geolocation error:", err);
          setGeoError("No se pudo obtener la ubicación automáticamente.");
        },
        { enableHighAccuracy: true }
      );
    }

    // Países
    (async () => {
      try {
        setErr(null);
        setLoadingCountries(true);
        const data = await apiGet<Country[]>("/address/countries");
        if (!mounted) return;
        data.sort((a, b) => a.countryDesc.localeCompare(b.countryDesc, "es"));
        setCountries(data);
        const ar = data.find((c) => c.countryCode?.toUpperCase() === "ARG");
        if (ar) setCountryId(ar.idCountry);
      } catch {
        setErr("No se pudieron cargar los países");
      } finally {
        setLoadingCountries(false);
      }
    })();

    // Amenities
    (async () => {
      try {
        setLoadingAmenities(true);
        const data = await apiGet<Amenity[]>("/directory/amenities");
        if (!mounted) return;
        data.sort((a, b) => a.amenityName.localeCompare(b.amenityName, "es"));
        setAmenitiesRaw(data);
      } finally {
        setLoadingAmenities(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  // Provincias
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

  // Ciudades
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

  // Validaciones
  const canNextStep1 = displayName.trim().length > 0;
  const canNextStep2 =
    countryId &&
    provinceId &&
    cityId &&
    street.trim().length > 0 &&
    typeof streetNum === "number" &&
    !Number.isNaN(streetNum as number);
  const canNextStep3 = true;

  const canSubmit =
    rooms.length > 0 &&
    rooms.every((r) => r.roomName.trim().length > 0 && typeof r.hourlyPrice === "number" && r.hourlyPrice > 0);

  // Placeholders
  const countryPH = useMemo(
    () => (loadingCountries ? "Cargando países..." : "Selecciona país"),
    [loadingCountries]
  );
  const provincePH = useMemo(() => {
    if (!countryId) return "Selecciona un país primero";
    return loadingProvinces ? "Cargando provincias..." : "Selecciona provincia";
  }, [countryId, loadingProvinces]);
  const cityPH = useMemo(() => {
    if (!provinceId) return "Selecciona una provincia primero";
    return loadingCities ? "Cargando ciudades..." : "Selecciona ciudad";
  }, [provinceId, loadingCities]);

  // Helpers rooms
  const addRoom = () =>
    setRooms((r) => [...r, { roomName: "", hourlyPrice: 0, capacity: null, notes: "", equipment: [], equipmentText: "" }]);
  const removeRoom = (idx: number) => setRooms((r) => r.filter((_, i) => i !== idx));

  function normalizeEquipment(raw: string): string[] {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function handleFinish() {
    const amenities = selectedAmenities.map((a) => ({ idAmenity: a.idAmenity }));

    // Convertir los textareas a arrays antes de enviar
    const normalizedRooms: RoomInput[] = rooms.map((r) => {
      const equipment = (r.equipmentText ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        roomName: r.roomName,
        capacity: r.capacity ?? null,
        hourlyPrice: Number(r.hourlyPrice),
        notes: r.notes || null,
        equipment, // ← listo para el backend
      };
    });

    const payload: WizardCompletePayload = {
      profile: {
        displayName,
        bio: bio || null,
        idAddress: null,
        latitude,
        longitude,
      },
      studio: {
        legalName: legalName || null,
        phone: phone || null,
        website: website || null,
        cancellationPolicy: cancellationPolicy || null,
        openingHours,
        amenities,
        rooms: normalizedRooms,
      },
    };

    onComplete?.(payload);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setStep(1);
      }}
    >
      <DialogContent
        className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[#65558F]">Registro de Sala / Estudio</DialogTitle>
          <DialogDescription>4 pasos rápidos</DialogDescription>
        </DialogHeader>

        <div className="mb-2 text-sm text-muted-foreground">Paso {step} de 4</div>

        <Card className="shadow-none border-0">
          <CardHeader className="p-0">
            <CardTitle className="sr-only">Wizard Estudio</CardTitle>
          </CardHeader>
          <CardContent className="p-0 grid gap-4">
            {err && <div className="text-red-600 text-sm">{err}</div>}

            {/* Paso 1: Datos del estudio */}
            {step === 1 && (
              <section className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Nombre público (displayName)</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#65558F] text-sm">Razón social (opcional)</label>
                    <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[#65558F] text-sm">Teléfono (opcional)</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#65558F] text-sm">Sitio web (opcional)</label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[#65558F] text-sm">Política de cancelación (opcional)</label>
                    <Input value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} />
                  </div>
                </div>
                {/* Opening Hours */}
                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#65558F] text-sm font-medium">Horarios de apertura</label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyDayToAll("mon")}>
                        Copiar Lunes a todos
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                        Limpiar
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 max-h-64 overflow-y-auto pr-2">
                    {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => (
                      <div key={day} className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-[#65558F]">{DAY_LABELS[day]}</div>
                          <Button type="button" size="sm" variant="secondary" onClick={() => addRange(day)}>
                            Agregar rango
                          </Button>
                        </div>

                        {openingHours[day].length === 0 ? (
                          <div className="text-xs text-muted-foreground">Sin rangos</div>
                        ) : (
                          <div className="grid gap-2">
                            {openingHours[day].map((rng, idx) => (
                              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                <Input
                                  type="time"
                                  value={rng[0]}
                                  onChange={(e) => updateRange(day, idx, 0, e.target.value)}
                                />
                                <Input
                                  type="time"
                                  value={rng[1]}
                                  onChange={(e) => updateRange(day, idx, 1, e.target.value)}
                                />
                                <Button type="button" variant="ghost" onClick={() => removeRange(day, idx)}>
                                  Quitar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Puedes definir múltiples rangos por día (ej. 10:00–13:00 y 16:00–20:00).
                  </p>
                </div>
                <div>
                  <label className="text-[#65558F] text-sm">Descripción</label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </section>
            )}

            {/* Paso 2: Dirección + geolocalización */}
            {step === 2 && (
              <section className="grid grid-cols-1 gap-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[#65558F] text-sm">País</label>
                    <select
                      className="border rounded-lg p-2 w-full"
                      value={countryId}
                      onChange={(e) => setCountryId(e.target.value ? Number(e.target.value) : "")}
                      disabled={loadingCountries}
                    >
                      <option value="">{countryPH}</option>
                      {countries.map((c) => (
                        <option key={c.idCountry} value={c.idCountry}>
                          {c.countryDesc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[#65558F] text-sm">Provincia</label>
                    <select
                      className="border rounded-lg p-2 w-full"
                      value={provinceId}
                      onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : "")}
                      disabled={!countryId || loadingProvinces}
                    >
                      <option value="">{provincePH}</option>
                      {provinces.map((p) => (
                        <option key={p.idProvince} value={p.idProvince}>
                          {p.provinceDesc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[#65558F] text-sm">Ciudad</label>
                    <select
                      className="border rounded-lg p-2 w-full"
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
                      disabled={!provinceId || loadingCities}
                    >
                      <option value="">{cityPH}</option>
                      {cities.map((c) => (
                        <option key={c.idCity} value={c.idCity}>
                          {c.cityDesc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[#65558F] text-sm">Calle</label>
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[#65558F] text-sm">Altura</label>
                    <Input
                      type="number"
                      value={typeof streetNum === "number" ? streetNum : ""}
                      onChange={(e) => setStreetNum(e.target.value ? Number(e.target.value) : "")}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[#65558F] text-sm">Detalle (piso, dpto, timbre)</label>
                  <Textarea value={addressDesc} onChange={(e) => setAddressDesc(e.target.value)} />
                </div>

                <div className="text-xs text-muted-foreground">
                  {geoError
                    ? <span className="text-red-600">{geoError}</span>
                    : latitude != null && longitude != null
                      ? <>Ubicación detectada: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong></>
                      : "Obteniendo ubicación..."}
                </div>
              </section>
            )}

            {/* Paso 3: Amenities */}
            {step === 3 && (
              <section className="grid gap-4">
                <div>
                  <label className="text-[#65558F] text-sm">Amenidades</label>
                  <Select<Amenity, true>
                    isMulti
                    isLoading={loadingAmenities}
                    options={amenitiesRaw}
                    value={selectedAmenities}
                    onChange={(vals: OnChangeValue<Amenity, true>) => setSelectedAmenities(vals as Amenity[])}
                    getOptionLabel={(a) => a.amenityName}
                    getOptionValue={(a) => String(a.idAmenity)}
                    placeholder="Selecciona amenidades"
                    className="text-[#65558F]"
                  />
                </div>
              </section>
            )}

            {/* Paso 4: Salas */}
            {step === 4 && (
              <section className="grid gap-4">
                {rooms.map((r, idx) => (
                  <div key={idx} className="grid sm:grid-cols-2 gap-3 rounded-xl border p-3">
                    <div>
                      <label className="text-[#65558F] text-sm">Nombre de sala</label>
                      <Input
                        value={r.roomName}
                        onChange={(e) =>
                          setRooms((arr) => arr.map((x, i) => (i === idx ? { ...x, roomName: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[#65558F] text-sm">Capacidad (opcional)</label>
                      <Input
                        type="number"
                        value={typeof r.capacity === "number" ? r.capacity : ""}
                        onChange={(e) =>
                          setRooms((arr) =>
                            arr.map((x, i) =>
                              i === idx ? { ...x, capacity: e.target.value ? Number(e.target.value) : null } : x
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[#65558F] text-sm">Precio por hora</label>
                      <Input
                        type="number"
                        value={r.hourlyPrice}
                        onChange={(e) =>
                          setRooms((arr) =>
                            arr.map((x, i) => (i === idx ? { ...x, hourlyPrice: Number(e.target.value) } : x))
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[#65558F] text-sm">Notas (opcional)</label>
                      <Input
                        value={r.notes ?? ""}
                        onChange={(e) =>
                          setRooms((arr) => arr.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[#65558F] text-sm">Equipos (uno por línea)</label>
                      <Textarea
                        placeholder={"Batería DW\n2 Amplificadores guitarra\nAmplificador bajo\n3x SM58"}
                        value={r.equipmentText ?? (Array.isArray(r.equipment) ? r.equipment.join("\n") : "")}
                        onChange={(e) => {
                          const text = e.target.value;
                          setRooms((prev) => prev.map((room, i) => (i === idx ? { ...room, equipmentText: text } : room)));
                        }}
                        rows={8}
                        className="min-h-32 max-h-64 resize-y"
                        onKeyDown={(e) => e.stopPropagation()}
                        onInput={(e) => {
                          const ta = e.currentTarget;
                          ta.style.height = "auto";
                          ta.style.height = ta.scrollHeight + "px";
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button variant="ghost" onClick={() => removeRoom(idx)}>
                        Eliminar sala
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="secondary" onClick={addRoom}>
                  Agregar sala
                </Button>
              </section>
            )}

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={() => (step === 1 ? onOpenChange(false) : back())}>
                {step === 1 ? "Cancelar" : "Atrás"}
              </Button>
              {step < 4 ? (
                <Button
                  className="bg-[#65558F] hover:bg-[#51447A] text-white"
                  onClick={next}
                  disabled={(step === 1 && !canNextStep1) || (step === 2 && !canNextStep2) || (step === 3 && !canNextStep3)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  className="bg-[#65558F] hover:bg-[#51447A] text-white"
                  onClick={handleFinish}
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
}
