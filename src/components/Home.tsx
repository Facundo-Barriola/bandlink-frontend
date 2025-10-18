"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Send, Star, Music2, CalendarDays, MapPin, Clock, ReceiptText, XCircle,
} from "lucide-react";
import { BandWizard } from "@/components/BandWizard";
import { PayBookingButton } from "./PayBookingButton";
import FriendsDialogButton from "@/components/FriendsDialogButton";
import CancelBookingButton from "@/components/CancelBookingButton";
import RescheduleBookingDialog from "@/components/RescheduleBookingDialog";
import EventWizard from "./EventWizard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const violetBtn = "bg-[#65558F] hover:bg-[#5a4d82] text-white";

type ApiResponseMusician = {
  ok: true; role: "musician";
  data: Array<{
    idBooking: number; startsAt: string; endsAt: string; startsOn: string;
    confirmationCode: string | null; totalAmount: number | null; phone: string | null;
    displayName: string; street: string | null; streetNum: number | null; paymentStatus: string | null;
  }>;
};
type ApiResponseStudio = {
  ok: true; role: "studio";
  data: Array<{
    idBooking: number; startsAt: string; endsAt: string;
    confirmationCode: string | null; totalAmount: number | null; contactNumber: string | null; displayName: string;
  }>;
};
type ApiResponse = ApiResponseMusician | ApiResponseStudio;

type BookingVM = {
  idBooking: number; day: string; from: string; to: string; place: string;
  address?: string | null; contactNumber?: string | null; confirmationCode?: string | null;
  totalAmount?: number | null; paymentStatus?: string | null; startsAtIso: string; endsAtIso: string;
};

type MusicianKpis = {
  connectionsActive: number;
  requestsSent: number;
  avgRating: { value: number | null; count: number };
  bandsActive: number;
};

type StudioKpis = {
  monthlyBookings: number;
  monthlyRevenue: number;
  avgRating: { value: number | null; count: number };
  topWeekday: { label: string; count: number } | null;
  topHourBand: { label: string; count: number } | null;
};

type KpisResponse =
  | { ok: true; role: "musician"; data: { overview: MusicianKpis } }
  | { ok: true; role: "studio"; data: { overview: StudioKpis; history: any[] } };

function toTimeHM(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function moneyAR(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
}
function toDayDMY(isoOrDate: string) {
  return new Date(isoOrDate).toLocaleDateString("es-AR");
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
  return ["approved", "paid", "completed"].includes(s.toLowerCase());
}
const isFutureByEnd = (endsAtIso: string) => new Date(endsAtIso).getTime() >= Date.now();

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
  return <Badge className={`rounded-full border ${cls}`}>{txt}</Badge>;
}

function isSameOrFutureDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime(); // muestra hoy y futuro
}

export default function HomePage() {
  const [kpisLoading, setKpisLoading] = useState(true);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [musicianKpis, setMusicianKpis] = useState<MusicianKpis | null>(null);
  const [studioKpis, setStudioKpis] = useState<StudioKpis | null>(null);
  const [studioHistory, setStudioHistory] = useState<any[]>([]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"musician" | "studio" | null>(null);
  const [bookings, setBookings] = useState<BookingVM[]>([]);
  const { user } = useUser();
  const meId = user?.idUser ?? 0;

  const roleByCtx: "musician" | "studio" = (user?.idUserGroup === 3 ? "studio" : "musician");
  const roleForUi: "musician" | "studio" = role ?? roleByCtx;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setKpisLoading(true);
        setKpisError(null);
        const r = await fetch(`${API}/kpis/overview`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const raw = await r.json();
        // 👇 log para ver el shape real
        console.log("KPIS raw:", raw);
        if (!r.ok || !raw?.ok) throw new Error("HTTP " + r.status);

        if (!alive) return;
        const roleFromApi: "musician" | "studio" | null = raw?.role ?? null;
        const data = raw?.data ?? raw ?? {};
        const overview = data?.overview ?? raw?.overview ?? null;
        const history = data?.history ?? raw?.history ?? [];
        setRole(roleFromApi);
        if (roleFromApi === "musician") {
          setMusicianKpis(overview);
        } else if (roleFromApi === "studio") {
          setStudioKpis(overview);
          setStudioHistory(Array.isArray(history) ? history : []);
        } else {
          throw new Error("role desconocido en /kpis/overview");
        }
      } catch (e: any) {
        if (!alive) return;
        setKpisError(e?.message ?? "No se pudieron cargar KPIs");
      } finally {
        if (alive) setKpisLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);


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
        console.log(json.role);
        setRole(json.role);
        if (json.role === "musician") {
          const mapped = json.data
            .map((it) => ({
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
          }))
          .filter((x) => isSameOrFutureDay(x.startsAtIso))
          .sort((a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime());
          setBookings(mapped);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Error al cargar reservas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const userGroup = user?.idUserGroup ?? null; // 2 músico, 3 sala
  const canReschedule = userGroup === 2 || userGroup === 3;
  const nextBooking = useMemo(() => (bookings.length > 0 ? bookings[0] : null), [bookings]);

  function KpiCard({ label, value, Icon, suffix }: { label: string; value: any; Icon: any; suffix?: string }) {
    return (
      <Card className="rounded-2xl shadow-sm border border-violet-200/60 hover:shadow-md transition">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-[#65558F]" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold text-[#65558F]">
              {typeof value === "number" ? value : String(value)}
              {suffix ? <span className="ml-1 text-xs text-muted-foreground">{suffix}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpisLoading && Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl"><CardContent className="p-6 animate-pulse h-20" /></Card>
        ))}
        {kpisError && <div className="col-span-4 text-sm text-red-600">{kpisError}</div>}

        {!kpisLoading && !kpisError && role === "musician" && musicianKpis && (
          <>
            <KpiCard label="Conexiones activas" value={musicianKpis.connectionsActive} Icon={Users} />
            <KpiCard label="Solicitudes enviadas" value={musicianKpis.requestsSent} Icon={Send} />
            <KpiCard label="Valoración" value={musicianKpis.avgRating.value ?? 0} suffix={musicianKpis.avgRating.value ? `(${musicianKpis.avgRating.count})` : ""} Icon={Star} />
            <KpiCard label="Proyectos activos" value={musicianKpis.bandsActive} Icon={Music2} />
          </>
        )}

        {!kpisLoading && !kpisError && role === "studio" && studioKpis && (
          <>
            <KpiCard label="Reservas (mes)" value={studioKpis.monthlyBookings} Icon={CalendarDays} />
            <KpiCard label="Ingresos (mes)" value={(studioKpis.monthlyRevenue).toLocaleString("es-AR", { style: "currency", currency: "ARS" })} Icon={ReceiptText} />
            <KpiCard label="Valoración" value={studioKpis.avgRating.value ?? 0} suffix={studioKpis.avgRating.value ? `(${studioKpis.avgRating.count})` : ""} Icon={Star} />
            <KpiCard label="Pico demanda" value={studioKpis.topHourBand?.label ?? "—"} suffix={studioKpis.topWeekday ? ` • ${studioKpis.topWeekday.label.trim()}` : ""} Icon={Clock} />
          </>
        )}
      </section>

      {/* Acciones rápidas */}
      <section className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/60 to-transparent p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Atajos para crear y conectar más rápido.
          </div>
          <div className="flex flex-wrap gap-2">
            <FriendsDialogButton
              meId={meId}
              apiBase={API}
              hydrateProfiles
              buildProfileUrl={(id) => `${API}/directory/${id}/profile`}
              onSelectFriend={(friendId) => window.location.assign(`/profile/${friendId}`)}
            />
            {/* Sin trigger ni className personalizados: el wizard muestra su botón por defecto */}
            <EventWizard onCreated={() => { /* refrescar/avisar si querés */ }} />
          </div>
        </div>
      </section>

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
          <div className="grid gap-3">
            {bookings.map((b) => (
              <Card
                key={b.idBooking}
                className="rounded-2xl shadow-sm border border-violet-200/60 hover:shadow-md transition"
              >
                <CardContent className="p-4 min-h-[112px] h-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="text-sm space-y-1">
                    <div className="font-medium flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {b.day}
                      </span>
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
                      <span className="ml-2 align-middle">
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </span>
                    </div>
                    {b.confirmationCode && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Código: <span className="font-mono">{b.confirmationCode}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Reschedule: sin pasar triggerClassName */}
                    {canReschedule && (
                      <RescheduleBookingDialog
                        idBooking={b.idBooking}
                        onDone={({ newStartsAtIso, newEndsAtIso }) => {
                          const toHM = (isoLocal: string) => {
                            const d = new Date(isoLocal);
                            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
                      <Button variant="destructive" className="rounded-xl">
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    )}

                    {/* Comprobante */}
                    <Button
                      className={`${violetBtn} rounded-xl`}
                      onClick={() => window.open(`${API}/receipts/bookings/${b.idBooking}/receipt.pdf`, "_blank")}
                    >
                      <ReceiptText className="mr-2 h-4 w-4" />
                      Comprobante
                    </Button>

                    {/* Pagar (solo músico) */}
                    {userGroup === 2 && (
                      <div className="mt-2 md:mt-0 w-full md:w-auto">
                        <PayBookingButton idBooking={b.idBooking || 0} email={user?.email} />
                      </div>
                    )}

                    {isPaidStatus(b.paymentStatus) && (
                      <span className="text-xs text-muted-foreground ml-1">
                        Esta reserva puede no permitir cambios
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA: Crear banda + Ver mapa */}
      {role !== "studio" && (
        <section className="grid md:grid-cols-2 gap-4">
          <Card className="rounded-2xl shadow-sm border border-violet-200/60 hover:shadow-md transition">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[#65558F]">Crear una banda</div>
                <p className="text-sm text-muted-foreground">
                  Agrupá músicos, administrá roles y organizá ensayos.
                </p>
              </div>
              {/* BandWizard con su botón por defecto (sin trigger ni className) */}
              <BandWizard
                onCreated={(idBand) => {
                  window.location.assign(`/bands/${idBand}`);
                }}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border border-violet-200/60 hover:shadow-md transition">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-[#65558F]">Músicos y salas cerca</div>
                <p className="text-sm text-muted-foreground">
                  Explorá el mapa y conectate con tu escena local.
                </p>
              </div>
              <Button className="rounded-xl" variant="outline" onClick={() => (location.href = "/map")}>
                <MapPin className="mr-2 h-4 w-4 text-[#65558F]" /> Ver mapa
              </Button>
            </CardContent>
          </Card>
        </section>)}
      {role === "studio" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-[#65558F]" />
            <span>Historial de reservas (90 días)</span>
          </div>

          {studioHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sin reservas en el período.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Fecha</th>
                    <th className="text-left p-3">Horario</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Importe</th>
                    <th className="text-left p-3">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {studioHistory.map((h: any) => (
                    <tr key={h.idBooking} className="border-t">
                      <td className="p-3">{toDayDMY(h.startsAt)}</td>
                      <td className="p-3">{toTimeHM(h.startsAt)}–{h.endsAt ? toTimeHM(h.endsAt) : "—"}</td>
                      <td className="p-3">{h.customerName ?? "—"}</td>
                      <td className="p-3">{h.totalAmount != null ? moneyAR(h.totalAmount) : "—"}</td>
                      <td className="p-3"><PaymentStatusBadge status={h.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
