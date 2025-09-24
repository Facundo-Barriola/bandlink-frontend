import EventHome from "@/components/EventHome";
import Navbar  from "@/components/ui/navbar";
export default function eventPage(){
    return (
        <main className="min-h-screen flex flex-col bg-gray-100">
        <Navbar/>
        <div className="flex flex-1 items-center justify-center pt-5">
            <EventHome/>
        </div>
        </main>
    );
}