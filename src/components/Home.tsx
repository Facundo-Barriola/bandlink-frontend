"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Send,
  Star,
  Music2,
  CalendarDays,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Clock,
  ReceiptText,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { BandWizard } from "@/components/BandWizard";
import { PayBookingButton } from "./PayBookingButton";
import FriendsDialogButton from "@/components/FriendsDialogButton";
import CancelBookingButton from "@/components/CancelBookingButton";
import RescheduleBookingDialog from "@/components/RescheduleBookingDialog";
import EventWizard from "./EventWizard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiResponseMusician = {
  ok: true;
  role: "musician";
  data: Array<{
    idBooking: number;
    startsAt: string;
    endsAt: string;
    startsOn: string;
    confirmationCode: string | null;
    totalAmount: number | null;
    phone: string | null;
    displayName: string;
    street: string | null;
    streetNum: number | null;
    paymentStatus: string | null;
  }>;
};

type ApiResponseStudio = {
  ok: true;
  role: "studio";
  data: Array<{
    idBooking: number;
    startsAt: string;
    endsAt: string;
    confirmationCode: string | null;
    totalAmount: number | null;
    contactNumber: string | null;
    displayName: string;
  }>;
};

type ApiResponse = ApiResponseMusician | ApiResponseStudio;

type BookingVM = {
  idBooking: number;
  day: string;
  from: string;
  to: string;
  place: string;
  address?: string | null;
  contactNumber?: string | null;
  confirmationCode?: string | null;
  totalAmount?: number | null;
  paymentStatus?: string | null;
  startsAtIso: string;
  endsAtIso: string;
};

const primary = "bg-[#65558F] hover:bg-[#51447A] text-white";

function toTimeHM(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function moneyAR(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
}

function toDayDMY(isoOrDate: string) {
  const d = new Date(isoOrDate);
  return d.toLocaleDateString("es-AR");
}

function prettyPaymentStatus(s?: string | null) {
  if (!s) return null;
  const lower = s.toLowerCase();
  if (["approved", "paid", "completed"].includes(lower)) return "pagado";
  if (["pending", "in_process"].includes(lower)) return "pendiente";
  if (["rejected", "cancelled", "voided"].includes(lower)) return "rechazado";
  return lower;
}

function isPaidStatus(s?: string | null) {
  if (!s) return false;
  const lower = s.toLowerCase();
  return ["approved", "paid", "completed"].includes(lower);
}

const nowMs = () => Date.now();
const isFutureByEnd = (endsAtIso: string) => new Date(endsAtIso).getTime() >= nowMs();

type Suggestion = { id: string; name: string; roles: string };

type Review = { id: string; author: string; rating: number; text: string };

function PaymentStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const txt = prettyPaymentStatus(status);
  const lower = status.toLowerCase();
  const cls =
    ["approved", "paid", "completed"].includes(lower)
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : ["pending", "in_process"].includes(lower)
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <Badge className={`rounded-full border ${cls}`}>{txt}</Badge>
  );
}

export default function HomePage() {
  const stats = useMemo(
    () => [
      { id: "c", label: "Conexiones activas", value: 5, Icon: Users },
      { id: "s", label: "Solicitudes enviadas", value: 3, Icon: Send },
      { id: "r", label: "Valoración general", value: 4.5, Icon: Star },
      { id: "p", label: "Proyectos activos", value: 2, Icon: Music2 },
    ],
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"musician" | "studio" | null>(null);
  const [bookings, setBookings] = useState<BookingVM[]>([]);
  const { user } = useUser();
  const meId = user?.idUser ?? 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API}/booking?limit=10&offset=0`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!json.ok) throw new Error("Respuesta no OK");
        if (!alive) return;

        setRole(json.role);
        if (json.role === "musician") {
          const mapped = json.data.map((it) => ({
            idBooking: it.idBooking,
            day: toDayDMY(it.startsOn ?? it.startsAt),
            from: toTimeHM(it.startsAt),
            to: toTimeHM(it.endsAt),
            place: it.displayName,
            address: it.street && it.streetNum != null ? `${it.street} ${it.streetNum}` : it.street ?? null,
            confirmationCode: it.confirmationCode ?? null,
            totalAmount: it.totalAmount ?? null,
            paymentStatus: it.paymentStatus ?? null,
            startsAtIso: it.startsAt,
            endsAtIso: it.endsAt,
          }))
            .filter((x) => isFutureByEnd(x.endsAtIso))
            .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
          setBookings(mapped);
        } else {
          const mapped = json.data.map((it) => ({
            idBooking: it.idBooking,
            day: toDayDMY((it as any).startsOn ?? it.startsAt),
            from: toTimeHM(it.startsAt),
            to: toTimeHM(it.endsAt),
            place: it.displayName,
            contactNumber: it.contactNumber ?? null,
            confirmationCode: it.confirmationCode ?? null,
            totalAmount: it.totalAmount ?? null,
            startsAtIso: it.startsAt,
            endsAtIso: it.endsAt,
          }));
          setBookings(mapped);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error al cargar reservas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const today = useMemo(() => new Date().toLocaleDateString("es-AR"), []);
  const suggestions: Suggestion[] = [
    { id: "s1", name: "Adrián Gonzalez", roles: "Bajo" },
    { id: "s2", name: "Worm Hole", roles: "Funk, Disco" },
    { id: "s3", name: "Micaela Solís", roles: "Saxo, Trompeta, Teclado" },
    { id: "s4", name: "Adrián Gomez", roles: "Guitarra, Batería, Voz" },
    { id: "s5", name: "Trío Modular", roles: "Indie, Pop" },
  ];
  const reviews: Review[] = [
    { id: "r1", author: "Luis María", rating: 4, text: "Excelente predisposición para ensayar y muy profesional. Volvería a tocar con él/ella." },
    { id: "r2", author: "Marcos Marcos", rating: 5, text: "Llegó puntual, buena comunicación y sonido impecable. 10/10." },
  ];
  const userGroup = user?.idUserGroup ?? null; // 2 músico, 3 sala
  const canReschedule = userGroup === 2 || userGroup === 3;

  const railRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const delta = dir === "left" ? -rail.clientWidth : rail.clientWidth;
    rail.scrollBy({ left: delta, behavior: "smooth" });
  };
  const nextBooking = useMemo(
    () => (bookings.length > 0 ? bookings[0] : null),
    [bookings]
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ id, label, value, Icon }) => (
          <Card key={id} className="rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Icon className="h-6 w-6 text-[#65558F]" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="text-2xl font-semibold text-[#65558F]">{value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap justify-end gap-2 ">
        <FriendsDialogButton
          meId={meId}
          apiBase={API}
          hydrateProfiles
          buildProfileUrl={(id) => `${API}/directory/${id}/profile`}
          onSelectFriend={(friendId) => window.location.assign(`/profile/${friendId}`)}
        />
        <EventWizard onCreated={() => { }} trigger={<Button className="rounded-2xl">Nuevo evento</Button>} />
      </div>

      {/* Próximas reservas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-[#65558F]" />
          <span>Mis próximas reservas</span>
          {nextBooking && (
            <span className="text-sm text-muted-foreground">
              · Próxima: {nextBooking.day} {nextBooking.from}
            </span>
          )}
        </div>

        {loading && (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-2xl bg-violet-50/60 border-violet-200 h-full">
                <CardContent className="p-3 min-h-[96px] animate-pulse" />
              </Card>
            ))}
          </div>
        )}

        {error && <div className="text-sm text-red-600">No pude cargar tus reservas. {error}</div>}

        {!loading && !error && bookings.length === 0 && (
          <div className="text-sm text-muted-foreground">No tenés reservas próximas.</div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="grid sm:grid-cols-1 gap-3">
            {bookings.map((b) => (
              <Card key={b.idBooking} className="rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
                <CardContent className="p-4 min-h-[112px] h-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-sm space-y-1">
                    <div className="font-medium flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{b.day}</span>
                      <span>·</span>
                      <span>De {b.from} a {b.to}</span>
                      {b.totalAmount != null && (
                        <span className="text-muted-foreground">· {moneyAR(b.totalAmount)}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {b.place}
                      {role === "musician" && b.address ? ` · ${b.address}` : ""}
                      {role === "studio" && b.contactNumber ? ` · ${b.contactNumber}` : ""}
                      <span className="ml-2 align-middle"><PaymentStatusBadge status={b.paymentStatus} /></span>
                    </div>
                    {b.confirmationCode && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Código: <span className="font-mono">{b.confirmationCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Editar (músicos y salas) */}
                    {canReschedule && (
                      <RescheduleBookingDialog
                        idBooking={b.idBooking}
                        triggerClassName="rounded-xl border border-violet-200 bg-white text-[#65558F] hover:bg-violet-50 hover:text-[#65558F]"
                        onDone={({ newStartsAtIso, newEndsAtIso }) => {
                          const toHM = (isoLocal: string) => {
                            const d = new Date(isoLocal);
                            const hh = String(d.getHours()).padStart(2, "0");
                            const mm = String(d.getMinutes()).padStart(2, "0");
                            return `${hh}:${mm}`;
                          };
                          setBookings((prev) =>
                            prev.map((x) =>
                              x.idBooking === b.idBooking
                                ? { ...x, from: toHM(newStartsAtIso), to: toHM(newEndsAtIso) }
                                : x
                            )
                          );
                        }}
                      />
                    )}

                    {/* Cancelar */}
                    {userGroup === 3 ? (
                      <CancelBookingButton
                        idBooking={b.idBooking}
                        totalAmount={b.totalAmount}
                        onDone={() => setBookings((prev) => prev.filter((x) => x.idBooking !== b.idBooking))}
                      />
                    ) : (
                      <Button variant="destructive" className="rounded-xl"><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>
                    )}

                    {/* Comprobante */}
                    <Button
                      className={`${primary} rounded-xl`}
                      onClick={() => window.open(`${API}/receipts/bookings/${b.idBooking}/receipt.pdf`, "_blank")}
                    >
                      <ReceiptText className="mr-2 h-4 w-4" /> Comprobante
                    </Button>

                    {/* Pagar (solo músico) */}
                    {userGroup === 2 && (
                      <div className="mt-2 md:mt-0 w-full md:w-auto">
                        <PayBookingButton idBooking={b.idBooking || 0} email={user?.email} />
                      </div>
                    )}

                    {/* Aviso si está pagada (opcional) */}
                    {isPaidStatus(b.paymentStatus) && (
                      <span className="text-xs text-muted-foreground ml-2">Esta reserva puede no permitir cambios</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA: Crear banda + Ver mapa */}
      <section className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-[#65558F]">Crea tu banda</div>
              <p className="text-sm text-muted-foreground">Agrupa músicos, administra roles y agenda ensayos en un solo lugar.</p>
            </div>
            <BandWizard
              triggerLabel="Crear banda"
              onCreated={(idBand) => {
                window.location.assign(`/bands/${idBand}`);
              }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-[#65558F]">Músicos y salas cerca de ti</div>
              <p className="text-sm text-muted-foreground">Explora el mapa y conéctate con personas y espacios cercanos.</p>
            </div>
            <Button className="rounded-xl" variant="outline" onClick={() => (location.href = "/map")}>
              <MapPin className="mr-2 h-4 w-4 text-[#65558F]" /> Ver mapa
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Sugerencias */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Bandas y Músicos sugeridos</h3>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0" onClick={() => scrollBy("left")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0" onClick={() => scrollBy("right")}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {suggestions.map((s) => (
            <Card key={s.id} className="min-w-[210px] rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-200 to-fuchsia-200" />
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.roles}</div>
                <Button className={`${primary} rounded-xl w-full`}>Ver perfil</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reseñas */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Reseñas</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <Card key={r.id} className="rounded-2xl border-violet-200 shadow-sm hover:shadow-md transition">
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-200 to-fuchsia-200 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">{r.author}</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(r.rating) ? "fill-[#65558F] text-[#65558F]" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{r.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
