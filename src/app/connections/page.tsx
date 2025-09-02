import ConnectionsPage from "@/components/ConnectionPage";
import Navbar  from "@/components/ui/navbar";
export default function connectionPage(){
    return (
        <main className="min-h-screen flex flex-col bg-gray-100">
        <Navbar/>
        <div className="flex flex-1 items-center justify-center pt-5">
            <ConnectionsPage/>
        </div>
        </main>
    );
}