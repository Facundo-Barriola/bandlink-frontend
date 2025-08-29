"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, Save, Plus, Star } from "lucide-react";
import { useUser } from "@/app/context/userContext";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Instrument = { idInstrument: number; instrumentName: string; isPrimary: boolean };
type Genre = { idGenre: number; genreName: string };

type Musician = {
    idMusician: number;
    experienceYears: number | null;
    skillLevel: string;
    isAvailable: boolean;
    travelRadiusKm: number | null;
    visibility: string;
    birthDate: string | null;
    instruments: Instrument[];
    genres: Genre[];
};
export type Api = {
    userData: {
        idUser: number;
        idUserProfile: number;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null;
    musician: Musician | null;
};

function normInstruments(arr: any[]): Instrument[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((r: any) => ({
        idInstrument: r.idInstrument ?? r.idinstrument,
        instrumentName: r.instrumentName ?? r.instrumentname,
        isPrimary: r.isPrimary ?? r.isprimary ?? false,
    }));
}
function normGenres(arr: any[]): Genre[] {
    if (!Array.isArray(arr)) return [];
    return arr.map((g: any) => ({
        idGenre: g.idGenre ?? g.idgenre,
        genreName: g.genreName ?? g.genrename ?? g.name,
    }));
}
function normalizeProfilePayload(raw: any): Api {
    const userData = raw.user ?? raw.userData ?? null;
    const musician = raw.musician
        ? {
            idMusician: raw.musician.idMusician ?? raw.musician.idmusician,
            experienceYears: raw.musician.experienceYears ?? raw.musician.experienceyears ?? null,
            skillLevel: raw.musician.skillLevel ?? raw.musician.skilllevel ?? "",
            isAvailable: raw.musician.isAvailable ?? raw.musician.isavailable ?? false,
            travelRadiusKm: raw.musician.travelRadiusKm ?? raw.musician.travelradiuskm ?? 0,
            visibility: raw.musician.visibility ?? "public",
            birthDate: raw.musician.birthDate ?? raw.musician.birthdate ?? null,
            instruments: normInstruments(raw.musician.instruments),
            genres: normGenres(raw.musician.genres),
        }
        : null;
    return { userData, musician } as Api;
}

async function fetchCatalog<T = any>(path: string, signal?: AbortSignal): Promise<T[]> {
    const r = await fetch(`${API_URL}${path}`, { signal, credentials: "include" });
    if (!r.ok) return [];
    const j = await r.json();
    return j?.data ?? j ?? [];
}

export default function MusicianProfileEdit() {
    const router = useRouter();
    const { idUser: idFromRoute } = useParams<{ idUser?: string }>();
    const { user, ready } = useUser();

    const [initial, setInitial] = useState<Api | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [catalogInstruments, setCatalogInstruments] = useState<{ idInstrument: number; instrumentName: string }[]>([]);
    const [catalogGenres, setCatalogGenres] = useState<{ idGenre: number; genreName: string }[]>([]);

    // Estado del formulario
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [isAvailable, setIsAvailable] = useState(false);
    const [experienceYears, setExperienceYears] = useState<number | null>(0);
    const [skillLevel, setSkillLevel] = useState("Principiante");
    const [travelRadiusKm, setTravelRadiusKm] = useState<number>(0);
    const [visibility, setVisibility] = useState("public");
    const [birthDate, setBirthDate] = useState<string | null>(null);
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [genres, setGenres] = useState<Genre[]>([]);

    // ==== Carga inicial ====
    useEffect(() => {
        if (!ready) return;
        if (!user?.idUser) return; // esperar a saber quién sos
        const candidate = user?.idUser ? String(user.idUser) : null;
        const id = candidate && candidate !== "undefined" && candidate !== "null" ? candidate : null;
        if (idFromRoute && Number(idFromRoute) !== user.idUser) {
            router.replace(`/profile/${idFromRoute}`); // ver perfil ajeno sin editar
        }
        if (!id) {
            setLoading(false);
            console.warn("No idUser (ruta ni contexto). ¿Estás logueado o en /profile/[idUser]/edit?");
            return;
        }
        const ac = new AbortController();
        setLoading(true);
        (async () => {
            try {

                // Perfil actual
                const res = await fetch(`${API_URL}/directory/${id}/profile`, {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                    signal: ac.signal,
                    cache: "no-store",
                });
                if (!res.ok) {
                    // 2) Manejo fino de errores comunes
                    if (res.status === 401) {
                        console.warn("401 /directory/:id/profile -> probablemente no hay sesión válida");
                    } else if (res.status === 400) {
                        console.error("400: revisá que 'id' no sea undefined/null. id usado:", id);
                    }
                    throw new Error(`HTTP ${res.status}`);
                }
                const json = await res.json();
                const profile = normalizeProfilePayload(json?.data ?? json);
                setInitial(profile);

                const [ins, /*gen*/] = await Promise.all([
                    fetchCatalog<{ idInstrument: number; instrumentName: string }>("/directory/instruments", ac.signal).catch(() => []),
                    //fetchCatalog<{ idGenre: number; genreName: string }>("/directory/genres", ac.signal).catch(() => []),
                ]);
                setCatalogInstruments(ins);
                //setCatalogGenres(gen);

                // Seed del form
                if (profile.userData) {
                    setDisplayName(profile.userData.displayName ?? "");
                    setBio(profile.userData.bio ?? "");
                }
                if (profile.musician) {
                    setIsAvailable(!!profile.musician.isAvailable);
                    setExperienceYears(profile.musician.experienceYears ?? 0);
                    setSkillLevel(profile.musician.skillLevel || "Principiante");
                    setTravelRadiusKm(profile.musician.travelRadiusKm ?? 0);
                    setVisibility(profile.musician.visibility ?? "public");
                    setBirthDate(profile.musician.birthDate);
                    setInstruments(profile.musician.instruments ?? []);
                    setGenres(profile.musician.genres ?? []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        return () => ac.abort();
    }, [ready, idFromRoute, user?.idUser, router]);

    // ==== Handlers de instrumentos ====
    const primaryIndex = useMemo(() => instruments.findIndex((i) => i.isPrimary), [instruments]);
    function addInstrument(idInstrument: number) {
        const exists = instruments.some((i) => i.idInstrument === idInstrument);
        if (exists) return;
        const found = catalogInstruments.find((c) => c.idInstrument === idInstrument);
        if (!found) return;
        setInstruments((prev) => [
            ...prev,
            { idInstrument, instrumentName: found.instrumentName, isPrimary: prev.length === 0 },
        ]);
    }
    function removeInstrument(idInstrument: number) {
        setInstruments((prev) => {
            const next = prev.filter((i) => i.idInstrument !== idInstrument);
            if (!next.some((i) => i.isPrimary) && next.length) next[0].isPrimary = true;
            return [...next];
        });
    }
    function setPrimary(idInstrument: number) {
        setInstruments((prev) => prev.map((i) => ({ ...i, isPrimary: i.idInstrument === idInstrument })));
    }

    // ==== Handlers de géneros ====
    function addGenre(idGenre: number) {
        if (genres.some((g) => g.idGenre === idGenre)) return;
        const found = catalogGenres.find((g) => g.idGenre === idGenre);
        if (!found) return;
        setGenres((prev) => [...prev, { idGenre, genreName: found.genreName }]);
    }
    function removeGenre(idGenre: number) {
        setGenres((prev) => prev.filter((g) => g.idGenre !== idGenre));
    }

    // ==== Submit ====
    async function onSave() {
        if (!initial?.userData) return;
        try {
            setSaving(true);

            // Payload listo para tu backend (camelCase). Si tu API espera snake_case, mapealo acá.
            const payload = {
                user: {
                    idUser: initial.userData.idUser,
                    displayName: displayName.trim(),
                    bio: bio?.trim() || null,
                },
                musician: initial.musician
                    ? {
                        idMusician: initial.musician.idMusician,
                        experienceYears: experienceYears ?? 0,
                        skillLevel,
                        isAvailable,
                        travelRadiusKm,
                        visibility,
                        birthDate, // ISO (yyyy-mm-dd) o null
                        instruments: instruments.map((i) => ({
                            idInstrument: i.idInstrument,
                            isPrimary: !!i.isPrimary,
                        })),
                        genres: genres.map((g) => ({ idGenre: g.idGenre })),
                    }
                    : null,
            };

            const res = await fetch(`${API_URL}/directory/${initial.userData.idUser}/profile`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Error guardando perfil: ${res.status} - ${txt}`);
            }

            // Volver al perfil
            router.push(`/profile/${initial.userData.idUser}`);
        } catch (e) {
            console.error(e);
            alert("No se pudo guardar. Revisá la consola para más detalles.");
        } finally {
            setSaving(false);
        }
    }

    if (loading || !initial?.userData) {
        return (
            <div className="max-w-5xl mx-auto p-6 animate-pulse">
                <div className="h-32 bg-muted rounded-2xl mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-muted rounded-2xl" />
                    <div className="h-64 bg-muted rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#65558F]">Editar Perfil</h1>
                <div className="flex gap-2">
                    <Button onClick={() => router.push(`/profile/${initial.userData!.idUser}`)} variant="secondary">
                        Cancelar
                    </Button>
                    <Button onClick={onSave} disabled={saving} className="bg-[#65558F] text-white">
                        <Save className="mr-2 h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
                    </Button>
                </div>
            </div>

            {/* Datos básicos */}
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-[#65558F]">Datos básicos</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Nombre para mostrar</Label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Disponibilidad</Label>
                        <div className="flex items-center gap-3">
                            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
                            <span className="text-sm text-muted-foreground">¿Estás disponible?</span>
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Bio</Label>
                        <Textarea value={bio ?? ""} onChange={(e) => setBio(e.target.value)} rows={4} />
                    </div>
                </CardContent>
            </Card>

            {/* Perfil musical */}
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-[#65558F]">Perfil musical</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Años de experiencia</Label>
                        <Input
                            type="number"
                            min={0}
                            value={experienceYears ?? 0}
                            onChange={(e) => setExperienceYears(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Nivel</Label>
                        <select className="w-full border rounded-md h-10 px-3" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
                            <option>Principiante</option>
                            <option>Intermedio</option>
                            <option>Avanzado</option>
                            <option>Profesional</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Radio de viaje (km)</Label>
                        <div className="px-1">
                            <Slider value={[travelRadiusKm]} min={0} max={200} step={5} onValueChange={(v) => setTravelRadiusKm(v[0])} />
                            <div className="text-sm text-muted-foreground mt-1">{travelRadiusKm} km</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Visibilidad</Label>
                        <select className="w-full border rounded-md h-10 px-3" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                            <option value="public">Pública</option>
                            <option value="private">Privada</option>
                            <option value="contacts">Solo contactos</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Fecha de nacimiento</Label>
                        <Input type="date" value={birthDate ?? ""} onChange={(e) => setBirthDate(e.target.value || null)} />
                    </div>
                </CardContent>
            </Card>

            {/* Instrumentos */}
            <Card className="rounded-2xl">
                <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-[#65558F]">Instrumentos</CardTitle>
                    <div className="flex gap-2">
                        <select
                            className="border rounded-md h-10 px-3 min-w-[220px]"
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                if (id) addInstrument(id);
                                e.currentTarget.selectedIndex = 0;
                            }}
                        >
                            <option value="">Agregar instrumento…</option>
                            {catalogInstruments
                                .filter((c) => !instruments.some((i) => i.idInstrument === c.idInstrument))
                                .map((c) => (
                                    <option key={c.idInstrument} value={c.idInstrument}>
                                        {c.instrumentName}
                                    </option>
                                ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {instruments.length === 0 && (
                        <p className="text-muted-foreground">Sin instrumentos cargados.</p>
                    )}
                    {instruments.map((i) => (
                        <div key={`inst-${i.idInstrument}`} className="inline-flex items-center gap-2 border rounded-full pl-2 pr-1 py-1">
                            <Badge className="bg-[#65558F] text-white">{i.instrumentName}</Badge>
                            <button
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${i.isPrimary ? "bg-[#65558F] text-white" : "bg-muted"}`}
                                onClick={() => setPrimary(i.idInstrument)}
                                type="button"
                                title={i.isPrimary ? "Principal" : "Marcar como principal"}
                            >
                                <Star className="h-3 w-3" /> {i.isPrimary ? "Principal" : "Hacer principal"}
                            </button>
                            <button className="p-1" onClick={() => removeInstrument(i.idInstrument)} type="button" title="Quitar">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Géneros */}
            <Card className="rounded-2xl">
                <CardHeader className="flex items-center justify-between">
                    <CardTitle className="text-[#65558F]">Géneros</CardTitle>
                    <div className="flex gap-2">
                        <select
                            className="border rounded-md h-10 px-3 min-w-[220px]"
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                if (id) addGenre(id);
                                e.currentTarget.selectedIndex = 0;
                            }}
                        >
                            <option value="">Agregar género…</option>
                            {catalogGenres
                                .filter((c) => !genres.some((g) => g.idGenre === c.idGenre))
                                .map((c) => (
                                    <option key={c.idGenre} value={c.idGenre}>
                                        {c.genreName}
                                    </option>
                                ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {genres.length === 0 && <p className="text-muted-foreground">Sin géneros cargados.</p>}
                    {genres.map((g) => (
                        <div key={`genre-${g.idGenre}`} className="inline-flex items-center gap-2 border rounded-full pl-2 pr-1 py-1">
                            <Badge variant="outline" className="border-[#65558F] text-[#65558F]">{g.genreName}</Badge>
                            <button className="p-1" onClick={() => removeGenre(g.idGenre)} type="button" title="Quitar">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex justify-end gap-2">
                <Button onClick={() => router.push(`/profile/${initial.userData!.idUser}`)} variant="secondary">
                    Cancelar
                </Button>
                <Button onClick={onSave} disabled={saving} className="bg-[#65558F] text-white">
                    <Save className="mr-2 h-4 w-4" /> {saving ? "Guardando..." : "Guardar"}
                </Button>
            </div>
        </div>
    );
}
