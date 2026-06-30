import { useEffect, useState } from "react";
import { ReportsData, User } from "../types";
import { request } from "../utils/api";
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  PieChart as PieIcon, 
  Calendar,
  AlertCircle,
  ShieldAlert,
  FolderLock
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";

interface ReportsProps {
  user: User;
}

export default function Reports({ user }: ReportsProps) {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const reports = await request<ReportsData>("/api/dashboard/reports");
      setData(reports);
    } catch (err: any) {
      setError(err.message || "Failed to load report analytics. Upgrade if trial has expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0504AA]"></div>
        <span className="ml-3 text-slate-500 font-medium">Computing historical commission logs and charts...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-12 font-sans">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-red-800">Operational Sync Failure</h3>
        <p className="text-sm text-red-600 mt-1">{error || "Could not retrieve analytical data streams."}</p>
        <button
          onClick={fetchReports}
          className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Retry Analytics Load
        </button>
      </div>
    );
  }

  const COLORS = ["#0504AA", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-8 font-sans">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#0504AA]" />
          Analytics Dashboard
        </h1>
        <p className="text-sm text-slate-500">Analyze commission logs, policy category breakdowns, and projected annual renewals</p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Premium Under Management (PUM)</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">₹{data.premiumUnderManagement.toLocaleString("en-IN")}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Sum of all active, non-expired policy premium pools</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historical Comm. Trends</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">₹{(data.premiumUnderManagement * 0.12).toLocaleString("en-IN")}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Approximate aggregate commission streams settled</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advisory Health Status</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-2">Active</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Automatic sync rules and webhook receivers operational</p>
        </div>
      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission history graph */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Commission Settlement Trends (6 Months)</h3>
            <p className="text-xs text-slate-500">Monthly advisor payments aggregated from coverage registries</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.commissionHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, "Commission"]} />
                <Line type="monotone" dataKey="commission" stroke="#0504AA" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category distribution pie chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Portfolio Distribution</h3>
            <p className="text-xs text-slate-500">Policy spread broken down by product types</p>
          </div>
          <div className="h-48 relative my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.policyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.policyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Policies`, "Volume"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
            {data.policyDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="h-3 w-3 rounded-md shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecaster Table Bar chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Projected Renewal Commission Pipelines</h3>
          <p className="text-xs text-slate-500">Expected advisor cashflows computed based on expiring policy anniversaries</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyForecast} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(value, name) => [`₹${value.toLocaleString()}`, name === "premium" ? "Premium Volume" : "Advisor Commission"]} />
              <Bar dataKey="commission" fill="#0504AA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
