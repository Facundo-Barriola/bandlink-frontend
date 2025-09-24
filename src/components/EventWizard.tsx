"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, CalendarPlus, MapPin, Users, Shield } from "lucide-react";
import LocationCascade from "@/components/LocationCascade";

export type CityOption = { idCity: number; name: string };

export type CreateEventDialogProps = {
    trigger?: React.ReactNode;
    onCreated?: (event: any) => void;
    apiBaseUrl?: string;
    cities?: CityOption[];
};

export default function EventWizard({
    trigger,
    onCreated,
    apiBaseUrl,
    cities,
}: CreateEventDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const API = React.useMemo(
        () => apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
        [apiBaseUrl]
    );

    // form state
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [visibility, setVisibility] = React.useState<"public" | "private">("public");
    const [capacityMax, setCapacityMax] = React.useState<string>("");

    const [idCity, setIdCity] = React.useState<string>("");
    const [street, setStreet] = React.useState("");
    const [streetNum, setStreetNum] = React.useState<string>("");
    const [addressDesc, setAddressDesc] = React.useState("");

    const [startsAtLocal, setStartsAtLocal] = React.useState("");
    const [endsAtLocal, setEndsAtLocal] = React.useState("");

    function resetForm() {
        setName("");
        setDescription("");
        setVisibility("public");
        setCapacityMax("");
        setIdCity("");
        setStreet("");
        setStreetNum("");
        setAddressDesc("");
        setStartsAtLocal("");
        setEndsAtLocal("");
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        // basic validation
        if (!name.trim()) return setError("El nombre es obligatorio.");
        if (!startsAtLocal) return setError("La fecha/hora de inicio es obligatoria.");
        if (!idCity || !street.trim() || !streetNum) {
            return setError("Faltan datos de la dirección (ciudad, calle y número).");
        }

        const startsAtIso = new Date(startsAtLocal).toISOString();
        const endsAtIso = endsAtLocal ? new Date(endsAtLocal).toISOString() : undefined;

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            visibility,
            capacityMax: capacityMax ? Number(capacityMax) : null,
            address: {
                idCity: Number(idCity),
                street: street.trim(),
                streetNum: Number(streetNum),
                addressDesc: addressDesc.trim() || null,
            },
            startsAtIso,
            endsAtIso,
        };

        setLoading(true);
        try {
            const res = await fetch(`${API}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || "Error creando el evento");

            onCreated?.(json.data);
            resetForm();
            setOpen(false);
        } catch (err: any) {
            setError(err.message || "Error inesperado");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button">Nuevo evento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Crear evento</DialogTitle>
                    <DialogDescription>Completa los campos y publicá tu evento.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" placeholder="Jam del viernes" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="visibility" className="flex items-center gap-2">
                                <Shield className="h-4 w-4" /> Visibilidad
                            </Label>
                            <Select value={visibility} onValueChange={(v: "public" | "private") => setVisibility(v)}>
                                <SelectTrigger id="visibility">
                                    <SelectValue placeholder="Seleccioná" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Público</SelectItem>
                                    <SelectItem value="private">Privado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea id="description" placeholder="Contá de qué trata tu evento" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>

                        <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="capacity" className="flex items-center gap-2">
                                <Users className="h-4 w-4" /> Capacidad máxima (opcional)
                            </Label>
                            <Input id="capacity" inputMode="numeric" pattern="[0-9]*" placeholder="50" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value.replace(/[^0-9]/g, ""))} />
                        </div>

                        <div className="md:col-span-2">
                            <Label className="mb-1 block">Ubicación</Label>
                            <LocationCascade
                                apiBaseUrl={API}
                                className="w-full"
                                onChange={(loc) => {
                                    setIdCity(loc.idCity ? String(loc.idCity) : "");
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="street">Calle</Label>
                            <Input id="street" placeholder="Av. Corrientes" value={street} onChange={(e) => setStreet(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="streetNum">Número</Label>
                            <Input id="streetNum" inputMode="numeric" pattern="[0-9]*" placeholder="1234" value={streetNum} onChange={(e) => setStreetNum(e.target.value.replace(/[^0-9]/g, ""))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="addressDesc">Referencia (opcional)</Label>
                            <Input id="addressDesc" placeholder="Piso 2, puerta negra" value={addressDesc} onChange={(e) => setAddressDesc(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="startsAt">Inicio</Label>
                            <Input id="startsAt" type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endsAt">Fin (opcional)</Label>
                            <Input id="endsAt" type="datetime-local" value={endsAtLocal} onChange={(e) => setEndsAtLocal(e.target.value)} />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
                    )}

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="gap-2" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                            Crear evento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
