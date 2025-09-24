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
import {useEventSearch } from "@/hooks/useEventSearch";
import React from "react";
import { FilterButton } from "./ui/FilterButton";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";



export default function Discover() {
    const router = useRouter();
    const { term, setTerm, results, loading } = useMusicianSearch();
    const { termStudio, setTermStudio, resultsStudio, loadingStudio } = useStudioSearch();
    const { termEvents, setTermEvents, resultsSearchEvents, loadingSearchEvents } = useEventSearch();

    const [mode, setMode] = useState<"musico" | "estudio" | "evento">("musico");
    const activeTerm =     mode === "musico" ? term : mode === "estudio" ? termStudio : termEvents;
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
                                switch (mode){
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
                <div className="-mx-2 overflow-x-auto pb-2">
                    <div className="px-2 grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-4">
                        {trending.map((p) => (
                            <Card key={p.id} className="rounded-2xl">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#65558F] to-purple-300" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate text-[#65558F]">{p.name}</h3>
                                        <p className="text-sm text-muted-foreground truncate">
                                            Géneros: {p.genres.join(", ")}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            Buscando: {p.lookingFor}
                                        </p>
                                    </div>
                                    <Button className="bg-[#65558F] text-white hover:bg-[#54487b]">Conectar</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
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
                <SectionHeader title="Salas de ensayo disponibles" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studios.map((s) => (
                        <Card key={s.id} className="rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[#65558F] text-base">{s.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="h-24 rounded-xl bg-muted/70 mb-3 flex items-center justify-center">
                                    <Music2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{s.address}</p>
                                <Button className="bg-[#65558F] text-white hover:bg-[#54487b]">Reservar</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Nuevos músicos */}
            <section className="space-y-3">
                <SectionHeader title="Descubre nuevos músicos" />
                <div className="-mx-2 overflow-x-auto pb-2">
                    <div className="px-2 grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-4">
                        {newMusicians.map((m) => (
                            <Card key={m.id} className="rounded-2xl">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-200 to-[#65558F]" />
                                        <div className="min-w-0">
                                            <h4 className="font-medium truncate">{m.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{m.instruments.join(", ")}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {m.instruments.map((ins, idx) => (
                                            <Badge key={idx} variant="secondary" className="bg-[#65558F] text-white">{ins}</Badge>
                                        ))}
                                    </div>
                                    <Button variant="secondary" onClick={() => router.push(`/profile/${m.id}`)}>Ver perfil</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Paginación simple */}
                <div className="flex items-center justify-between pt-2">
                    <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" /> Anterior
                    </button>
                    <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        Siguiente <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
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
