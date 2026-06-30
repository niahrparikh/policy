import { User } from "../types";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  TrendingUp, 
  Settings as SettingsIcon, 
  LogOut, 
  Shield, 
  Clock,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", label: "Clients", icon: Users },
    { id: "policies", label: "Policies (AI OCR)", icon: FileText },
    { id: "reports", label: "Reports & Analytics", icon: TrendingUp },
    { id: "settings", label: "Settings & Plan", icon: SettingsIcon },
  ];

  // Calculate days remaining on trial
  const getTrialDaysLeft = () => {
    if (user.subscription_status === "active") return null;
    const end = new Date(user.trial_end_date);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 360 * 24));
    return days < 0 ? 0 : days;
  };

  const trialDays = getTrialDaysLeft();

  const SidebarContent = () => (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200 p-5 font-sans">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-2 px-2 py-1">
          <div className="h-10 w-10 rounded-xl bg-[#0504AA] flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            policy<span className="text-[#0504AA]">sync.in</span>
          </span>
        </div>

        {/* Subscription Status Badge */}
        <div className="px-2">
          {user.subscription_status === "active" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-800">Premium Active</span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center space-x-2 text-amber-800 mb-1">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">15-Day Free Trial</span>
              </div>
              <p className="text-[11px] text-amber-700 font-medium">
                {trialDays !== null && trialDays > 0 
                  ? `${trialDays} days left. Please upgrade early!`
                  : "Trial Expired. Upgrade to paid."}
              </p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false); // Close mobile tray
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#E8E8FF] text-[#0504AA]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[#0504AA]" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="border-t border-slate-200 pt-4 mt-6">
        <div className="flex items-center space-x-3 px-2 mb-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-[#0504AA]">
            {user.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all focus:outline-none"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-[#0504AA] flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            policy<span className="text-[#0504AA]">sync</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop Sidebar Panel */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Black backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full shadow-2xl animate-fade-in">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
