"use client";

import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Send,
  Star,
  Music2,
  CalendarDays,
  MapPin,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BandWizard } from "@/components/BandWizard";

type Booking = {
  id: string;
  from: string; // "15:30"
  to: string;   // "16:30"
  place: string;
  address: string;
};

type Suggestion = {
  id: string;
  name: string;
  roles: string; // "Bajo" / "Funk, Disco" / etc
};

type Review = {
  id: string;
  author: string;
  rating: number; // 0..5
  text: string;
};

const primary = "bg-[#65558F] hover:bg-[#51447A] text-white";

export default function HomePage() {
  /** Datos mock — cámbialos por fetch a tu API cuando los tengas */
  const stats = useMemo(
    () => [
      { id: "c", label: "Conexiones activas", value: 5, Icon: Users },
      { id: "s", label: "Solicitudes enviadas", value: 3, Icon: Send },
      { id: "r", label: "Valoración general", value: 4.5, Icon: Star },
      { id: "p", label: "Proyectos activos", value: 2, Icon: Music2 },
    ],
    []
  );

  const today = useMemo(() => "20/04/2025", []);
  const bookings: Booking[] = [
    {
      id: "b1",
      from: "15:30",
      to: "16:30",
      place: "EchoNest Studio",
      address: "Av. Santa Fe 3333.",
    },
    {
      id: "b2",
      from: "19:15",
      to: "20:30",
      place: "La Sala de Tato",
      address: "Charcas 2380.",
    },
  ];

  const suggestions: Suggestion[] = [
    { id: "s1", name: "Adrián Gonzalez", roles: "Bajo" },
    { id: "s2", name: "Worm Hole", roles: "Funk, Disco" },
    { id: "s3", name: "Micaela Solís", roles: "Saxo, Trompeta, Teclado" },
    { id: "s4", name: "Adrián Gomez", roles: "Guitarra, Batería, Voz" },
    { id: "s5", name: "Trío Modular", roles: "Indie, Pop" },
  ];

  const reviews: Review[] = [
    {
      id: "r1",
      author: "Luis María",
      rating: 4,
      text:
        "Excelente predisposición para ensayar y muy profesional. Volvería a tocar con él/ella.",
    },
    {
      id: "r2",
      author: "Marcos Marcos",
      rating: 5,
      text:
        "Llegó puntual, buena comunicación y sonido impecable. 10/10.",
    },
  ];

  const railRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const delta = dir === "left" ? -rail.clientWidth : rail.clientWidth;
    rail.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ id, label, value, Icon }) => (
          <Card key={id} className="rounded-2xl border-violet-200">
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

      {/* Próximas reservas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="h-5 w-5 text-[#65558F]" />
          <span>Mis próximas reservas: {today}</span>
        </div>

        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className="rounded-2xl bg-violet-50/60 border-violet-200">
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm">
                  <div className="font-medium">
                    De {b.from} a {b.to}
                  </div>
                  <div className="text-muted-foreground">
                    {b.place} · {b.address}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button className={`${primary} rounded-xl`}>Cambiar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA: Crear banda + Ver mapa */}
      <section className="grid md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-violet-200">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-[#65558F]">Crea tu banda</div>
              <p className="text-sm text-muted-foreground">
                Agrupa músicos, administra roles y agenda ensayos en un solo lugar.
              </p>
            </div>
            <BandWizard
              triggerLabel="Crear banda"
              onCreated={(idBand) => {
                window.location.assign(`/bands/${idBand}`);
              }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-violet-200">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-[#65558F]">
                Músicos y salas cerca de ti
              </div>
              <p className="text-sm text-muted-foreground">
                Explora el mapa y conéctate con personas y espacios cercanos.
              </p>
            </div>
            <Button className="rounded-xl" variant="outline" onClick={() => location.href = "/mapa"}>
              <MapPin className="mr-2 h-4 w-4 text-[#65558F]" />
              Ver mapa
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
            <Card key={s.id} className="min-w-[210px] rounded-2xl border-violet-200">
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className="h-20 w-20 rounded-full bg-violet-200" />
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
            <Card key={r.id} className="rounded-2xl border-violet-200">
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="h-12 w-12 rounded-full bg-violet-200 shrink-0" />
                <div className="space-y-1">
                  <div className="font-medium">{r.author}</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(r.rating)
                            ? "fill-[#65558F] text-[#65558F]"
                            : "text-gray-300"
                        }`}
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
