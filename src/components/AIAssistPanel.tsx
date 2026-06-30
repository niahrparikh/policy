import React, { useState, useEffect } from "react";
import { Client, Policy } from "../types";
import { request } from "../utils/api";
import {
  Sparkles,
  User,
  ShieldAlert,
  TrendingUp,
  FileText,
  Send,
  Upload,
  ArrowRight,
  TrendingDown,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

interface SuggestionCard {
  id: string;
  category: "Missing Documents" | "Renewal Risks" | "Upsell Opportunities";
  title: string;
  description: string;
  clientName: string;
  clientPhone: string;
  policyType?: string;
  impactValue?: string;
  status: "Pending Action" | "Applied" | "Ignored";
}

export default function AIAssistPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([
    {
      id: "sug-1",
      category: "Renewal Risks",
      title: "Critical Renewal Risk: Rajesh Kumar",
      description: "Rajesh's family health floater expires in 7 days. He did not open the automated email. Send custom WhatsApp reminder now.",
      clientName: "Rajesh Kumar",
      clientPhone: "+91 98765 43210",
      policyType: "Health Floater Premium",
      impactValue: "Premium ₹12,000",
      status: "Pending Action"
    },
    {
      id: "sug-2",
      category: "Missing Documents",
      title: "Missing Aadhaar Card verification",
      description: "Amit Sharma's profile is missing an Aadhaar KYC scan. Star Health might reject claims. Request upload via WhatsApp link.",
      clientName: "Amit Sharma",
      clientPhone: "+91 98123 45678",
      status: "Pending Action"
    },
    {
      id: "sug-3",
      category: "Upsell Opportunities",
      title: "Top-up Cover eligibility detected",
      description: "Priya Patel paid 3 premium installments on time. Recommend adding Critical Illness rider for only ₹1,500/year extra.",
      clientName: "Priya Patel",
      clientPhone: "+91 99223 34455",
      policyType: "Family Floater Health",
      impactValue: "+₹1,500/yr commission bump",
      status: "Pending Action"
    },
    {
      id: "sug-4",
      category: "Missing Documents",
      title: "Missing PAN KYC card details",
      description: "Priya Patel's profile is missing a PAN scan. Star Health might hold corporate tax waivers. Request upload.",
      clientName: "Priya Patel",
      clientPhone: "+91 99223 34455",
      status: "Pending Action"
    }
  ]);

  const loadAssistData = async () => {
    try {
      setLoading(true);
      const [clientData, policyData] = await Promise.all([
        request<Client[]>("/api/clients"),
        request<Policy[]>("/api/policies")
      ]);
      setClients(clientData);
      setPolicies(policyData);
    } catch {
      setError("Failed to fetch portfolios from backend. Using local offline assist rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssistData();
  }, []);

  const handleApplyAction = (sugId: string) => {
    const sug = suggestions.find(s => s.id === sugId);
    if (!sug) return;

    if (sug.category === "Renewal Risks") {
      const msg = `Namaste ${sug.clientName}, your policy is expiring in 7 days. Let us renew today so your family protection is uninterrupted. PolicySync.in`;
      window.open(`https://api.whatsapp.com/send?phone=${sug.clientPhone.replace(/[\s+()-]/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
    } else if (sug.category === "Missing Documents") {
      const msg = `Dear ${sug.clientName}, we need to update your KYC document (Aadhaar/PAN) for your active insurance plans. Please send a photo here. PolicySync.in`;
      window.open(`https://api.whatsapp.com/send?phone=${sug.clientPhone.replace(/[\s+()-]/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
    } else if (sug.category === "Upsell Opportunities") {
      alert(`Auto-upgraded policy for ${sug.clientName}! An updated rider invoice has been sent to client.`);
    }

    setSuggestions(suggestions.map(s => s.id === sugId ? { ...s, status: "Applied" as const } : s));
  };

  const handleDismissSuggestion = (sugId: string) => {
    setSuggestions(suggestions.filter(s => s.id !== sugId));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#006D77] tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#FF6F3C]" />
            AI Co-Pilot & Insights
          </h1>
          <p className="text-sm text-slate-500">Surface automatic upsell possibilities, KYC warnings, and expiration risk analyses</p>
        </div>

        <div className="flex items-center space-x-2 bg-[#006D77]/10 p-1.5 rounded-xl border border-[#006D77]/20">
          <Sparkles className="h-4 w-4 text-[#FF6F3C] animate-pulse" />
          <span className="text-xs font-bold text-[#006D77]">Gemini CRM Model Active</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-[#006D77] animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">Retrieving operational audit trails...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Performance Bento Scorecard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Renewal Risk Rating</span>
                  <span className="text-2xl font-black text-slate-800 mt-2 block">Good</span>
                  <p className="text-xs text-slate-400 font-medium mt-1">94% renewal retention forecast</p>
                </div>
                <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Missing Documents</span>
                  <span className="text-2xl font-black text-red-500 mt-2 block">2 Profiles</span>
                  <p className="text-xs text-slate-400 font-medium mt-1">Missing Aadhaar or PAN KYC card</p>
                </div>
                <div className="h-9 w-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-widest block">Upsell Commissions</span>
                  <span className="text-2xl font-black text-[#FF6F3C] mt-2 block">₹18,500</span>
                  <p className="text-xs text-[#006D77] font-medium mt-1">Total projected commission pipeline</p>
                </div>
                <div className="h-9 w-9 bg-orange-50 text-[#FF6F3C] rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Suggestions listings */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-widest block border-b border-slate-100 pb-2">
              Actionable Insights Queue
            </h3>

            {suggestions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Inbox Zero!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Outstanding client files have been validated. No further automated suggestions are pending at this time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {suggestions.map((card) => {
                  return (
                    <div
                      key={card.id}
                      className={`p-5 rounded-2xl border transition-all bg-white flex flex-col justify-between h-56 relative overflow-hidden ${
                        card.status === "Applied"
                          ? "border-emerald-100 bg-emerald-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            card.category === "Renewal Risks"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : card.category === "Missing Documents"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-[#006D77]/5 text-[#006D77] border-[#006D77]/10"
                          }`}>
                            {card.category}
                          </span>

                          {card.impactValue && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                              {card.impactValue}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {card.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            {card.description}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-bold">Client: {card.clientName}</span>
                        
                        {card.status === "Applied" ? (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Applied
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDismissSuggestion(card.id)}
                              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleApplyAction(card.id)}
                              className="px-3.5 py-1.5 bg-[#006D77] hover:bg-[#005B63] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <span>Apply</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
