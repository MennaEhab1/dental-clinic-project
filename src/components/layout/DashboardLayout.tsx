//DashboardLayout.tsx
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  // ... باقي الـ imports
  Stethoscope,
} from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  KeyRound,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Pill,
  FileText,
  X,
  Bell,
  ChevronRight,
  User,
  Sparkles,
  History,
  Star,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PublicChatWidget } from "@/components/ai/PublicChatWidget";
import { notificationService } from "@/services/api";
import { readPatientProfileCache } from "@/lib/patientProfileCache";
import type { BackendNotification } from "@/services/api";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "patient" | "doctor" | "admin";
}

const patientNav = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/patient/dashboard" },
  { icon: Calendar, label: "Appointments", href: "/patient/appointments" },
  { icon: FileText, label: "Medical Records", href: "/patient/records" },
  { icon: Pill, label: "Prescriptions", href: "/patient/prescriptions" },
  { icon: Star, label: "Reviews", href: "/patient/reviews" },
  { icon: Sparkles, label: "AI Analysis", href: "/patient/ai-analysis" },

  { icon: User, label: "Profile & Settings", href: "/patient/profile" },
];

const doctorNav = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/doctor/dashboard" },
  { icon: Calendar, label: "Appointments", href: "/doctor/appointments" },
  { icon: CalendarDays, label: "My Schedule", href: "/doctor/schedule" },
  { icon: Users, label: "My Patients", href: "/doctor/patients" },
  { icon: FileText, label: "Medical Records", href: "/doctor/records" },
  { icon: MessageSquare, label: "Messages", href: "/doctor/messages" },
  { icon: KeyRound, label: "Update Password", href: "/doctor/updatePassword" },
];

// const adminNav = [
//   { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
//   { icon: Users, label: "Doctors", href: "/admin/doctors" },
//   { icon: Users, label: "Patients", href: "/admin/patients" },
//   { icon: Calendar, label: "Appointments", href: "/admin/appointments" },
//   { icon: Pill, label: "Pharmacy", href: "/admin/pharmacy" },
// ];
const adminNav = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Users, label: "Doctors", href: "/admin/doctors" },
  { icon: Users, label: "Patients", href: "/admin/patients" },
  { icon: Calendar, label: "Appointments", href: "/admin/appointments" },
  { icon: Pill, label: "Pharmacy", href: "/admin/pharmacy" },
  { icon: Stethoscope, label: "Specialities", href: "/admin/specialities" },
];

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cachedPatientAvatar, setCachedPatientAvatar] = useState<string>("");
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (role !== "patient") return;

    const loadCachedAvatar = () => {
      const cachedProfile = readPatientProfileCache(user);
      setCachedPatientAvatar(String(cachedProfile?.avatar || "").trim());
    };

    loadCachedAvatar();
    window.addEventListener("storage", loadCachedAvatar);
    window.addEventListener("patient:profile-updated", loadCachedAvatar);

    return () => {
      window.removeEventListener("storage", loadCachedAvatar);
      window.removeEventListener("patient:profile-updated", loadCachedAvatar);
    };
  }, [role, user]);

  useEffect(() => {
    if (role !== "patient" && role !== "doctor") return;

    let cancelled = false;

    const loadNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const res = await notificationService.getAll();
        if (!cancelled && res.success) {
          setNotifications(res.data || []);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNotifications(false);
        }
      }
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [role]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const avatarSrc = useMemo(() => {
    const userImage = String(
      cachedPatientAvatar ||
        user?.avatar ||
        (user as { profileImage?: string })?.profileImage ||
        (user as { profileImageUrl?: string })?.profileImageUrl ||
        (user as { imageUrl?: string })?.imageUrl ||
        (user as { photo?: string })?.photo ||
        "",
    ).trim();

    const raw = userImage;
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;

    const baseUrl =
      import.meta.env.VITE_API_URL || "https://smart-teeth-care.runasp.net";
    const normalized = raw.startsWith("/")
      ? `${baseUrl}${raw}`
      : `${baseUrl}/${raw}`;
    try {
      return encodeURI(normalized);
    } catch {
      return normalized;
    }
  }, [cachedPatientAvatar, user]);

  const navItems =
    role === "patient" ? patientNav : role === "doctor" ? doctorNav : adminNav;

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const formatNotificationTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Just now";

    const diffMs = Date.now() - parsed.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return "Just now";
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    return `${Math.floor(diffMs / day)}d ago`;
  };

  const handleMarkAsRead = async (item: BackendNotification) => {
    if (item.isRead) return;

    setNotifications((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, isRead: true } : entry,
      ),
    );

    const result = await notificationService.markAsRead(item.id);
    if (!result.success) {
      setNotifications((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: false } : entry,
        ),
      );
    }
  };

  const renderNotificationBell = () => {
    if (role !== "patient" && role !== "doctor") return null;

    return (
      <div className="relative" ref={notificationsRef}>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-destructive-foreground text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {isNotificationsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-medium text-sm">
                {role === "doctor" ? "Doctor Notifications" : "Notifications"}
              </p>
              <span className="text-xs text-muted-foreground">
                {unreadCount} unread
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoadingNotifications ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Loading notifications...
                </p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      void handleMarkAsRead(item);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/60 transition-colors ${
                      item.isRead ? "" : "bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!item.isRead && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground break-words">
                          {item.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNotificationTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 px-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/LogoLunare.png"
            alt="Lunare Logo"
            className="
      h-8
      sm:h-10
      md:h-12
      lg:h-14
      xl:h-16
      2xl:h-18
      w-auto
      object-contain
      transition-all
      duration-300
    "
          />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {renderNotificationBell()}
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/public/LogoLunare.png"
                alt="Lunare Logo"
                className="
      h-8
      sm:h-10
      md:h-12
      lg:h-14
      xl:h-16
      2xl:h-18
      w-auto
      object-contain
      transition-all
      duration-300
    "
              />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback>
                  {avatarSrc ? (
                    <>
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </>
                  ) : role === "doctor" ? (
                    <Stethoscope className="w-4 h-4" />
                  ) : (
                    <>
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </>
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleLabel} Portal
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-border bg-card">
          <div>
            <h1 className="font-display font-semibold text-foreground">
              {navItems.find((item) => item.href === location.pathname)
                ?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {renderNotificationBell()}
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback>
                {avatarSrc ? (
                  <>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </>
                ) : role === "doctor" ? (
                  <Stethoscope className="w-4 h-4" />
                ) : (
                  <>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </>
                )}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6">{children}</div>
      </main>

      {/* Public Chat - مش بيظهر في صفحة ai-analysis */}
      {location.pathname !== "/patient/ai-analysis" && <PublicChatWidget />}
    </div>
  );
}
