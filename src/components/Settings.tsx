import React, { useState } from "react";
import { User } from "../types";
import { request } from "../utils/api";
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Lock, 
  CreditCard, 
  Check, 
  HelpCircle,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  Send,
  Zap,
  Globe
} from "lucide-react";

interface SettingsProps {
  user: User;
  onProfileUpdate: (user: User) => void;
}

export default function Settings({ user, onProfileUpdate }: SettingsProps) {
  // Profile Form States
  const [name, setName] = useState(user.name);
  const [agencyName, setAgencyName] = useState(user.agency_name);
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsapp_number);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Razorpay simulation states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [cardHolder, setCardHolder] = useState(user.name);
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [expiry, setExpiry] = useState("09/30");
  const [cvv, setCvv] = useState("123");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await request("/api/auth/update", {
        method: "PUT",
        body: JSON.stringify({
          name,
          agency_name: agencyName,
          whatsapp_number: whatsappNumber,
          password: password || undefined,
        }),
      });
      if (res.user) {
        onProfileUpdate(res.user);
        setSuccessMsg("Advisor profile saved successfully!");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update advisor credentials.");
    } finally {
      setLoading(false);
    }
  };

  const openSimulatedRazorpay = (plan: any) => {
    setSelectedPlan(plan);
    setPaymentSuccess(false);
    setIsCheckoutOpen(true);
  };

  const handleSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Trigger API upgrade to premium
      const res = await request("/api/auth/upgrade", {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlan.id,
          subscriptionId: "sub_rzp_" + Math.random().toString(36).substr(2, 9),
        }),
      });
      if (res.user) {
        setPaymentSuccess(true);
        setTimeout(() => {
          onProfileUpdate(res.user);
          setIsCheckoutOpen(false);
          setSuccessMsg(`Upgraded successfully to the ${selectedPlan.name} plan!`);
        }, 1500);
      }
    } catch (err: any) {
      setError("Simulated checkout gateway error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: "solo",
      name: "Solo Agent",
      price: "₹999",
      period: "/month",
      desc: "Perfect for independent advisors managing personal lists",
      features: [
        "Unlimited clients and policies",
        "AI OCR scanning on camera & files",
        "Automated email renewal alerts",
        "Manual WhatsApp template send",
        "Standard analytics dashboards",
      ],
    },
    {
      id: "agency",
      name: "Agency Admin",
      price: "₹2,999",
      period: "/month",
      desc: "Suited for rising agencies and protection teams",
      features: [
        "Include up to 5 team members",
        "AI OCR scanner extraction priority",
        "Automated WhatsApp integration api",
        "Sophisticated reports & analytics charts",
        "Priority 24/7 support channel",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "Designed for corporate Indian national brokerages",
      features: [
        "Unlimited team seats",
        "Custom APIs & webhooks integrations",
        "Row-level security audit logs",
        "Daily automated database backups",
        "Dedicated success officer",
      ],
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-[#0504AA]" />
          Portal Configurations
        </h1>
        <p className="text-sm text-slate-500">Update advisor profile data, credentials, and upgrade premium SaaS licenses</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-sm text-emerald-800 font-medium">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-sm text-red-800 font-medium">
          {error}
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile and Credentials Editor */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-[#0504AA]" />
              Advisor Identity Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Edit credentials displayed on PDF files and signoffs</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 border-t border-slate-100 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Agency Name</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">WhatsApp Business Number</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Primary Email ID (Immutable)</label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-sm select-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">New Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#0504AA] hover:bg-[#04038F] text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                {loading ? "Saving changes..." : "Save Identity Settings"}
              </button>
            </div>
          </form>
        </div>

        {/* Current SaaS Licensing Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0504AA]" />
                Licensing & Sync
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage trial countdowns and Razorpay subscription invoices</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4 text-xs font-semibold">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Subscription Status</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  user.subscription_status === "active" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {user.subscription_status === "active" ? "PREMIUM ACTIVE" : "15-DAY TRIAL"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Assigned Role</span>
                <span className="text-slate-700">{user.role}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400">Trial Period</span>
                <span className="text-slate-700">{user.trial_start_date} to {user.trial_end_date}</span>
              </div>

              {user.razorpay_subscription_id && (
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Razorpay ID</span>
                  <span className="font-mono text-[10px] font-bold text-[#0504AA]">{user.razorpay_subscription_id}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-[10px] text-slate-500 leading-relaxed mt-4">
            Security isolation enforces that only you have access to clients and policies uploaded to this account. All document scans are isolated at row-level using secure backend JWT policies.
          </div>
        </div>
      </div>

      {/* SaaS Pricing Matrices Table */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Premium Subscription Plans
          </h2>
          <p className="text-xs text-slate-500">Upgrade to unlock continuous scans, priority API message delivery, and advanced analytical panels</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md ${
                plan.popular 
                  ? "border-2 border-[#0504AA] ring-4 ring-[#0504AA]/5" 
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-[#0504AA] text-white font-bold text-[9px] uppercase tracking-wider py-1 px-3 rounded-bl-xl">
                  Popular Plan
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-950">{plan.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">{plan.desc}</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-950">{plan.price}</span>
                  <span className="text-xs text-slate-400 font-bold ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-[#0504AA] shrink-0 mt-0.5" />
                      <span className="leading-tight">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4">
                {user.subscription_status === "active" && plan.id === "solo" ? (
                  <div className="w-full text-center py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold font-medium select-none">
                    Active Premium Sub
                  </div>
                ) : plan.id === "enterprise" ? (
                  <button
                    onClick={() => alert("Please email partnership@policysync.in to configure custom enterprise SLA agreements.")}
                    className="w-full py-2.5 text-center bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Contact Partnerships
                  </button>
                ) : (
                  <button
                    onClick={() => openSimulatedRazorpay(plan)}
                    className={`w-full py-2.5 text-center rounded-xl text-xs font-bold transition-all shadow-sm ${
                      plan.popular
                        ? "bg-[#0504AA] hover:bg-[#04038F] text-white"
                        : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    Upgrade via Razorpay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated Razorpay Checkout Gateway overlay */}
      {isCheckoutOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setIsCheckoutOpen(false)} />
          <div className="bg-[#0504AA] rounded-2xl shadow-2xl max-w-sm w-full relative overflow-hidden text-white border border-indigo-950 animate-scale-in">
            {/* Top branding bar */}
            <div className="p-5 flex items-center justify-between border-b border-indigo-900">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-indigo-300 animate-spin" />
                <span className="text-sm font-extrabold tracking-tight">Razorpay Checkout</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-lg hover:bg-indigo-900 text-indigo-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated Payment details form */}
            {paymentSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-950/20">
                  <ShieldCheck className="h-8 w-8 animate-bounce" />
                </div>
                <h3 className="text-lg font-bold">Transaction Success!</h3>
                <p className="text-xs text-indigo-200">
                  Razorpay signature verified. Updating subscription licenses, loading dashboards...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSimulatedPayment} className="p-6 space-y-4 bg-slate-50 text-slate-900">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Product Upgrade</span>
                    <span className="font-extrabold text-slate-800 text-sm">{selectedPlan.name} LICENSE</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Charge Total</span>
                    <span className="font-extrabold text-[#0504AA] text-base">{selectedPlan.price}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Card Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                    />
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Visa / RuPay Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                    />
                  </div>

                  {/* Expiry / CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV Security Code</label>
                      <input
                        type="password"
                        required
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="•••"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#0504AA] hover:bg-[#04038F] text-white text-xs font-extrabold rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  {loading ? "Authorizing via OTP..." : `Simulate Payment (${selectedPlan.price})`}
                </button>

                <div className="text-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    🔒 Secured by Razorpay PCI-DSS Encryption Standards
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
