import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "@/components/Sidebar";
import AiAssistant from "@/components/AiAssistant";

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/60 backdrop-blur-xl">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu" className="text-white p-2 rounded-lg hover:bg-white/5">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px] border-white/5 bg-transparent">
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-head font-bold text-sm tracking-tight text-white">IBNE RIHAT UNIVERSE</span>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <AiAssistant />
    </div>
  );
}
