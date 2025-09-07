"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/app/context/userContext";
import { useParams } from "next/navigation";
import { apiEditRoom, type EditRoomPayload } from "@/lib/api/directory";

type EditRoomInitial = {
    idUser?: number;
    idRoom?: number;
    roomName?: string;
    capacity?: number | null;
    hourlyPrice?: number | null;
    equipment?: string[]; // se mostrará como textarea (una línea por ítem)
    notes?: string | null;
};

export default function EditRoom({
    initial,
    onCancel,
    onSubmit,
}: {
    initial?: EditRoomInitial;
    onCancel?: () => void;
    onSubmit?: (payload: {
        idUser?: number;
        idRoom?: number;
        roomName?: string;
        capacity?: number | null;
        hourlyPrice?: number | null;
        equipment: string[] | null;
        notes?: string | null;
    }) => void;
}) {

    const { user, ready } = useUser();
    const params = useParams<{ id: string }>();
    const [idRoom, setIdRoom] = useState<number | undefined>(initial?.idRoom);
    const [roomName, setRoomName] = useState<string>(initial?.roomName ?? "");
    const [capacity, setCapacity] = useState<number | null>(
        typeof initial?.capacity === "number" ? initial!.capacity! : null
    );
    const [hourlyPrice, setHourlyPrice] = useState<number | null>(
        typeof initial?.hourlyPrice === "number" ? initial!.hourlyPrice! : null
    );
    const [equipmentText, setEquipmentText] = useState<string>(
        Array.isArray(initial?.equipment) ? initial!.equipment!.join("\n") : ""
    );
    const [notes, setNotes] = useState<string | null>(initial?.notes ?? "");


    const normalizeEquipment = (txt: string): string[] | null => {
        const items = txt
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        return items.length ? items : null;
    };

    const handleSave = async () => {
        console.log("handleSave", { idRoom, roomName, capacity, hourlyPrice, equipmentText }, user?.idUser, params.id);
        if (!ready) return;

        const payload: EditRoomPayload = {
            roomName: roomName.trim() || null,
            capacity: capacity == null || Number.isNaN(capacity) ? null : Number(capacity),
            hourlyPrice: hourlyPrice == null || Number.isNaN(hourlyPrice) ? null : Number(hourlyPrice),
            notes: notes?.trim() ? notes : null,
            equipment: normalizeEquipment(equipmentText), // ← array de strings o null
        };
        try {
            const updated = await apiEditRoom(Number(params.id), payload);
            console.log("Sala actualizada", updated);
        } catch (e: any) {
            console.error("Error editando sala:", e?.message || e);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4">
            <Card className="shadow-none border rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-[#65558F]">
                        {idRoom ? `Editar Sala #${idRoom}` : "Editar Sala"}
                    </CardTitle>
                </CardHeader>

                <CardContent className="grid gap-4">

                    {/* Nombre */}
                    <div className="grid sm:grid-cols-[200px_1fr] items-center gap-3">
                        <label className="text-[#65558F] text-sm">Nombre de la sala</label>
                        <Input
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Sala A / Sala Principal"
                        />
                    </div>

                    {/* Capacidad y Precio */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="grid sm:grid-cols-[200px_1fr] items-center gap-3">
                            <label className="text-[#65558F] text-sm">Capacidad (opcional)</label>
                            <Input
                                type="number"
                                value={capacity ?? ""}
                                onChange={(e) =>
                                    setCapacity(e.target.value === "" ? null : Number(e.target.value))
                                }
                                placeholder="Ej: 5"
                            />
                        </div>

                        <div className="grid sm:grid-cols-[200px_1fr] items-center gap-3">
                            <label className="text-[#65558F] text-sm">
                                Precio por hora (banda)
                            </label>
                            <Input
                                type="number"
                                value={hourlyPrice ?? ""}
                                onChange={(e) =>
                                    setHourlyPrice(
                                        e.target.value === "" ? null : Number(e.target.value)
                                    )
                                }
                                placeholder="Ej: 8000"
                            />
                        </div>
                    </div>

                    {/* Equipamiento (textarea multilinea) */}
                    <div className="grid gap-2">
                        <label className="text-[#65558F] text-sm">
                            Equipamiento
                        </label>
                        <Textarea
                            value={equipmentText}
                            onChange={(e) => setEquipmentText(e.target.value)}
                            rows={8}
                            className="min-h-32 max-h-64 resize-y"
                            placeholder={"Batería DW\n2 amplificadores de guitarra\nAmplificador de bajo\n3x Shure SM58"}
                            onKeyDown={(e) => e.stopPropagation()}
                            onInput={(e) => {
                                const ta = e.currentTarget;
                                ta.style.height = "auto";
                                ta.style.height = ta.scrollHeight + "px";
                            }}
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-[#65558F] text-sm">
                            Notas
                        </label>
                        <Textarea
                            value={notes ?? ""}
                            onChange={(e) => setEquipmentText(e.target.value)}
                            rows={8}
                            className="min-h-32 max-h-64 resize-y"
                            placeholder={"Notas"}
                            onKeyDown={(e) => e.stopPropagation()}
                            onInput={(e) => {
                                const ta = e.currentTarget;
                                ta.style.height = "auto";
                                ta.style.height = ta.scrollHeight + "px";
                            }}
                        />
                    </div>

                    {/* Footer */}
                    <div className="mt-2 flex items-center gap-2">
                        <Button variant="ghost" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#65558F] hover:bg-[#51447A] text-white"
                            onClick={handleSave}
                        >
                            Guardar cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
