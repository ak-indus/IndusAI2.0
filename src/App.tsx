import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import AppLayout from "@/components/layout/AppLayout";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const Orders = lazy(() => import("@/pages/Orders"));
const OrderDetail = lazy(() => import("@/pages/OrderDetail"));
const Quotes = lazy(() => import("@/pages/Quotes"));
const Procurement = lazy(() => import("@/pages/Procurement"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const RMA = lazy(() => import("@/pages/RMA"));
const Channels = lazy(() => import("@/pages/Channels"));
const Chat = lazy(() => import("@/pages/Chat"));
const KnowledgeGraph = lazy(() => import("@/pages/KnowledgeGraph"));
const Demo = lazy(() => import("@/pages/Demo"));
const DemoSupport = lazy(() => import("@/pages/DemoSupport"));
const DemoSales = lazy(() => import("@/pages/DemoSales"));
const DemoFinance = lazy(() => import("@/pages/DemoFinance"));
const DemoOps = lazy(() => import("@/pages/DemoOps"));
const DemoJourney = lazy(() => import("@/pages/DemoJourney"));

function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
          <Route path="/products/:id" element={<Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="/orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
          <Route path="/orders/:id" element={<Suspense fallback={<PageLoader />}><OrderDetail /></Suspense>} />
          <Route path="/quotes" element={<Suspense fallback={<PageLoader />}><Quotes /></Suspense>} />
          <Route path="/procurement" element={<Suspense fallback={<PageLoader />}><Procurement /></Suspense>} />
          <Route path="/invoices" element={<Suspense fallback={<PageLoader />}><Invoices /></Suspense>} />
          <Route path="/rma" element={<Suspense fallback={<PageLoader />}><RMA /></Suspense>} />
          <Route path="/channels" element={<Suspense fallback={<PageLoader />}><Channels /></Suspense>} />
          <Route path="/chat" element={<Suspense fallback={<PageLoader />}><Chat /></Suspense>} />
          <Route path="/knowledge-graph" element={<Suspense fallback={<PageLoader />}><KnowledgeGraph /></Suspense>} />
          <Route path="/demo" element={<Suspense fallback={<PageLoader />}><Demo /></Suspense>} />
          <Route path="/demo/support" element={<Suspense fallback={<PageLoader />}><DemoSupport /></Suspense>} />
          <Route path="/demo/sales" element={<Suspense fallback={<PageLoader />}><DemoSales /></Suspense>} />
          <Route path="/demo/finance" element={<Suspense fallback={<PageLoader />}><DemoFinance /></Suspense>} />
          <Route path="/demo/ops" element={<Suspense fallback={<PageLoader />}><DemoOps /></Suspense>} />
          <Route path="/demo/journey" element={<Suspense fallback={<PageLoader />}><DemoJourney /></Suspense>} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}
