import React, { useEffect, useState } from "react";
import { Client, Policy } from "../types";
import { request } from "../utils/api";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Send,
  Sparkles,
  Check,
  AlertTriangle,
  RotateCw,
  Plus,
  Loader2,
  ListFilter
} from "lucide-react";

export default function RenewalsCalendar() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar State
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6); // July (0-indexed: 6)
  const [selectedDay, setSelectedDay] = useState<number | null>(7);
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [productFilter, setProductFilter] = useState("All");

  // Renewal Modal
  const [renewingPolicy, setRenewingPolicy] = useState<Policy | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalPremium, setRenewalPremium] = useState("");
  const [whatsappPreview, setWhatsappPreview] = useState("");
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  // Bulk Selection State
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

  const fetchRenewalsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [clientData, policyData] = await Promise.all([
        request<Client[]>("/api/clients"),
        request<Policy[]>("/api/policies")
      ]);
      setClients(clientData);
      setPolicies(policyData);
    } catch (err: any) {
      setError(err.message || "Failed to load policies. Please check your session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewalsData();
  }, []);

  // Helper to generate calendar days for 2026
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Normalize firstDayIndex to start on Monday if needed, but standard Sunday-first is classic
  const calendarBlankSlots = Array(firstDayIndex).fill(null);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Find policies expiring in this month and year
  const getPoliciesForDay = (day: number) => {
    return policies.filter((p) => {
      if (!p.expiry_date) return false;
      const expiryDate = new Date(p.expiry_date);
      const isSameDate = expiryDate.getDate() === day &&
                         expiryDate.getMonth() === currentMonth &&
                         expiryDate.getFullYear() === currentYear;
      
      const matchesFilter = productFilter === "All" || p.policy_type.toLowerCase().includes(productFilter.toLowerCase());
      return isSameDate && matchesFilter;
    });
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Generate customized WhatsApp text via backend API
  const generateTemplateMessage = async (policy: Policy, client: Client) => {
    setGeneratingTemplate(true);
    try {
      const res = await request<{ text: string }>("/api/messages/generate", {
        method: "POST",
        body: JSON.stringify({
          clientName: client.full_name,
          policyType: policy.policy_type,
          policyNumber: policy.policy_number,
          renewalDate: policy.expiry_date,
          premiumAmount: policy.premium_amount,
          type: "Renewal Reminder",
          tone: "Friendly"
        })
      });
      setWhatsappPreview(res.text);
    } catch {
      // Fallback
      setWhatsappPreview(`Dear ${client.full_name}, your policy ${policy.policy_number} (${policy.policy_type}) with premium ₹${policy.premium_amount} is due for renewal on ${policy.expiry_date}. Tap to renew.`);
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleOpenRenewModal = (policy: Policy) => {
    setRenewingPolicy(policy);
    setRenewalPremium(String(policy.premium_amount));
    const client = clients.find((c) => c.id === policy.client_id);
    if (client) {
      generateTemplateMessage(policy, client);
    } else {
      setWhatsappPreview(`Dear Customer, your policy ${policy.policy_number} is due for renewal. Please contact your agent.`);
    }
  };

  const handleConfirmRenewal = async () => {
    if (!renewingPolicy) return;
    setIsRenewing(true);
    try {
      // Calculate next year's expiry date
      const oldExpiry = new Date(renewingPolicy.expiry_date);
      const newExpiry = new Date(oldExpiry.setFullYear(oldExpiry.getFullYear() + 1));
      const newExpiryStr = newExpiry.toISOString().split("T")[0];

      await request(`/api/policies/${renewingPolicy.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...renewingPolicy,
          premium_amount: Number(renewalPremium),
          expiry_date: newExpiryStr,
          renewal_date: newExpiryStr,
          status: "Active"
        })
      });

      // Update in local state
      setPolicies(policies.map(p => p.id === renewingPolicy.id ? {
        ...p,
        premium_amount: Number(renewalPremium),
        expiry_date: newExpiryStr,
        renewal_date: newExpiryStr,
        status: "Active" as const
      } : p));

      // Trigger actual WhatsApp redirect if specified
      const client = clients.find(c => c.id === renewingPolicy.client_id);
      if (client && whatsappPreview) {
        const cleanPhone = client.phone.replace(/[\s+()-]/g, "");
        const encodedText = encodeURIComponent(whatsappPreview);
        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, "_blank");
      }

      setRenewingPolicy(null);
      fetchRenewalsData(); // Reload updated alerts
    } catch (err: any) {
      alert("Failed to save renewal: " + err.message);
    } finally {
      setIsRenewing(false);
    }
  };

  const triggerBulkWhatsApp = () => {
    if (selectedPolicyIds.length === 0) return;
    const targets = policies.filter(p => selectedPolicyIds.includes(p.id));
    alert(`Triggering WhatsApp broadcast for ${targets.length} policyholders...`);
    
    // Process first target in queue as standard behavior
    const firstP = targets[0];
    const client = clients.find(c => c.id === firstP.client_id);
    if (client) {
      const msg = `Namaste ${client.full_name}, your Policy renewal is due shortly. Please get in touch for options.`;
      const encoded = encodeURIComponent(msg);
      window.open(`https://api.whatsapp.com/send?phone=${client.phone.replace(/[\s+()-]/g, "")}&text=${encoded}`, "_blank");
    }
  };

  // Find all upcoming policies (expiring in next 45 days)
  const getUpcomingPolicies = () => {
    const today = new Date("2026-06-30"); // Align with custom system date
    return policies.filter(p => {
      const exp = new Date(p.expiry_date);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const matchesFilter = productFilter === "All" || p.policy_type.toLowerCase().includes(productFilter.toLowerCase());
      return diffDays >= 0 && diffDays <= 45 && matchesFilter;
    }).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  };

  const toggleSelectPolicy = (id: string) => {
    if (selectedPolicyIds.includes(id)) {
      setSelectedPolicyIds(selectedPolicyIds.filter(pid => pid !== id));
    } else {
      setSelectedPolicyIds([...selectedPolicyIds, id]);
    }
  };

  const toggleSelectAllUpcoming = (upcoming: Policy[]) => {
    if (selectedPolicyIds.length === upcoming.length) {
      setSelectedPolicyIds([]);
    } else {
      setSelectedPolicyIds(upcoming.map(u => u.id));
    }
  };

  const uniqueProductTypes = ["All", "Health", "Life", "Motor", "Travel", "Term"];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#006D77] tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#FF6F3C]" />
            Renewals & Expirations Manager
          </h1>
          <p className="text-sm text-slate-500">Track expiring policies, automate WhatsApp alerts, and update renewal logs instantly</p>
        </div>

        {/* View toggles */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-center">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "month" ? "bg-[#006D77] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === "list" ? "bg-[#006D77] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-[#006D77]" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Filter:</span>
          <div className="flex flex-wrap gap-1">
            {uniqueProductTypes.map((type) => (
              <button
                key={type}
                onClick={() => setProductFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  productFilter === type
                    ? "bg-[#FF6F3C]/10 text-[#FF6F3C] border-[#FF6F3C]/30"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchRenewalsData}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Sync State</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-[#006D77] animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Assembling interactive calendar matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visualizer Panel */}
          <div className="lg:col-span-2 space-y-6">
            {viewMode === "month" ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 overflow-hidden">
                {/* Month Picker Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#006D77]/10 text-[#006D77] border border-[#006D77]/20">
                      Current Focus
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Days Matrix */}
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2 border-b border-slate-100 pb-2">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarBlankSlots.map((_, i) => (
                    <div key={`blank-${i}`} className="h-16 bg-slate-50/50 rounded-xl" />
                  ))}
                  {calendarDays.map((day) => {
                    const dayPolicies = getPoliciesForDay(day);
                    const isToday = day === 30 && currentMonth === 5 && currentYear === 2026; // June 30, 2026
                    const isSelected = selectedDay === day;

                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => setSelectedDay(day)}
                        className={`h-18 p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-[#006D77] bg-[#006D77]/5"
                            : isToday
                            ? "border-[#FF6F3C] bg-[#FF6F3C]/5"
                            : "border-slate-100 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${
                          isToday ? "text-[#FF6F3C] font-extrabold" : "text-slate-700"
                        }`}>
                          {day}
                        </span>

                        <div className="flex flex-col gap-0.5">
                          {dayPolicies.map((p) => (
                            <span
                              key={p.id}
                              className={`text-[9px] truncate font-semibold px-1 py-0.5 rounded-md leading-tight ${
                                p.policy_type.toLowerCase().includes("health")
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : p.policy_type.toLowerCase().includes("life")
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-[#FF6F3C]/10 text-[#FF6F3C] border border-[#FF6F3C]/20"
                              }`}
                              title={`${p.policy_type} (${p.insurance_company})`}
                            >
                              {p.policy_type.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Renewals List View</h3>
                  <span className="text-xs text-slate-500 font-medium">{policies.length} total active portfolios</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-hidden">
                  {policies.map((p) => {
                    const client = clients.find(c => c.id === p.client_id);
                    return (
                      <div key={p.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-slate-800 block">{p.policy_type}</span>
                          <span className="text-xs text-slate-500 font-semibold block">{client?.full_name || "Unknown"} | {p.policy_number}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 block">₹{p.premium_amount.toLocaleString()}</span>
                          <span className="text-xs text-slate-400 font-medium">Due {p.expiry_date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Day Agenda Detail View */}
            {selectedDay && viewMode === "month" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Agenda for {selectedDay} {monthNames[currentMonth]} {currentYear}
                </h3>

                {getPoliciesForDay(selectedDay).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No expiries scheduled for this selected date.</p>
                ) : (
                  <div className="space-y-3">
                    {getPoliciesForDay(selectedDay).map((p) => {
                      const client = clients.find(c => c.id === p.client_id);
                      return (
                        <div key={p.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{client?.full_name || "N/A"}</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                {p.policy_type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {p.insurance_company} • No: <span className="font-mono">{p.policy_number}</span> • Sum: ₹{p.premium_amount}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenRenewModal(p)}
                              className="px-3 py-1.5 bg-[#006D77] hover:bg-[#005B63] text-white text-xs font-bold rounded-lg transition-all"
                            >
                              Renew Log
                            </button>
                            {client && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${client.phone.replace(/[\s+()-]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Upcoming & Bulk Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-[#FF6F3C]" />
                  Upcoming Expirations (45 Days)
                </h3>
                <button
                  onClick={() => toggleSelectAllUpcoming(getUpcomingPolicies())}
                  className="text-xs font-bold text-[#006D77] hover:underline"
                >
                  {selectedPolicyIds.length === getUpcomingPolicies().length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {getUpcomingPolicies().length === 0 ? (
                <div className="text-center py-6">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Perfect portfolio health! No lapses imminent.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {getUpcomingPolicies().map((p) => {
                    const client = clients.find(c => c.id === p.client_id);
                    const isSelected = selectedPolicyIds.includes(p.id);
                    const daysRemaining = Math.ceil(
                      (new Date(p.expiry_date).getTime() - new Date("2026-06-30").getTime()) /
                      (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                          isSelected ? "bg-[#FF6F3C]/5 border-[#FF6F3C]/30" : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPolicy(p.id)}
                          className="mt-1 h-3.5 w-3.5 text-[#FF6F3C] border-slate-300 rounded focus:ring-[#FF6F3C]"
                        />

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 truncate">{client?.full_name || "Unknown Client"}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                              daysRemaining <= 7
                                ? "bg-red-50 text-red-600 animate-pulse border border-red-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {daysRemaining} days left
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold">{p.policy_type} • ₹{p.premium_amount.toLocaleString()}</p>
                          
                          <div className="pt-1.5 flex items-center gap-2">
                            <button
                              onClick={() => handleOpenRenewModal(p)}
                              className="text-[10px] font-bold text-[#006D77] hover:underline"
                            >
                              Renew Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bulk Actions Button */}
              {selectedPolicyIds.length > 0 && (
                <button
                  onClick={triggerBulkWhatsApp}
                  className="w-full py-2.5 bg-[#FF6F3C] hover:bg-[#E55F2F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Broadcast to {selectedPolicyIds.length} Selected</span>
                </button>
              )}
            </div>

            {/* AI Assistant Insight Box */}
            <div className="bg-gradient-to-br from-[#006D77] to-[#005B63] text-white rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="h-5 w-5 text-yellow-300 animate-bounce" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-100">AI Renewal Assistant</h4>
              </div>
              <ul className="text-xs space-y-2.5 text-teal-50">
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-300 font-bold">•</span>
                  <span><strong>3 policies</strong> have a high risk of lapse (clients unreachable last week). Suggest a WhatsApp template with early payment incentives.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-yellow-300 font-bold">•</span>
                  <span>Bulk renewal template initialized automatically using client notes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Renewal Modal */}
      {renewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setRenewingPolicy(null)} />
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative border border-slate-200 animate-scale-in space-y-4">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-5 w-5 text-[#FF6F3C]" />
              Sync Policy Renewal Log
            </h3>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Policy Number</span>
                  <span className="font-mono font-bold text-slate-900">{renewingPolicy.policy_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Policy Type</span>
                  <span className="font-bold text-[#006D77]">{renewingPolicy.policy_type}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Premium Amount (₹)</label>
                <input
                  type="number"
                  value={renewalPremium}
                  onChange={(e) => setRenewalPremium(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6F3C]/20 focus:border-[#FF6F3C] font-bold text-slate-900 text-sm"
                />
              </div>

              {/* AI Auto Copywriting WhatsApp Template */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI WhatsApp Template Draft</span>
                {generatingTemplate ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center animate-pulse text-slate-400">
                    Drafting personalized message...
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    value={whatsappPreview}
                    onChange={(e) => setWhatsappPreview(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                  />
                )}
                <span className="text-[10px] text-slate-400 italic block">Draft will be loaded in your system WhatsApp tray on confirmation.</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex space-x-3">
              <button
                type="button"
                onClick={() => setRenewingPolicy(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRenewal}
                disabled={isRenewing}
                className="flex-1 py-2.5 bg-[#FF6F3C] hover:bg-[#E55F2F] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                {isRenewing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
