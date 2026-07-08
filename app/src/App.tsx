import { Routes, Route, useLocation } from "react-router";
import { lazy, Suspense } from "react";
import { TRPCProvider } from "@/providers/trpc";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";

const Home = lazy(() => import("@/pages/Home"));
const ThaliBuilder = lazy(() => import("@/pages/ThaliBuilder"));
const Scanner = lazy(() => import("@/pages/Scanner"));
const DayTracker = lazy(() => import("@/pages/DayTracker"));
const Profile = lazy(() => import("@/pages/Profile"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const StagingImages = lazy(() => import("@/pages/StagingImages"));

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isScanner = location.pathname === "/scanner";
  const isLogin = location.pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#fdfbf5] pb-20">
      {!isScanner && <TopBar />}
      <main>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="w-8 h-8 border-3 border-[#c2410c] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      {!isScanner && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <TRPCProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/thali" element={<ThaliBuilder />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/tracker" element={<DayTracker />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/images" element={<StagingImages />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </TRPCProvider>
  );
}
