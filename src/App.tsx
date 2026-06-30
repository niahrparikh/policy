import { useEffect, useState } from "react";
import { User } from "./types";
import { request, removeToken, getToken } from "./utils/api";
import Auth from "./components/Auth";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ClientsList from "./components/ClientsList";
import PoliciesList from "./components/PoliciesList";
import RenewalsCalendar from "./components/RenewalsCalendar";
import DocumentsHub from "./components/DocumentsHub";
import WhatsAppInbox from "./components/WhatsAppInbox";
import AIAssistPanel from "./components/AIAssistPanel";
import Settings from "./components/Settings";
import { AlertTriangle, ShieldAlert, Sparkles, X } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Cross-component workflow flags
  const [shouldOpenScanOnLoad, setShouldOpenScanOnLoad] = useState(false);

  const fetchCurrentUser = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await request("/api/auth/me");
      if (res.user) {
        setUser(res.user);
      } else {
        removeToken();
      }
    } catch (err) {
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setActiveTab("dashboard");
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  // Transition from Dashboard quick actions to specific tabs & triggers
  const handleScanClick = () => {
    setShouldOpenScanOnLoad(true);
    setActiveTab("policies");
  };

  const handleAddClientClick = () => {
    setActiveTab("clients");
  };

  const handleSendWhatsApp = (alert: any) => {
    const cleanPhone = alert.clientPhone.replace(/[\s+()-]/g, "");
    const message = `Dear ${alert.clientName}, your ${alert.policyType} Policy No. ${alert.policyNumber} is expiring on ${new Date(alert.expiryDate).toLocaleDateString("en-IN")}. The premium amount due is ₹${alert.premiumAmount.toLocaleString("en-IN")}. Please pay early to ensure uninterrupted coverage. Regards, ${user?.name}.`;
    const encodedText = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006D77]"></div>
        <p className="mt-4 text-sm text-slate-500 font-semibold tracking-wide">
          Syncing secure policyholdings...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Handle Trial End constraints
  const isTrialExpired = user.subscription_status === "expired";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-900 selection:bg-[#FF6F3C]/10 selection:text-[#FF6F3C]">
      {/* Navigation Layout */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== "policies") {
            setShouldOpenScanOnLoad(false);
          }
        }}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen relative">
        {/* Trial Expired / Banner Lock Notification */}
        {isTrialExpired && (
          <div className="bg-red-600 text-white px-4 py-3 shadow-md flex items-center justify-between gap-4 shrink-0 animate-pulse">
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>
                Your 15-day free trial has expired! Edit features are locked. Upgrade to premium to continue managing portfolios.
              </span>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="bg-white hover:bg-slate-150 text-red-600 text-xs font-extrabold py-1.5 px-3.5 rounded-lg transition-colors shrink-0 shadow-sm"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* Global Floating Tips / System Messages */}
        {!isTrialExpired && user.subscription_status !== "active" && (
          <div className="bg-[#FF6F3C]/5 text-[#FF6F3C] px-4 py-2 border-b border-[#FF6F3C]/10 flex items-center justify-between text-xs font-semibold shrink-0">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-[#FF6F3C] animate-pulse" />
              <span>
                You are currently exploring <strong>policysync.in</strong> on a free trial license.
              </span>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="underline text-[11px] font-bold hover:text-[#FF6F3C]/80"
            >
              Unlock Premium Upgrades &rarr;
            </button>
          </div>
        )}

        {/* Dynamic Views Portals */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {activeTab === "dashboard" && (
            <Dashboard
              user={user}
              setActiveTab={setActiveTab}
              onScanClick={handleScanClick}
              onAddClientClick={handleAddClientClick}
              onSendWhatsApp={handleSendWhatsApp}
            />
          )}

          {activeTab === "clients" && (
            <ClientsList
              onScanRedirect={handleScanClick}
            />
          )}

          {activeTab === "policies" && (
            <PoliciesList
              onSendWhatsApp={handleSendWhatsApp}
              shouldOpenScanOnLoad={shouldOpenScanOnLoad}
            />
          )}

          {activeTab === "renewals" && (
            <RenewalsCalendar />
          )}

          {activeTab === "documents" && (
            <DocumentsHub />
          )}

          {activeTab === "whatsapp" && (
            <WhatsAppInbox />
          )}

          {activeTab === "aiassist" && (
            <AIAssistPanel />
          )}

          {activeTab === "settings" && (
            <Settings
              user={user}
              onProfileUpdate={(updatedUser) => setUser(updatedUser)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
