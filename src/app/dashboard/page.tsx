import UserSelectionForm from "@/components/UserSelectionForm";
import Navbar  from "@/components/ui/navbar";
export default function dashboardPage(){
    return (
        <main className="min-h-screen flex flex-col bg-gray-100">
        <Navbar/>
        <div className="flex flex-1 items-center justify-center">
            <UserSelectionForm />
        </div>
        </main>
    );
}