import { Link, useLocation } from "react-router";
import { Home, UtensilsCrossed, ScanLine, CalendarDays, User } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/thali", label: "Thali", icon: UtensilsCrossed },
  { path: "/scanner", label: "Scan", icon: ScanLine },
  { path: "/tracker", label: "Tracker", icon: CalendarDays },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-[#e7e5e4] safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? "text-[#c2410c] bg-[#c2410c]/5"
                  : "text-[#78716c] hover:text-[#1c1917]"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
