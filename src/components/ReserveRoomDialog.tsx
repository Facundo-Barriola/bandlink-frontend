"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DoorOpen, Users, DollarSign, Wrench, CalendarPlus,
  Clock, RotateCcw, CalendarDays
} from "lucide-react";

/* ------- Tipos ------- */

export type Room = {
  idRoom: number;
  roomName: string;
  capacity: number | null;
  hourlyPrice: string | number;
  notes: string | null;
  equipment: any; // jsonb flexible
};

type Props = {
  /** Controlado (opcional). Si omitís `open`, usa modo no controlado con trigger via children */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;

  /** Si pasás children, se usa como trigger (DialogTrigger asChild) */
  children?: React.ReactNode;

  rooms: Room[];
  onConfirm: (payload: {
    idRoom: number;
    startsAtIso: string; // ISO UTC
    endsAtIso: string;
    contactNumber: string | null;
  }) => Promise<void> | void;
  onSelectRoom?: (room: Room) => void;

  /** Horarios del estudio (opcional) */
  openingHours?: Record<string, any>;
};

/* ---------------- utils de formato ---------------- */

function formatPrice(value: number | string) {
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num)
    ? `$${(num as number).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / hora`
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

function dateOnlyStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toHM(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndHM(date: Date, hm: string) {
  const [hh, mm] = hm.split(":").map(Number);
  const out = new Date(date);
  out.setHours(hh || 0, mm || 0, 0, 0);
  return out;
}

function addMinutesToHM(hm: string, minutes: number) {
  const [h, m] = hm.split(":").map(Number);
  const total = (h * 60 + m) + minutes;
  const hh = Math.floor((total + 24 * 60) % (24 * 60) / 60);
  const mm = (total + 24 * 60) % (24 * 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/* --------- soporte básico de horarios --------- */

const DAY_ALIASES: Record<string, "mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"> = {
  mon:"mon", monday:"mon", lunes:"mon", lun:"mon",
  tue:"tue", tuesday:"tue", martes:"tue", mar:"tue",
  wed:"wed", wednesday:"wed", miercoles:"wed", "miércoles":"wed", mie:"wed", "mié":"wed",
  thu:"thu", thur:"thu", thurs:"thu", thursday:"thu", jueves:"thu", jue:"thu",
  fri:"fri", friday:"fri", viernes:"fri", vie:"fri",
  sat:"sat", saturday:"sat", sabado:"sat", "sábado":"sat", sab:"sat",
  sun:"sun", sunday:"sun", domingo:"sun", dom:"sun",
};

function dayKeyFromDateLocal(d: Date): keyof typeof DAY_ALIASES {
  return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()] as any;
}

type Iv = { start: string; end: string }; // "HH:mm"

function parseIntervalsForDay(openingHours?: Record<string, any>, dayKey?: string): Iv[] {
  if (!openingHours || !dayKey) return [];
  const normKey =
    DAY_ALIASES[dayKey] ||
    (DAY_ALIASES[(dayKey as string).toLowerCase()] as any) ||
    dayKey;

  const raw = openingHours[normKey] ?? openingHours[dayKey] ?? null;

  const collect = (val: any, push: (iv: Iv)=>void) => {
    if (val == null || val === "" || val === false) return;

    const pushStr = (s: string) => {
      const [a,b] = String(s).split("-").map(x => x?.trim());
      if (/^\d{1,2}:\d{2}$/.test(a||"") && /^\d{1,2}:\d{2}$/.test(b||"")) push({ start:a!, end:b! });
    };
    const pushObj = (o: any) => {
      const a = o?.start ?? o?.from ?? o?.since ?? o?.desde;
      const b = o?.end   ?? o?.to   ?? o?.until ?? o?.hasta;
      if (/^\d{1,2}:\d{2}$/.test(a||"") && /^\d{1,2}:\d{2}$/.test(b||"")) push({ start:a, end:b });
    };
    const pushTuple = (t: any[]) => {
      const a = t?.[0]; const b = t?.[1];
      if (/^\d{1,2}:\d{2}$/.test(a||"") && /^\d{1,2}:\d{2}$/.test(b||"")) push({ start:a, end:b });
    };

    if (typeof val === "string") {
      pushStr(val);
    } else if (Array.isArray(val)) {
      val.forEach(it => {
        if (typeof it === "string") pushStr(it);
        else if (Array.isArray(it)) pushTuple(it);
        else if (typeof it === "object") pushObj(it);
      });
    } else if (typeof val === "object") {
      if (("start" in val) || ("from" in val) || ("desde" in val)) pushObj(val);
      else Object.values(val).forEach(v => {
        if (typeof v === "string") pushStr(v);
        else if (Array.isArray(v)) pushTuple(v as any[]);
        else if (typeof v === "object") pushObj(v);
      });
    }
  };

  const out: Iv[] = [];
  collect(raw, (iv) => out.push(iv));
  return out;
}
function hmToMinutes(hm: string) {
  const [h,m] = hm.split(":").map(Number);
  return (h||0)*60 + (m||0);
}

/* ---------------- componente ---------------- */

export function ReserveRoomDialog({
  open, onOpenChange, children, rooms, onConfirm, onSelectRoom, openingHours
}: Props) {
  // Híbrido controlado/no-controlado
  const [internalOpen, setInternalOpen] = React.useState(false);
  const controlled = typeof open === "boolean";
  const isOpen = controlled ? (open as boolean) : internalOpen;
  const setOpen = controlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const [selectedRoom, setSelectedRoom] = React.useState<Room | null>(null);

  // Día elegido
  const [dateMode, setDateMode] = React.useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = React.useState<string>(dateOnlyStr(new Date()));

  // Horas (solo HH:mm)
  const initStart = toHM(nowLocalRounded(15));
  const initEnd = toHM(new Date(nowLocalRounded(15).getTime() + 60 * 60_000));
  const [startTime, setStartTime] = React.useState<string>(initStart);
  const [endTime, setEndTime] = React.useState<string>(initEnd);

  // Teléfono
  const [contactNumber, setContactNumber] = React.useState<string>("");

  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setSelectedRoom(null);
    const s = nowLocalRounded(15);
    const e = new Date(s.getTime() + 60 * 60_000);
    setStartTime(toHM(s));
    setEndTime(toHM(e));
    setContactNumber("");
    setError(null);
    setSubmitting(false);
    setDateMode("today");
    setCustomDate(dateOnlyStr(new Date()));
  }, [isOpen]);

  // Base date según modo
  function baseDateFromMode() {
    if (dateMode === "tomorrow") {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
    if (dateMode === "custom") {
      const d = new Date(customDate + "T00:00");
      if (!isNaN(+d)) return d;
    }
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const baseDate = baseDateFromMode();

  // Rango Date derivado del día + horas
  const startsAt = combineDateAndHM(baseDate, startTime);
  const endsAt   = combineDateAndHM(baseDate, endTime);

  // Interválica del día (si hay openingHours)
  const dayKey = dayKeyFromDateLocal(baseDate);
  const dayIntervals = parseIntervalsForDay(openingHours, dayKey);

  // min/max sugeridos para inputs de hora
  const minTimeHint = dayIntervals.length ? dayIntervals.map(iv => iv.start).sort()[0] : undefined;
  const maxTimeHint = dayIntervals.length ? dayIntervals.map(iv => iv.end).sort().slice(-1)[0] : undefined;

  // Validaciones
  const digitsOnly = contactNumber.replace(/\D/g, "");
  const phoneOk = digitsOnly.length >= 6;

  const durationMs = endsAt.getTime() - startsAt.getTime();
  const atLeast30 = durationMs >= 30 * 60_000;
  const inOrder = durationMs > 0;

  const withinOpening = React.useMemo(() => {
    if (!openingHours || dayIntervals.length === 0) return true;
    const sMin = hmToMinutes(startTime);
    const eMin = hmToMinutes(endTime);
    return dayIntervals.some(iv => sMin >= hmToMinutes(iv.start) && eMin <= hmToMinutes(iv.end));
  }, [openingHours, dayIntervals, startTime, endTime]);

  const isValid =
    !!selectedRoom &&
    inOrder &&
    atLeast30 &&
    phoneOk &&
    withinOpening;

  const durationHours = Math.max(0, durationMs / 3_600_000);
  const priceNum = typeof selectedRoom?.hourlyPrice === "string"
    ? Number(selectedRoom?.hourlyPrice)
    : (selectedRoom?.hourlyPrice ?? 0);
  const total = Number.isFinite(priceNum) ? Math.max(0, durationHours * (priceNum || 0)) : null;

  // Handlers
  function handlePick(room: Room) {
    setSelectedRoom(room);
    onSelectRoom?.(room);
  }

  function setDurationMinutes(mins: number) {
    setEndTime(addMinutesToHM(startTime, mins));
  }

  function setDay(mode: "today" | "tomorrow" | "custom") {
    setDateMode(mode);
  }

  function onChangeStartTime(val: string) {
    setStartTime(val);
    const s = combineDateAndHM(baseDate, val);
    const e = combineDateAndHM(baseDate, endTime);
    if (e <= s) {
      setEndTime(addMinutesToHM(val, 30));
    }
  }

  async function handleConfirm() {
    if (!isValid || !selectedRoom) {
      setError(
        !phoneOk
          ? "Ingresá un teléfono válido."
          : !withinOpening
          ? "El horario elegido está fuera del horario del estudio."
          : "Seleccioná un rango válido (mínimo 30 minutos)."
      );
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({
        idRoom: selectedRoom.idRoom,
        startsAtIso: new Date(toDatetimeLocalValue(startsAt)).toISOString(),
        endsAtIso: new Date(toDatetimeLocalValue(endsAt)).toISOString(),
        contactNumber: contactNumber.trim() || null,
      });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="max-w-2xl rounded-2xl">
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

        {/* Paso 1: salas */}
        {!selectedRoom && (
          <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
            {rooms.length === 0 && (
              <div className="text-sm text-muted-foreground">Este estudio no tiene salas publicadas.</div>
            )}

            {rooms.map((r) => {
              const eq = summarizeEquipment(r.equipment);
              return (
                <div
                  key={r.idRoom}
                  className="w-full p-3 rounded-xl border hover:bg-muted/60 transition flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-9 w-9 rounded-full grid place-items-center bg-gradient-to-br from-purple-200 to-[#65558F]">
                      <DoorOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
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

                  <Button
                    size="sm"
                    className="bg-[#65558F] text-white hover:bg-[#54487b]"
                    onClick={() => handlePick(r)}
                  >
                    Elegir
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Paso 2: día + horario + teléfono */}
        {selectedRoom && (
          <div className="space-y-5">
            {/* Selector de día */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Día
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={dateMode === "today" ? "default" : "outline"}
                  className={`rounded-full ${dateMode === "today" ? "bg-[#65558F] text-white" : ""}`}
                  onClick={() => setDay("today")}
                >
                  Hoy
                </Button>
                <Button
                  type="button"
                  variant={dateMode === "tomorrow" ? "default" : "outline"}
                  className={`rounded-full ${dateMode === "tomorrow" ? "bg-[#65558F] text-white" : ""}`}
                  onClick={() => setDay("tomorrow")}
                >
                  Mañana
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={dateMode === "custom" ? "default" : "outline"}
                    className={`rounded-full ${dateMode === "custom" ? "bg-[#65558F] text-white" : ""}`}
                    onClick={() => setDay("custom")}
                  >
                    Elegir fecha
                  </Button>
                  {dateMode === "custom" && (
                    <input
                      type="date"
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={customDate}
                      min={dateOnlyStr(new Date())}
                      onChange={(e) => { setCustomDate(e.target.value); setDay("custom"); }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Tramos válidos del día (si hay openingHours) */}
            {openingHours && dayIntervals.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Tramos disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {dayIntervals.map((iv, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setStartTime(iv.start);
                        setEndTime(iv.end);
                      }}
                      className="px-3 py-1.5 rounded-full border hover:bg-muted/60 text-sm"
                      title="Usar este tramo"
                    >
                      {iv.start}–{iv.end}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inicio / Fin (solo hora) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-muted-foreground">Inicio</span>
                <div className="relative">
                  <Clock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="time"
                    className="w-full rounded-md border bg-background pl-9 pr-3 py-2"
                    value={startTime}
                    step={900}
                    min={minTimeHint}
                    max={maxTimeHint}
                    onChange={(e) => onChangeStartTime(e.target.value)}
                  />
                </div>
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-muted-foreground">Fin</span>
                <div className="relative">
                  <Clock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="time"
                    className="w-full rounded-md border bg-background pl-9 pr-3 py-2"
                    value={endTime}
                    step={900}
                    min={startTime}
                    max={maxTimeHint}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {/* Duraciones rápidas */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "30 min", mins: 30 },
                { label: "1 h", mins: 60 },
                { label: "1 h 30", mins: 90 },
                { label: "2 h", mins: 120 },
              ].map(({ label, mins }) => (
                <Button key={label} variant="outline" className="rounded-full h-8 px-3" onClick={() => setDurationMinutes(mins)}>
                  {label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="rounded-full h-8 px-3"
                onClick={() => {
                  setDateMode("today");
                  const s = nowLocalRounded(15);
                  setStartTime(toHM(s));
                  setEndTime(toHM(new Date(s.getTime() + 60 * 60_000)));
                }}
              >
                Ahora +1h
              </Button>
            </div>

            {/* Resumen + validaciones */}
            <div className="rounded-xl border bg-muted/30 p-3 text-sm flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duración: {durationHours > 0 ? `${durationHours.toFixed(2)} h` : "-"}
              </div>
              {total != null && (
                <div>
                  Total estimado: <strong>${total.toLocaleString("es-AR", { maximumFractionDigits: 2 })}</strong>
                </div>
              )}
              {!withinOpening && (
                <div className="text-amber-700">
                  ⚠️ El rango elegido está fuera del horario del estudio.
                </div>
              )}
            </div>

            {/* Teléfono */}
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
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
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
