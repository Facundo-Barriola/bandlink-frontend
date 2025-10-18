"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    SlidersHorizontal,
    MapPin,
    CalendarDays,
    Users,
    ChevronLeft,
    ChevronRight,
    Music2,
} from "lucide-react";
import { useStudioSearch } from "@/hooks/useStudioSearch";
import { useMusicianSearch } from "@/hooks/useMusicianSearch";
import { useDiscoverEvents } from "@/hooks/useDiscoverEvents";
import { useEventSearch } from "@/hooks/useEventSearch";
import { useDiscoverBands } from "@/hooks/useDiscoverBands";
import { useDiscoverStudios } from "@/hooks/useDiscoverStudios";
import { useDiscoverMusicians } from "@/hooks/useDiscoverMusicians";
import React from "react";
import { FilterButton } from "./ui/FilterButton";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";



export default function Discover() {
    const router = useRouter();
    const { term, setTerm, results, loading } = useMusicianSearch();
    const { termStudio, setTermStudio, resultsStudio, loadingStudio } = useStudioSearch();
    const { termEvents, setTermEvents, resultsSearchEvents, loadingSearchEvents } = useEventSearch();

    const [mode, setMode] = useState<"musico" | "estudio" | "evento">("musico");
    const activeTerm = mode === "musico" ? term : mode === "estudio" ? termStudio : termEvents;
    const isLoading = mode === "musico" ? loading : mode === "estudio" ? loadingStudio : loadingSearchEvents;
    const suggestions = (
        mode === "musico"
            ? results.map(m => ({
                key: `m-${m.idUser}`,
                label: m.displayName,
                onClick: () => {
                    router.push(`/profile/${m.idUser}`);
                    setTerm("");
                },
            }))
            : mode === "estudio"
                ? resultsStudio.map(s => ({
                    key: `s-${s.idUser}`,
                    label: s.displayName,
                    onClick: () => {
                        router.push(`/profile/${s.idUser}`);
                        setTermStudio("");
                    },
                }))
                : resultsSearchEvents.map(e => ({
                    key: `e-${e.idEvent}`,
                    label: e.name,
                    onClick: () => {
                        router.push(`/events/${e.idEvent}`);
                        setTermEvents(""); // limpiar
                    },
                }))
    );

    const { items: events, loading: loadingEvents, error: errorEvents } = useDiscoverEvents({ limit: 8, days: 60 });
    const { items: bands, loading: loadingBands } = useDiscoverBands(12);
    const { items: studiosR, loading: loadingStudiosR } = useDiscoverStudios(9);
    const { items: people, loading: loadingPeople } = useDiscoverMusicians(12);
    const trending = Array.from({ length: 6 }).map((_, i) => ({
        id: i + 1,
        name: "Band Name",
        lookingFor: "Bajista",
        genres: ["Rock", "Metal"],
    }));


    const studios = Array.from({ length: 4 }).map((_, i) => ({
        id: i + 1,
        name: "Studio Name",
        address: "Dirección, Ciudad",
    }));

    const newMusicians = Array.from({ length: 8 }).map((_, i) => ({
        id: i + 1,
        name: i % 2 ? "Adrián González" : "Micaela Solís",
        instruments: i % 2 ? ["Bajo"] : ["Saxo", "Trompeta"],
    }));

    function toDayHM(iso: string) {
        const d = new Date(iso);
        const dd = d.toLocaleDateString("es-AR");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${dd} ${hh}:${mm}`;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Buscar */}
            <section>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

                        {/* INPUT controlado por el hook activo */}
                        <input
                            value={activeTerm}
                            onChange={(e) => {
                                const v = e.target.value;
                                switch (mode) {
                                    case "musico":
                                        setTerm(v);
                                        break;
                                    case "estudio":
                                        setTermStudio(v);
                                        break;
                                    case "evento":
                                        setTermEvents(v);
                                        break;
                                }
                            }}
                            placeholder={
                                mode === "musico"
                                    ? "Descubre músicos cerca de ti"
                                    : "Busca estudios de ensayo"
                            }
                            className="w-full rounded-full pl-10 pr-12 py-3 bg-muted/60 focus:outline-none focus:ring-2 focus:ring-[#65558F] placeholder:text-muted-foreground"
                        />

                        {/* Dropdown resultados */}
                        {activeTerm.trim().length >= 2 && (
                            <div className="absolute z-20 mt-2 w-full bg-background rounded-2xl shadow-lg border p-2">
                                {isLoading && (
                                    <div className="p-3 text-sm text-muted-foreground">Buscando…</div>
                                )}

                                {!isLoading && suggestions.length === 0 && (
                                    <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
                                )}

                                {!isLoading &&
                                    suggestions.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                item.onClick();
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted/60 flex items-center gap-3"
                                        >
                                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-200 to-[#65558F]" />
                                            <div className="min-w-0">
                                                <div className="font-medium text-[#65558F] truncate">
                                                    {item.label}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        )}

                        {/* Botón de filtro (musico/estudio) */}
                        <FilterButton value={mode} onChange={setMode} />
                    </div>
                </div>
            </section>

            {/* Proyectos en tendencia */}
            <section className="space-y-3">
                <SectionHeader title="Proyectos en tendencia que buscan músicos" />
                {loadingBands && <div className="text-sm text-muted-foreground">Cargando…</div>}
                {!loadingBands && bands.length === 0 && <div className="text-sm text-muted-foreground">No hay búsquedas activas por ahora.</div>}
                {!loadingBands && bands.length > 0 && (
                    <div className="-mx-2 overflow-x-auto pb-2">
                        <div className="px-2 grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4">
                            {bands.map((b) => (
                                <Card key={b.idSearch} className="rounded-2xl">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#65558F] to-purple-300" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium truncate text-[#65558F]">{b.bandName}</h3>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {b.title}{b.instrumentName ? ` · ${b.instrumentName}` : ""}
                                            </p>
                                            {b.dist_km != null && (
                                                <p className="text-xs text-muted-foreground">{b.dist_km.toFixed(1)} km</p>
                                            )}
                                        </div>
                                        <Button className="bg-[#65558F] text-white hover:bg-[#54487b]"
                                            onClick={() => router.push(`/bands/${b.idBand}`)}
                                        >
                                            Ver banda
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Eventos cercanos */}
            {/* Eventos cercanos (reales) */}
            <section className="space-y-3">
                <SectionHeader
                    title="Eventos cercanos"
                    action={
                        <button className="text-sm text-[#65558F] hover:underline" onClick={() => router.push("/map")}>
                            Ver mapa
                        </button>
                    }
                />

                {loadingEvents && <div className="text-sm text-muted-foreground">Cargando eventos…</div>}
                {errorEvents && <div className="text-sm text-destructive">{errorEvents}</div>}

                {!loadingEvents && events.length === 0 && (
                    <div className="text-sm text-muted-foreground">No hay recomendaciones por ahora.</div>
                )}

                {!loadingEvents && events.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {events.map((e) => (
                            <Card key={e.idEvent} className="rounded-2xl overflow-hidden">
                                <div className="h-40 bg-gradient-to-br from-neutral-800 to-neutral-600" />
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-medium text-[#65558F]">{e.name}</h3>
                                        <Badge variant={e.visibility === "private" ? "secondary" : "default"}>
                                            {e.visibility === "private" ? "Privado" : "Público"}
                                        </Badge>
                                    </div>

                                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarDays className="h-4 w-4" /> {toDayHM(e.startsAt)}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            {e.dist_km != null ? `${e.dist_km.toFixed(1)} km` : "En tu zona"}
                                        </span>
                                    </div>

                                    {e.description && (
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                                    )}

                                    <div className="mt-3 flex items-center gap-2">
                                        <Badge variant="secondary" title="Afinidad por géneros">
                                            🎧 {(e.genre_score * 100).toFixed(0)}%
                                        </Badge>
                                        <Badge variant="secondary" title="Proximidad">
                                            📍 {(e.proximity_score * 100).toFixed(0)}%
                                        </Badge>
                                        <Badge variant="secondary" title="Popularidad">
                                            ⭐ {(e.popularity_score * 100).toFixed(0)}%
                                        </Badge>
                                    </div>

                                    <div className="mt-3">
                                        <Button onClick={() => router.push(`/events/${e.idEvent}`)}>Ver evento</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Salas de ensayo */}
            <section className="space-y-3">
                <SectionHeader title="Salas de ensayo recomendadas" />
                {loadingStudiosR && <div className="text-sm text-muted-foreground">Cargando…</div>}
                {!loadingStudiosR && studiosR.length === 0 && <div className="text-sm text-muted-foreground">No hay sugerencias por ahora.</div>}
                {!loadingStudiosR && studiosR.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {studiosR.map((s) => (
                            <Card key={s.idUser} className="rounded-2xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[#65558F] text-base">{s.displayName}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="h-24 rounded-xl bg-muted/70 mb-3 flex items-center justify-center">
                                        <Music2 className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {s.dist_km != null ? `${s.dist_km.toFixed(1)} km · ` : ""}⭐ {s.rating_avg?.toFixed(1) ?? "—"} ({s.rating_cnt})
                                    </p>
                                    <Button className="bg-[#65558F] text-white hover:bg-[#54487b]"
                                        onClick={() => router.push(`/profile/${s.idUser}`)}
                                    >
                                        Ver sala
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Nuevos músicos */}
            <section className="space-y-3">
                <SectionHeader title="Conectá con músicos afines" />
                {loadingPeople && <div className="text-sm text-muted-foreground">Cargando…</div>}
                {!loadingPeople && people.length === 0 && <div className="text-sm text-muted-foreground">Sin recomendaciones por ahora.</div>}
                {!loadingPeople && people.length > 0 && (
                    <div className="-mx-2 overflow-x-auto pb-2">
                        <div className="px-2 grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-4">
                            {people.map((m) => (
                                <Card key={m.idMusician} className="rounded-2xl">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-200 to-[#65558F]" />
                                            <div className="min-w-0">
                                                <h4 className="font-medium truncate">{m.displayName}</h4>
                                                {m.dist_km != null && <p className="text-xs text-muted-foreground">{m.dist_km.toFixed(1)} km</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary">🎧 {m.genre_matches} géneros en común</Badge>
                                            <Badge variant="secondary">🎸 {m.inst_matches} instrumentos en común</Badge>
                                        </div>
                                        <div className="mt-3">
                                            <Button variant="secondary" onClick={() => router.push(`/profile/${m.idUser}`)}>Ver perfil</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-[#65558F] text-lg font-semibold">{title}</h2>
            {action}
        </div>
    );
}
