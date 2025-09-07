"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Select, { OnChangeValue } from "react-select";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ✅ NUEVOS tipos/endpoint pensados para el backend actualizado
type UpdateStudioProfilePatch = {
    displayName?: string;
    bio?: string | null;
    legalName?: string | null;
    phone?: string | null;
    website?: string | null;
    cancellationPolicy?: string | null;
    openingHours?: Record<string, any> | null;
    amenities?: number[];
};

async function apiUpdateStudio(studioId: number, patch: UpdateStudioProfilePatch) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/directory/studios/${studioId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (!res.ok || !j?.ok) throw new Error(j?.error || "update_studio_failed");
    return j.data as {
        displayName: string;
        legalName: string | null;
        phone: string | null;
        website: string | null;
        cancellationPolicy: string | null;
        openingHours: any | null;
        amenities: number[] | null;
    };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_LABELS: Record<DayKey, string> = {
    mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo",
};
type OpeningHoursUI = Record<DayKey, Array<[string, string]>>;

type Amenity = { idAmenity: number; amenityName: string };

export default function EditStudioPage() {
    const params = useParams<{ id: string }>(); //aca este es el id del usuario
    const studioId = Number(params.id);
    const { user, ready } = useUser();

    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState<string | null>(null);
    const [legalName, setLegalName] = useState<string | null>(null);
    const [phone, setPhone] = useState<string | null>(null);
    const [website, setWebsite] = useState<string | null>(null);
    const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null);

    const [openingTouched, setOpeningTouched] = useState(false);

    const [openingHours, setOpeningHours] = useState<OpeningHoursUI>({
        mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
    });

    const [amenitiesRaw, setAmenitiesRaw] = useState<Amenity[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
    const [loadingAmenities, setLoadingAmenities] = useState(false);

    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoadingAmenities(true);
                const res = await fetch(`${API_URL}/directory/amenities`, { cache: "no-store" });
                const json = await res.json();
                const data: Amenity[] = (json.data ?? json) as Amenity[];
                if (!mounted) return;
                data.sort((a, b) => a.amenityName.localeCompare(b.amenityName, "es"));
                setAmenitiesRaw(data);
            } finally {
                setLoadingAmenities(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const addRange = (day: DayKey) => {
        setOpeningHours((oh) => ({ ...oh, [day]: [...oh[day], ["09:00", "18:00"]] }));
    };
    const updateRange = (day: DayKey, idx: number, which: 0 | 1, value: string) => {
        setOpeningTouched(true);
        setOpeningHours((oh) => {
            const copy = oh[day].map((r, i) =>
                i === idx ? ([which === 0 ? value : r[0], which === 1 ? value : r[1]]) as [string, string] : r
            );
            return { ...oh, [day]: copy };
        });
    };
    const removeRange = (day: DayKey, idx: number) => {
        setOpeningTouched(true);
        setOpeningHours((oh) => ({ ...oh, [day]: oh[day].filter((_, i) => i !== idx) }));
    };
    const copyDayToAll = (from: DayKey) => {
        setOpeningTouched(true);
        setOpeningHours((oh) => {
            const src = oh[from];
            return { mon: [...src], tue: [...src], wed: [...src], thu: [...src], fri: [...src], sat: [...src], sun: [...src] };
        });
    };
    const clearAll = () => {
        setOpeningTouched(true);
        setOpeningHours({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
    };

    // Placeholder de amenities
    const amenitiesPH = useMemo(
        () => (loadingAmenities ? "Cargando amenidades..." : "Selecciona amenidades"),
        [loadingAmenities]
    );

    function buildOpeningHoursPayload(): Record<string, any> | null {
        const hasAny = (Object.keys(openingHours) as DayKey[]).some((d) => openingHours[d].length > 0);
        return hasAny ? (openingHours as unknown as Record<string, any>) : null;
    }

    async function onSave() {
        if (!ready) return;
        if (!user) { setMsg("Necesitas iniciar sesión."); return; }

        try {
            setSaving(true);
            setMsg(null);
            setErr(null);
            const amenityIds = selectedAmenities.length
                ? Array.from(new Set(selectedAmenities.map((a) => a.idAmenity)))
                : undefined;
            const oh = buildOpeningHoursPayload(); // objeto o null
            const patch: UpdateStudioProfilePatch = {};
            if (displayName.trim()) patch.displayName = displayName.trim();
            if (bio !== undefined) patch.bio = bio ?? null;
            patch.legalName = (legalName ?? "").trim() === "" ? null : (legalName as string);
            patch.phone = (phone ?? "").trim() === "" ? null : (phone as string);
            patch.website = (website ?? "").trim() === "" ? null : (website as string);
            patch.cancellationPolicy = (cancellationPolicy ?? "").trim() === "" ? null : (cancellationPolicy as string);
            if (openingTouched) {
                const oh = buildOpeningHoursPayload(); // objeto o null
                patch.openingHours = oh;               // si no tocó horarios, NO seteamos la clave
            }
            if (amenityIds !== undefined) patch.amenities = amenityIds;

            const r = await apiUpdateStudio(studioId, patch);
            setMsg(`Estudio actualizado: ${r.displayName}`);
        } catch (e: any) {
            setErr(e?.message || "Error actualizando estudio");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 grid gap-6">
            <Card className="shadow-none border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-[#65558F]">Editar Estudio #{studioId}</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-4">
                    {err && <div className="text-red-600 text-sm">{err}</div>}
                    {msg && <div className="text-emerald-700 text-sm">{msg}</div>}

                    {/* Display Name / Bio */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[#65558F] text-sm">Nombre público (displayName)</label>
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[#65558F] text-sm">Sitio web (opcional)</label>
                            <Input value={website ?? ""} onChange={(e) => setWebsite(e.target.value || null)} />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[#65558F] text-sm">Razón social (opcional)</label>
                            <Input value={legalName ?? ""} onChange={(e) => setLegalName(e.target.value || null)} />
                        </div>
                        <div>
                            <label className="text-[#65558F] text-sm">Teléfono (opcional)</label>
                            <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value || null)} />
                        </div>
                        <div>
                            <label className="text-[#65558F] text-sm">Política de cancelación (opcional)</label>
                            <Input
                                value={cancellationPolicy ?? ""}
                                onChange={(e) => setCancellationPolicy(e.target.value || null)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[#65558F] text-sm">Descripción</label>
                        <Textarea
                            value={bio ?? ""}
                            onChange={(e) => setBio(e.target.value || null)}
                            className="min-h-28"
                        />
                    </div>

                    {/* Opening Hours */}
                    <div className="rounded-xl border p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[#65558F] text-sm font-medium">Horarios de apertura</span>
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
                            Podés definir múltiples rangos por día (ej. 10:00–13:00 y 16:00–20:00).
                        </p>
                    </div>

                    {/* Amenities */}
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
                            placeholder={amenitiesPH}
                            className="text-[#65558F]"
                        />
                    </div>

                    {/* Footer */}
                    <div className="mt-1 flex items-center gap-2">
                        <Button variant="ghost" onClick={() => history.back()}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#65558F] hover:bg-[#51447A] text-white"
                            onClick={onSave}
                            disabled={!ready || saving}
                        >
                            Guardar cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* NOTA: la edición de salas irá en otra pantalla, como acordamos */}
        </div>
    );
}
