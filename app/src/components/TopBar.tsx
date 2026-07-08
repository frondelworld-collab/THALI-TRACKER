import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Menu, Leaf } from "lucide-react";
import { useState } from "react";

export default function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isHome
          ? "bg-transparent"
          : "bg-[#fdfbf5]/90 backdrop-blur-md border-b border-[#e7e5e4]/50"
      }`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className={`w-5 h-5 ${isHome ? "text-white" : "text-[#c2410c]"}`} />
          <span
            className={`font-serif text-lg font-medium tracking-tight ${
              isHome ? "text-white" : "text-[#1c1917]"
            }`}
          >
            Nourish
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              to="/profile"
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#c2410c]/20"
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-2 rounded-xl transition-colors ${
              isHome
                ? "text-white hover:bg-white/10"
                : "text-[#1c1917] hover:bg-[#1c1917]/5"
            }`}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          className="absolute right-4 top-14 bg-white rounded-2xl shadow-lg border border-[#e7e5e4] py-2 min-w-[180px] z-50"
          onClick={() => setMenuOpen(false)}
        >
          <Link
            to="/"
            className="block px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#fdfbf5] transition-colors"
          >
            Home
          </Link>
          <Link
            to="/thali"
            className="block px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#fdfbf5] transition-colors"
          >
            Thali Builder
          </Link>
          <Link
            to="/scanner"
            className="block px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#fdfbf5] transition-colors"
          >
            Food Scanner
          </Link>
          <Link
            to="/tracker"
            className="block px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#fdfbf5] transition-colors"
          >
            Day Tracker
          </Link>
          <div className="border-t border-[#e7e5e4] mt-1 pt-1">
            {user ? (
              <a
                href="/api/oauth/signout"
                className="block px-4 py-2.5 text-sm text-[#c2410c] hover:bg-[#fdfbf5] transition-colors"
              >
                Sign Out
              </a>
            ) : (
              <Link
                to="/login"
                className="block px-4 py-2.5 text-sm text-[#c2410c] hover:bg-[#fdfbf5] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
