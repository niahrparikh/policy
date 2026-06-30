import React, { useState } from "react";
import { request, setToken } from "../utils/api";
import { User } from "../types";
import { Shield, Mail, Lock, User as UserIcon, Check, HelpCircle, ArrowRight } from "lucide-react";

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Agent" | "Agency Admin">("Agent");
  const [agencyName, setAgencyName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        onAuthSuccess(res.user);
      } else {
        const res = await request("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            agencyName: agencyName || "Independent Agent",
            whatsappNumber,
          }),
        });
        setToken(res.token);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Simulate Forgot Password trigger
    setTimeout(() => {
      setLoading(false);
      setForgotSuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center space-x-3">
          <div className="h-12 w-12 rounded-xl bg-[#0504AA] flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            policy<span className="text-[#0504AA]">sync.in</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          {showForgot
            ? "Reset your password"
            : isLogin
            ? "Sign in to your account"
            : "Create your agent account"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {!showForgot && (
            <>
              Or{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="font-medium text-[#0504AA] hover:text-[#04038F] focus:outline-none transition-colors"
              >
                {isLogin ? "start your 15-day free trial" : "log in to your portal"}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {showForgot ? (
            forgotSuccess ? (
              <div className="text-center py-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Check your inbox</h3>
                <p className="mt-2 text-sm text-slate-600">
                  We've simulated sending a recovery email to <strong>{email}</strong> with steps to reset your password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotSuccess(false);
                  }}
                  className="mt-6 w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleForgot}>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agent@example.com"
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#0504AA] hover:bg-[#04038F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0504AA] transition-all"
                  >
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="text-sm font-medium text-[#0504AA] hover:text-[#04038F]"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="reg-name" className="block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <div className="mt-1 relative rounded-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Vijay Kumar"
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      User Role
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("Agent")}
                        className={`py-2 px-3 border rounded-xl text-sm font-medium text-center transition-all ${
                          role === "Agent"
                            ? "border-[#0504AA] bg-[#E8E8FF] text-[#0504AA]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Individual Agent
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("Agency Admin")}
                        className={`py-2 px-3 border rounded-xl text-sm font-medium text-center transition-all ${
                          role === "Agency Admin"
                            ? "border-[#0504AA] bg-[#E8E8FF] text-[#0504AA]"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Agency Admin
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-agency" className="block text-sm font-semibold text-slate-700">
                      Agency Name
                    </label>
                    <input
                      id="reg-agency"
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. Kumar Insurance Associates"
                      className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-whatsapp" className="block text-sm font-semibold text-slate-700">
                      WhatsApp Business Number
                    </label>
                    <input
                      id="reg-whatsapp"
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+91 99999 88888"
                      className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@policysync.in"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-slate-900 sm:text-sm"
                  />
                </div>
              </div>

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 text-[#0504AA] focus:ring-[#0504AA] border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600">
                      Remember me
                    </label>
                  </div>

                  <div className="text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setError(null);
                      }}
                      className="font-medium text-[#0504AA] hover:text-[#04038F]"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#0504AA] hover:bg-[#04038F] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0504AA] transition-all shadow-sm"
                >
                  {loading ? (
                    "Loading..."
                  ) : isLogin ? (
                    <>
                      Sign In <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Start 15-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Seed demo credential indicators */}
          {isLogin && !showForgot && (
            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <p className="text-xs text-slate-500">
                To explore instantly, use seed account:
              </p>
              <div className="mt-1 inline-flex items-center justify-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 font-mono text-xs select-all">
                <span>agent@policysync.in</span>
                <span className="text-slate-300">|</span>
                <span>password123</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
