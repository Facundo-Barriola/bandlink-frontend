import Map, { type POI } from "@/components/Map";
import Navbar from "@/components/ui/navbar";
const mock: POI[] = [
    { id: 1, type: "musician", name: "Guitarrista", location: { lat: -34.58, lon: -58.42 } },
    { id: 2, type: "studio", name: "Sala", location: { lat: -34.59, lon: -58.45 } },
    { id: 3, type: "event", name: "Jam", location: { lat: -34.56, lon: -58.46 } },
    {
        id: 4,
        type: "event",
        name: "Recital Rock en el Parque Urbano",
        location: { lat: -34.1603, lon: -58.9458 }, // Parque Urbano de Campana
    },
    {
        id: 5,
        type: "musician",
        name: "Bajista en Campana",
        location: { lat: -34.1625, lon: -58.9597 }, // Plaza Eduardo Costa (Campana)
    },
    {
        id: 6,
        type: "studio",
        name: "Sala de Ensayo Centro Campana",
        location: { lat: -34.1642, lon: -58.9525 }, // unas cuadras de la plaza
    },
]; // opcional, ayuda a mantener literales

export default function MapPage() {
    return (
        <main className="min-h-screen flex flex-col bg-gray-100">
            <Navbar />
            <h1>Mapa BandLink</h1>
            <Map allPois={mock} initialRadiusKm={5} />
        </main>
    );
}
