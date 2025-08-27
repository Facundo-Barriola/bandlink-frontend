"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarEditable } from "@/components/ui/AvatarEditable";
import { CalendarDays, Users, Crown, MapPin, Pencil } from "lucide-react";
import { useUser } from "@/app/context/userContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Api = {
    userData: {
        idUser: number;
        idUserProfile: number;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null;
    musician: {
        idMusician: number;
        experienceYears: number | null;
        skillLevel: string;
        isAvailable: boolean;
        travelRadiusKm: number | null;
        visibility: string;
        birthDate: string | null;
        instruments: { idInstrument: number; instrumentName: string; isPrimary: boolean }[];
        genres: { idGenre: number; genreName: string }[];
    } | null;
    bands: Array<{
        idBand: number;
        name: string;
        description: string | null;
        roleInBand: string | null;
        isAdmin: boolean;
        membersCount: number;
        genres: string[];
    }>;
    eventsCreated: Array<{
        idEvent: number;
        name: string;
        description: string | null;
        startsAt: string;
        endsAt: string | null;
        visibility: string;
        capacityMax: number | null;
    }>;
};


export default function MusicianProfile() {
    const router = useRouter();
    const [data, setData] = useState<Api | null>(null);
    const [loading, setLoading] = useState(true);
    const { user, ready } = useUser();
    const { idUser: idFromRoute } = useParams<{ idUser?: string }>();
    const { idUser: routeId } = useParams<{ idUser?: string }>();

    useEffect(() => {
        if (!ready) return;
        const id = routeId ?? (user?.idUser ? String(user.idUser) : null);
        if (!id || Number.isNaN(Number(id))) {
            setLoading(false);
            return;
        }
        const ac = new AbortController();
        let active = true;
        setLoading(true);

        (async () => {
            try {
                const res = await fetch(`${API_URL}/directory/${id}/profile`, {
                    signal: ac.signal,
                    headers: { Accept: "application/json" },
                    credentials: "include",
                    cache: "no-store",
                });
                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`HTTP ${res.status} - ${txt}`);
                }
                const json = await res.json();
                const payload = (json?.data ?? json) as any;
                if (active) setData({
                    ...payload,
                    userData: payload.user ?? payload.userData ?? null,
                });
            } catch (e) {
                console.error(e);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
            ac.abort();
        }
    }, [ready, idFromRoute, user?.idUser]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6 animate-pulse">
                <div className="h-32 bg-muted rounded-2xl mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-muted rounded-2xl" />
                    <div className="h-64 bg-muted rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!data || !data.userData) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Card className="rounded-2xl shadow">
                    <CardContent className="py-10 text-center">
                        <p className="text-lg">No encontramos el perfil.</p>
                        <Button className="mt-4" onClick={() => router.push(`/home/${data?.userData?.idUser}`)}>
                            Volver al home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { userData, musician, bands, eventsCreated } = data;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <Card className="rounded-2xl">
                <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <AvatarEditable
                        idUser={userData.idUser}
                        displayName={userData.displayName}
                        src={userData.avatarUrl}
                        editable={user?.idUser === userData.idUser}   // solo editable si es tu propio perfil
                        onUploaded={(url) =>
                            setData(prev => prev
                                ? { ...prev, userData: { ...prev.userData!, avatarUrl: url } }
                                : prev)
                        }
                    />

                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className=" text-[#65558F] text-2xl font-semibold">{userData.displayName}</h1>
                            {musician?.isAvailable && (
                                <Badge className="bg-[#65558F] text-white rounded-full">Disponible</Badge>
                            )}
                        </div>
                        {userData.bio && <p className="text-muted-foreground mt-1">{userData.bio}</p>}
                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                            {musician?.experienceYears != null && (
                                <span>{musician.experienceYears} años de experiencia</span>
                            )}
                            {musician && <span>Nivel: {musician.skillLevel}</span>}
                            {musician?.travelRadiusKm != null && (
                                <span>Radio de viaje: {musician.travelRadiusKm} km</span>
                            )}
                            {userData.latitude != null && userData.longitude != null && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin size={16} /> {userData.latitude.toFixed(3)},{userData.longitude.toFixed(3)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button className="bg-[#65558F] text-white" variant="secondary" onClick={() => router.push(`/profile/${userData.idUser}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar Perfil
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Instruments & Genres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-[#65558F]">Instrumentos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {musician?.instruments?.length ? (
                            musician.instruments.map((i) => (
                                <Badge key={`inst-${i.idInstrument}`} variant={i.isPrimary ? "default" : "secondary"}
                                    className="bg-[#65558F] text-white text-sm px-3 py-1 rounded-full leading-5">
                                    {i.instrumentName}{i.isPrimary ? " · Principal" : ""}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-muted-foreground">Sin instrumentos cargados.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-[#65558F]">Géneros</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        {musician?.genres?.length ? (
                            musician.genres.map((g) => (
                                <Badge key={`genre-${g.idGenre}`} variant="outline">
                                    {g.genreName}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-muted-foreground">Sin géneros cargados.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* My Bands */}
            <section>
                <h2 className="text-[#65558F] text-lg font-semibold mb-3">Mis Bandas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {bands.length ? (
                        bands.map((b) => (
                            <Card key={`band-${b.idBand}`} className="rounded-2xl">
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium">{b.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {b.description ?? "Sin descripción"}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                                                <Users size={16} /> {b.membersCount}
                                            </div>
                                            {b.isAdmin && (
                                                <Badge className="inline-flex items-center gap-1">
                                                    <Crown size={14} /> Admin
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {b.genres.map((gn, idx) => (
                                            <Badge key={`band-${b.idBand}-genre-${idx}-${gn}`} variant="outline">
                                                {gn}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {b.roleInBand && (
                                            <Badge variant="secondary">Rol: {b.roleInBand}</Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button size="sm" onClick={() => router.push(`/bands/${b.idBand}`)}>
                                            Ver más
                                        </Button>
                                        {b.isAdmin ? (
                                            <Button size="sm" variant="secondary" onClick={() => router.push(`/bands/${b.idBand}/manage`)}>
                                                Administrar
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => router.push(`/bands/${b.idBand}/leave`)}>
                                                Salir de la banda
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="rounded-2xl">
                            <CardContent className="p-6 text-muted-foreground">
                                Aún no integras ninguna banda.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>

            {/* My Events */}
            <section>
                <h2 className="text-[#65558F] text-lg font-semibold mb-3">Mis Eventos</h2>
                <div className="space-y-4">
                    {eventsCreated.length ? (
                        eventsCreated.map((e) => (
                            <Card key={`event-${e.idEvent}`} className="rounded-2xl">
                                <CardContent className="p-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-medium">{e.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            <CalendarDays className="inline mr-1 h-4 w-4" />
                                            {new Date(e.startsAt).toLocaleString()}{" "}
                                            {e.endsAt ? `— ${new Date(e.endsAt).toLocaleString()}` : ""}
                                        </p>
                                        {e.description && (
                                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                {e.description}
                                            </p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            <Badge variant="outline">{e.visibility}</Badge>
                                            {e.capacityMax != null && (
                                                <Badge variant="secondary">Capacidad: {e.capacityMax}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button size="sm" onClick={() => router.push(`/events/${e.idEvent}`)}>
                                            Ver
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={() => router.push(`/events/${e.idEvent}/edit`)}>
                                            Editar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="rounded-2xl">
                            <CardContent className="p-6 text-muted-foreground">
                                No tienes eventos creados.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>
        </div>
    );
}
