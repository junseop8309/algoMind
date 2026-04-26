import { NavLink, Outlet } from "react-router";
import { useAuth } from "../features/auth/AuthProvider";
import { useUIStore } from "../stores/uiStore";
import {
  LayoutDashboard,
  Map,
  RefreshCw,
  Mic2,
  Trophy,
  User,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { path: "/roadmap", label: "Roadmap", Icon: Map },
  { path: "/review", label: "Review", Icon: RefreshCw },
  { path: "/interview", label: "Interview", Icon: Mic2 },
  { path: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  { path: "/profile", label: "Profile", Icon: User },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore();

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-14" : "w-56"
        } bg-neutral-900 text-white flex flex-col transition-all duration-200 shrink-0`}
      >
        {/* Logo + collapse toggle */}
        <div className="flex items-center justify-between p-4">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-white">AlgoMind</span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-neutral-400 hover:text-white transition-colors ml-auto"
            title="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-1 p-2">
          {navItems.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: theme toggle + sign out */}
        <div className="p-4 border-t border-neutral-800 flex flex-col gap-2">
          <button
            onClick={toggleTheme}
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className="flex items-center gap-3 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            {theme === "light" ? (
              <Moon size={16} className="shrink-0" />
            ) : (
              <Sun size={16} className="shrink-0" />
            )}
            {!sidebarCollapsed && (
              <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
            )}
          </button>

          {!sidebarCollapsed && (
            <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
          )}

          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center gap-3 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
