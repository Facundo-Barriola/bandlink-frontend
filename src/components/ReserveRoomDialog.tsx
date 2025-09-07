"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DoorOpen, Users, DollarSign, Wrench, CalendarPlus, Clock, RotateCcw } from "lucide-react";

export type Room = {
  idRoom: number;
  roomName: string;
  capacity: number | null;
  hourlyPrice: string | number;
  notes: string | null;
  equipment: any; // jsonb flexible
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rooms: Room[];
  onConfirm: (payload: {
    idRoom: number;
    startsAtIso: string;       // ISO UTC
    endsAtIso: string;
    contactNumber: string|null; // << nuevo
  }) => void;
  onSelectRoom?: (room: Room) => void;
};

function formatPrice(value: number | string) {
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num)
    ? `$${num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / hora`
    : String(value);
}

function summarizeEquipment(equipment: any): string | null {
  if (!equipment) return null;
  if (Array.isArray(equipment)) {
    const items = equipment.slice(0, 3).map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    return items.length ? items.join(", ") + (equipment.length > 3 ? "…" : "") : null;
  }
  if (typeof equipment === "object") {
    const keys = Object.keys(equipment);
    const head = keys.slice(0, 3).join(", ");
    return keys.length ? head + (keys.length > 3 ? "…" : "") : null;
  }
  return String(equipment);
}

function nowLocalRounded(minutes = 15) {
  const d = new Date();
  const ms = minutes * 60_000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}
function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromDatetimeLocal(val: string | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ReserveRoomDialog({ open, onOpenChange, rooms, onConfirm, onSelectRoom }: Props) {
  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);
  const [startVal, setStartVal] = React.useState<string>(toDatetimeLocalValue(nowLocalRounded(15)));
  const [endVal, setEndVal] = React.useState<string>(toDatetimeLocalValue(new Date(nowLocalRounded(15).getTime() + 60 * 60_000)));
  const [contactNumber, setContactNumber] = React.useState<string>(""); // << nuevo
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // reset al abrir
  React.useEffect(() => {
    if (!open) return;
    setSelectedRoom(null);
    const s = nowLocalRounded(15);
    const e = new Date(s.getTime() + 60 * 60_000);
    setStartVal(toDatetimeLocalValue(s));
    setEndVal(toDatetimeLocalValue(e));
    setContactNumber(""); // << reset
    setError(null);
    setSubmitting(false);
  }, [open]);

  const startsAt = fromDatetimeLocal(startVal);
  const endsAt = fromDatetimeLocal(endVal);

  const digitsOnly = contactNumber.replace(/\D/g, "");
  const phoneOk = digitsOnly.length >= 6; // validación simple

  const isValid = (() => {
    if (!selectedRoom) return false;
    if (!startsAt || !endsAt) return false;
    if (endsAt <= startsAt) return false;
    const minMinutes = 30;
    if ((endsAt.getTime() - startsAt.getTime()) < minMinutes * 60_000) return false;
    if (!phoneOk) return false; // << requerimos teléfono simple
    return true;
  })();

  const durationHours = startsAt && endsAt ? (endsAt.getTime() - startsAt.getTime()) / 3_600_000 : 0;
  const priceNum = typeof selectedRoom?.hourlyPrice === "string"
    ? Number(selectedRoom?.hourlyPrice)
    : (selectedRoom?.hourlyPrice ?? 0);
  const total = Number.isFinite(priceNum) ? Math.max(0, durationHours * (priceNum || 0)) : null;

  function handlePick(room: Room) {
    setSelectedRoom(room);
    onSelectRoom?.(room);
  }

  function handleConfirm() {
    if (!isValid || !selectedRoom || !startsAt || !endsAt) {
      setError(!phoneOk ? "Ingresá un teléfono válido." : "Seleccioná una sala y un rango válido (mínimo 30 minutos).");
      return;
    }
    setSubmitting(true);
    onConfirm({
      idRoom: selectedRoom.idRoom,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      contactNumber: contactNumber.trim() || null, // << enviamos al backend
    });
    setSubmitting(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#65558F] flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {selectedRoom ? "Elegí fecha, horario y contacto" : "Elegí una sala de ensayo"}
          </DialogTitle>
          <DialogDescription>
            {selectedRoom
              ? <>Sala seleccionada: <strong>{selectedRoom.roomName}</strong></>
              : "Seleccioná la sala para continuar con la reserva."}
          </DialogDescription>
        </DialogHeader>

        {/* Paso 1: lista de salas */}
        {!selectedRoom && (
          <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
            {rooms.length === 0 && (
              <div className="text-sm text-muted-foreground">Este estudio no tiene salas publicadas.</div>
            )}

            {rooms.map((r) => {
              const eq = summarizeEquipment(r.equipment);
              return (
                <button
                  key={r.idRoom}
                  type="button"
                  onClick={() => handlePick(r)}
                  className="w-full text-left p-3 rounded-xl border hover:bg-muted/60 transition flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-purple-200 to-[#65558F]">
                      <DoorOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{r.roomName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-4 w-4" /> Capacidad: {r.capacity ?? "-"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="h-4 w-4" /> {formatPrice(r.hourlyPrice)}
                        </span>
                        {eq && (
                          <span className="inline-flex items-center gap-1">
                            <Wrench className="h-4 w-4" /> {eq}
                          </span>
                        )}
                      </div>
                      {r.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.notes}</p>}
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-[#65558F] text-white hover:bg-[#54487b]">Elegir</Button>
                </button>
              );
            })}
          </div>
        )}

        {/* Paso 2: fecha/hora + teléfono */}
        {selectedRoom && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-muted-foreground">Inicio</span>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border bg-background p-2"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                  min={toDatetimeLocalValue(nowLocalRounded(15))}
                  step={900}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-muted-foreground">Fin</span>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border bg-background p-2"
                  value={endVal}
                  onChange={(e) => setEndVal(e.target.value)}
                  min={startVal}
                  step={900}
                />
              </label>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duración: {durationHours > 0 ? `${durationHours.toFixed(2)} h` : "-"}
              {total != null && (
                <span className="ml-3">
                  Total estimado: <strong>${total.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</strong>
                </span>
              )}
            </div>

            {/* Teléfono de contacto */}
            <label className="text-sm block">
              <span className="block mb-1 text-muted-foreground">Teléfono de contacto</span>
              <input
                type="tel"
                inputMode="tel"
                placeholder="Ej: 11 5555-1234"
                className="w-full rounded-md border bg-background p-2"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Lo verá el estudio para coordinar la reserva.
              </span>
            </label>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedRoom(null);
                  setError(null);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Cambiar sala
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-[#65558F] text-white"
            onClick={selectedRoom ? handleConfirm : undefined}
            disabled={selectedRoom ? (!isValid || submitting) : true}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
