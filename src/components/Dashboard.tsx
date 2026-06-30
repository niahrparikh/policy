import { useEffect, useState } from "react";
import { DashboardSummary, User } from "../types";
import { request } from "../utils/api";
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Send, 
  Plus, 
  Scan, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  MessageSquare,
  FileCheck
} from "lucide-react";

interface DashboardProps {
  user: User;
  setActiveTab: (tab: string) => void;
  onScanClick: () => void;
  onAddClientClick: () => void;
  onSendWhatsApp: (alert: any) => void;
}

export default function Dashboard({
  user,
  setActiveTab,
  onScanClick,
  onAddClientClick,
  onSendWhatsApp,
}: DashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await request<DashboardSummary>("/api/dashboard/summary");
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#006D77]"></div>
        <span className="ml-3 text-slate-500 font-medium">Assembling synchronized cockpit data...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-800">Operational Sync Failure</h3>
        <p className="text-sm text-red-600 mt-1">{error || "Could not retrieve summary metrics."}</p>
        <button
          onClick={fetchSummary}
          className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const filteredAlerts = summary.alertList.filter((alert) =>
    alert.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.policyType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Namaste, {user.name}! 🌅
          </h1>
          <p className="text-sm text-slate-500">
            {user.agency_name ? `${user.agency_name} Portal` : "Independent Insurance Advisor"}
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600 px-2.5">
            System Status:
          </span>
          <span className="bg-[#006D77] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
            Live Scan Active
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Clients */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clients</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{summary.totalClients}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-[#FF6F3C] flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Active Policies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Policies</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">{summary.activePoliciesCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-[#006D77] flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expires 7 Days (Red) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiring in 7d</p>
              <h3 className={`text-2xl font-bold mt-2 ${summary.expiringIn7DaysCount > 0 ? "text-red-600 font-extrabold" : "text-slate-900"}`}>
                {summary.expiringIn7DaysCount}
              </h3>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              summary.expiringIn7DaysCount > 0 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expires 30 Days (Yellow) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiring in 30d</p>
              <h3 className={`text-2xl font-bold mt-2 ${summary.expiringIn30DaysCount > 0 ? "text-amber-600 font-extrabold" : "text-slate-900"}`}>
                {summary.expiringIn30DaysCount}
              </h3>
            </div>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              summary.expiringIn30DaysCount > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Commission Forecast */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exp. Commission</p>
              <h3 className="text-2xl font-bold text-[#006D77] mt-2">₹{summary.monthlyExpectedCommission.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-[#006D77] flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Dynamic Promo Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">SaaS Command Hub</h3>
            <p className="text-xs text-slate-500 mt-0.5">Instant navigation shortcuts</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={onScanClick}
              className="flex flex-col items-center justify-center p-3.5 bg-[#FF6F3C]/5 border border-[#FF6F3C]/20 hover:bg-[#FF6F3C]/10 rounded-xl text-[#FF6F3C] text-xs font-bold transition-all gap-2"
            >
              <Scan className="h-5 w-5" />
              <span>AI Scan Policy</span>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold transition-all gap-2"
            >
              <FileCheck className="h-5 w-5 text-[#006D77]" />
              <span>Documents Hub</span>
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold transition-all gap-2"
            >
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              <span>WhatsApp Inbox</span>
            </button>
            <button
              onClick={() => setActiveTab("aiassist")}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold transition-all gap-2"
            >
              <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span>AI Co-Pilot</span>
            </button>
          </div>
        </div>

        {/* Premium Marketing Pitch or Subscription banner */}
        <div className="lg:col-span-2 bg-gradient-to-r from-[#006D77] to-[#005B63] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 h-36 w-36 rounded-full bg-white/5 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 ml-12 mb-12 h-20 w-20 rounded-full bg-white/5 pointer-events-none"></div>
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-lg mb-4 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>AI Message Templates V2.5</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight">Zero-Spam Smart Auto Reminders</h3>
            <p className="text-xs text-teal-100 max-w-md mt-1.5 leading-relaxed">
              Don't let expired plans break client relations. Generate instant Renewal reminders on Whatsapp with friendly, professional, or urgent copywriting templates generated directly by Gemini.
            </p>
          </div>
          <div className="mt-6 flex items-center space-x-4">
            <button
              onClick={() => setActiveTab("whatsapp")}
              className="bg-[#FF6F3C] hover:bg-[#E55F2F] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              Explore AI Message Engine <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Renewal Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#FF6F3C]" />
              Policy Renewal Alerts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Urgent client actions required to maintain coverage</p>
          </div>

          {/* Search Alerts */}
          <div className="relative rounded-xl max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Filter alert list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] text-xs"
            />
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Clear Skies!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No clients have policies expiring within 30 days that match your search filters. Excellent portfolio health!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Policy / No.
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Premium Due
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Days Remaining
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    WhatsApp Automation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.policyId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{alert.clientName}</div>
                      <div className="text-xs text-slate-500 font-medium">{alert.clientPhone}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-800">{alert.policyType}</div>
                      <div className="text-xs font-mono text-slate-400">{alert.policyNumber}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {alert.insuranceCompany}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {new Date(alert.expiryDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                      ₹{alert.premiumAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        alert.severity === "critical"
                          ? "bg-red-50 text-red-600 border border-red-100 animate-pulse"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {alert.daysLeft} days
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onSendWhatsApp(alert)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors shadow-sm"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send WhatsApp</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
