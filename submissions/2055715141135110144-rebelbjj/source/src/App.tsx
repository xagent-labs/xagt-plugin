import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { GlobalTopBar } from "@/components/GlobalTopBar";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { LocaleProvider } from "@/lib/locale";
import { WalletProvider } from "@/lib/wallet";
import Index from "./pages/Index.tsx";
import HundredDays from "./pages/HundredDays.tsx";
import Atlas from "./pages/Atlas.tsx";
import Drills from "./pages/Drills.tsx";
import TrainingLog from "./pages/TrainingLog.tsx";
import TrainingMilestones from "./pages/TrainingMilestones.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <AuthProvider>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="global-topbar-stage">
                <div className="global-topbar-shell">
                  <GlobalTopBar />
                </div>
              </div>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/hundred-days" element={<HundredDays />} />
                <Route path="/atlas" element={<Atlas />} />
                <Route path="/drills" element={<Drills />} />
                <Route path="/training-log" element={<TrainingLog />} />
                <Route path="/training-milestones" element={<TrainingMilestones />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </AuthProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
