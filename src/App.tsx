import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Doctors from "./pages/Doctors";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import Patients from "./pages/Patients";
import Profile from "./pages/Profile";
import LandingPage from "./pages/LandingPage";
import Users from "./pages/Users";
import Admin from "./pages/Admin";
import Reports from "./pages/Reports"; // Importar la página de Reportes
import Help from "./pages/Help"; // Importar la página de Ayuda
import { SessionContextProvider } from "./integrations/supabase/session-context";
import { ThemeProvider } from "@/components/theme-provider";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";


const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SessionContextProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes inside DashboardLayout */}
                <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                <Route path="/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
                <Route path="/appointments" element={<DashboardLayout><Appointments /></DashboardLayout>} />
                <Route path="/doctors" element={<DashboardLayout><Doctors /></DashboardLayout>} />
                <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
                <Route path="/patients" element={<DashboardLayout><Patients /></DashboardLayout>} />
                <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
                <Route path="/users" element={<DashboardLayout><Users /></DashboardLayout>} />
                <Route path="/admin" element={<DashboardLayout><Admin /></DashboardLayout>} />
                <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
                <Route path="/help" element={<DashboardLayout><Help /></DashboardLayout>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionContextProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;