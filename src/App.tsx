import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { store, seedDemoIfEmpty } from "@/lib/store";
import Layout from "@/components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ExecutiveCenter from "./pages/ExecutiveCenter";
import Clients from "./pages/Clients";
import ClientDashboard from "./pages/ClientDashboard";
import UploadCenter from "./pages/UploadCenter";
import DataCleaning from "./pages/DataCleaning";
import AnnualAnalysis from "./pages/AnnualAnalysis";
import ProductIntelligence from "./pages/ProductIntelligence";
import ReorderCycle from "./pages/ReorderCycle";
import GrowthAnalysis from "./pages/GrowthAnalysis";
import Opportunities from "./pages/Opportunities";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

seedDemoIfEmpty();

function Protected({ children }: { children: JSX.Element }) {
  if (!store.isAuthed()) return <Navigate to="/" replace />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/executive" element={<ExecutiveCenter />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client/:id" element={<ClientDashboard />} />
            <Route path="/upload" element={<UploadCenter />} />
            <Route path="/cleaning" element={<DataCleaning />} />
            <Route path="/annual" element={<AnnualAnalysis />} />
            <Route path="/products" element={<ProductIntelligence />} />
            <Route path="/reorder" element={<ReorderCycle />} />
            <Route path="/growth" element={<GrowthAnalysis />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
