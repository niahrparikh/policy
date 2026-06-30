import React, { useEffect, useState, useRef } from "react";
import { Policy, Client } from "../types";
import { request } from "../utils/api";
import { 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Scan, 
  Sparkles, 
  Upload, 
  Camera, 
  X, 
  Send, 
  Copy, 
  Check,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  Activity,
  AlertTriangle
} from "lucide-react";

interface PoliciesListProps {
  onSendWhatsApp: (alert: any) => void;
  shouldOpenScanOnLoad?: boolean;
}

export default function PoliciesList({ onSendWhatsApp, shouldOpenScanOnLoad }: PoliciesListProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Forms and Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editPolicyId, setEditPolicyId] = useState<string | null>(null);

  // Policy Form Fields
  const [clientId, setClientId] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [paymentFrequency, setPaymentFrequency] = useState<"Monthly" | "Quarterly" | "Half-Yearly" | "Yearly">("Yearly");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [commissionPercentage, setCommissionPercentage] = useState("10");
  const [documentUrl, setDocumentUrl] = useState("");
  const [extractedDataJson, setExtractedDataJson] = useState("{}");

  // OCR Processing State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<"upload" | "camera" | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // AI Message Helper State
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [selectedPolicyForAI, setSelectedPolicyForAI] = useState<Policy | null>(null);
  const [selectedClientForAI, setSelectedClientForAI] = useState<Client | null>(null);
  const [aiMessageType, setAIMessageType] = useState("Renewal Reminder");
  const [aiMessageTone, setAIMessageTone] = useState("Professional");
  const [aiGeneratedCopy, setAIGeneratedCopy] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [policiesData, clientsData] = await Promise.all([
        request<Policy[]>("/api/policies"),
        request<Client[]>("/api/clients")
      ]);
      setPolicies(policiesData);
      setClients(clientsData);
    } catch (err: any) {
      setError(err.message || "Failed to load policy index. Upgrade if trial expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (shouldOpenScanOnLoad) {
      openScanModal();
    }
  }, [shouldOpenScanOnLoad]);

  // Open scanning modal
  const openScanModal = () => {
    setScanMethod("upload");
    setIsScanning(true);
  };

  const closeScanModal = () => {
    stopCamera();
    setIsScanning(false);
    setScanMethod(null);
  };

  // Camera capture methods
  const startCamera = async () => {
    try {
      setError(null);
      setScanMethod("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setError("Unable to access the camera. Please upload an image instead.");
      setScanMethod("upload");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      const base64Data = dataUrl.split(",")[1];
      stopCamera();
      await processOCR(base64Data, "image/jpeg");
    }
  };

  // File Upload OCR handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(",")[1];
      await processOCR(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  // OCR Network processing trigger
  const processOCR = async (base64Data: string, mimeType: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await request("/api/policies/ocr", {
        method: "POST",
        body: JSON.stringify({ base64Data, mimeType }),
      });

      if (result.success && result.extracted_data) {
        const ext = result.extracted_data;
        // Populate form with Gemini extracted results
        setFormMode("create");
        setPolicyType(ext.policyType || "Term Life Insurance");
        setInsuranceCompany(ext.insuranceCompany || "");
        setPolicyNumber(ext.policyNumber || "");
        setPremiumAmount(ext.premiumAmount ? String(ext.premiumAmount) : "");
        setPaymentFrequency(ext.paymentFrequency || "Yearly");
        setStartDate(ext.startDate || "");
        setExpiryDate(ext.expiryDate || "");
        setRenewalDate(ext.expiryDate || "");
        setCommissionPercentage("15");
        setExtractedDataJson(result.raw_json_str || "{}");

        // Try matching extracted name to existing clients
        if (ext.customerName) {
          const match = clients.find((c) =>
            c.full_name.toLowerCase().includes(ext.customerName.toLowerCase()) ||
            ext.customerName.toLowerCase().includes(c.full_name.toLowerCase())
          );
          if (match) {
            setClientId(match.id);
          } else {
            setClientId("");
          }
        }

        closeScanModal();
        setIsFormOpen(true);
      }
    } catch (err: any) {
      setError(err.message || "AI OCR Scanning failed. Please write policy details manually.");
    } finally {
      setLoading(false);
    }
  };

  // Form Handlers
  const openCreateForm = () => {
    setFormMode("create");
    setClientId("");
    setPolicyType("");
    setInsuranceCompany("");
    setPolicyNumber("");
    setPremiumAmount("");
    setPaymentFrequency("Yearly");
    setStartDate("");
    setExpiryDate("");
    setRenewalDate("");
    setCommissionPercentage("12");
    setDocumentUrl("");
    setExtractedDataJson("{}");
    setIsFormOpen(true);
  };

  const openEditForm = (policy: Policy) => {
    setFormMode("edit");
    setEditPolicyId(policy.id);
    setClientId(policy.client_id);
    setPolicyType(policy.policy_type);
    setInsuranceCompany(policy.insurance_company);
    setPolicyNumber(policy.policy_number);
    setPremiumAmount(String(policy.premium_amount));
    setPaymentFrequency(policy.payment_frequency);
    setStartDate(policy.start_date);
    setExpiryDate(policy.expiry_date);
    setRenewalDate(policy.renewal_date);
    setCommissionPercentage(String(policy.commission_percentage));
    setDocumentUrl(policy.document_url);
    setExtractedDataJson(policy.extracted_data_json);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId || !policyType || !insuranceCompany || !policyNumber || !premiumAmount || !expiryDate) {
      setError("Please fill in all mandatory fields (marked with *)");
      return;
    }

    try {
      const payload = {
        client_id: clientId,
        policy_type: policyType,
        insurance_company: insuranceCompany,
        policy_number: policyNumber,
        premium_amount: premiumAmount,
        payment_frequency: paymentFrequency,
        start_date: startDate,
        expiry_date: expiryDate,
        renewal_date: renewalDate || expiryDate,
        commission_percentage: commissionPercentage,
        document_url: documentUrl,
        extracted_data_json: extractedDataJson,
      };

      if (formMode === "create") {
        const created = await request<Policy>("/api/policies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setPolicies([created, ...policies]);
      } else {
        const updated = await request<Policy>(`/api/policies/${editPolicyId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setPolicies(policies.map((p) => (p.id === editPolicyId ? updated : p)));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save insurance policy.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this policy document?")) {
      return;
    }
    try {
      await request(`/api/policies/${id}`, { method: "DELETE" });
      setPolicies(policies.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to remove policy record.");
    }
  };

  // AI Reminder generator launcher
  const openAIComposer = (policy: Policy) => {
    const client = clients.find((c) => c.id === policy.client_id);
    if (!client) return;

    setSelectedPolicyForAI(policy);
    setSelectedClientForAI(client);
    setAIGeneratedCopy("");
    setIsAIOpen(true);
    generateMessage(policy, client, aiMessageType, aiMessageTone);
  };

  const generateMessage = async (policy: Policy, client: Client, type: string, tone: string) => {
    setIsGeneratingAI(true);
    setAIGeneratedCopy("");
    try {
      const res = await request("/api/messages/generate", {
        method: "POST",
        body: JSON.stringify({
          clientName: client.full_name,
          policyType: policy.policy_type,
          policyNumber: policy.policy_number,
          renewalDate: policy.renewal_date || policy.expiry_date,
          premiumAmount: policy.premium_amount,
          type,
          tone,
        }),
      });
      if (res.success && res.message) {
        setAIGeneratedCopy(res.message);
      }
    } catch (err: any) {
      setAIGeneratedCopy("Unable to auto-compose template: " + (err.message || "Connection failure."));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAIFieldChange = (type: string, tone: string) => {
    setAIMessageType(type);
    setAIMessageTone(tone);
    if (selectedPolicyForAI && selectedClientForAI) {
      generateMessage(selectedPolicyForAI, selectedClientForAI, type, tone);
    }
  };

  const copyAICopy = () => {
    navigator.clipboard.writeText(aiGeneratedCopy);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2000);
  };

  const triggerWhatsAppSend = () => {
    if (!selectedClientForAI) return;
    const cleanPhone = selectedClientForAI.phone.replace(/[\s+()-]/g, "");
    const encodedText = encodeURIComponent(aiGeneratedCopy);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, "_blank");
  };

  // Extract unique filter assets
  const policyTypes = Array.from(new Set(policies.map((p) => p.policy_type)));
  const insuranceCompanies = Array.from(new Set(policies.map((p) => p.insurance_company)));

  // Master policy filters execution
  const filteredPolicies = policies.filter((p) => {
    const client = clients.find((c) => c.id === p.client_id);
    const clientName = client ? client.full_name : "";

    const matchesSearch =
      p.policy_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.policy_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.insurance_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !filterType || p.policy_type === filterType;
    const matchesCompany = !filterCompany || p.insurance_company === filterCompany;
    const matchesStatus = !filterStatus || p.status === filterStatus;

    return matchesSearch && matchesType && matchesCompany && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#0504AA]" />
            Insurance Policy Ledger
          </h1>
          <p className="text-sm text-slate-500">Scan physical files, track commissions, and synchronize coverage records with AI</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={openScanModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-[#0504AA] to-[#04038F] text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-indigo-200"
          >
            <Scan className="h-4 w-4" />
            <span>AI OCR Scan</span>
          </button>
          
          <button
            onClick={openCreateForm}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      {/* Filter and Search Panels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Bar */}
        <div className="relative rounded-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search policy / client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs bg-slate-50/50"
          />
        </div>

        {/* Policy Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs bg-slate-50/50 text-slate-700 font-semibold"
        >
          <option value="">All Policy Types</option>
          {policyTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Insurance Company Filter */}
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs bg-slate-50/50 text-slate-700 font-semibold"
        >
          <option value="">All Companies</option>
          {insuranceCompanies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Expiry Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs bg-slate-50/50 text-slate-700 font-semibold"
        >
          <option value="">All Expiry Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending Renewal">Pending Renewal (&lt;30d)</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* Policies Main Ledger Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0504AA] mx-auto"></div>
          <p className="text-sm text-slate-500 mt-2 font-medium">Assembling premium policy tables...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <FileText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Policies Listed</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Your policy table is currently clean. Click "AI OCR Scan" to instantly digitize a physical certificate!
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client Name</th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type / Company</th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Policy Number</th>
                  <th className="px-5 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Premium Due</th>
                  <th className="px-5 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Comm %</th>
                  <th className="px-5 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-5 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredPolicies.map((p) => {
                  const client = clients.find((c) => c.id === p.client_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">{client ? client.full_name : "Unknown Client"}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">{client ? client.phone : ""}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-850">{p.policy_type}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{p.insurance_company}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          {p.policy_number}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-950">
                        ₹{p.premium_amount.toLocaleString("en-IN")}
                        <span className="text-[9px] font-semibold text-slate-400 block tracking-normal mt-0.5">({p.payment_frequency})</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center text-xs font-extrabold text-[#0504AA]">
                        {p.commission_percentage || 12}%
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                        {p.expiry_date ? new Date(p.expiry_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) : "N/A"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          p.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : p.status === "Pending Renewal"
                            ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                            : "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openAIComposer(p)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors shadow-xs"
                            title="Compose AI Reminder Message"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>AI Remind</span>
                          </button>
                          <button
                            onClick={() => openEditForm(p)}
                            className="p-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg transition-colors bg-white shadow-xs"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-lg transition-colors bg-white shadow-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Scanning Option Tray */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={closeScanModal} />
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative overflow-hidden border border-slate-200 animate-scale-in p-6 space-y-5">
            <button
              onClick={closeScanModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center pt-2">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#0504AA] to-[#04038F] text-white flex items-center justify-center mx-auto mb-3">
                <Scan className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-950">AI Document Extraction</h3>
              <p className="text-xs text-slate-500 mt-0.5">Instantly upload certificate PNGs, PDFs or capture via Camera</p>
            </div>

            {/* Methods Selection Tabs */}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setScanMethod("upload")}
                className={`py-3 px-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  scanMethod === "upload"
                    ? "border-[#0504AA] bg-[#E8E8FF] text-[#0504AA] font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                }`}
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload Document</span>
              </button>
              
              <button
                onClick={startCamera}
                className={`py-3 px-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  scanMethod === "camera"
                    ? "border-[#0504AA] bg-[#E8E8FF] text-[#0504AA] font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold"
                }`}
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Camera Capture</span>
              </button>
            </div>

            {/* Context Actions Container */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-150">
              {scanMethod === "upload" && (
                <div className="text-center space-y-3">
                  <p className="text-xs text-slate-500 font-semibold">Select PDF or image policy file</p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#0504AA] hover:bg-[#04038F] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs">
                    <Upload className="h-4 w-4" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {scanMethod === "camera" && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-300">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                  </div>
                  <button
                    onClick={capturePhoto}
                    className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <Camera className="h-4 w-4 animate-pulse" />
                    <span>Take Snapshot</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Powered by **Gemini-3.5-Flash OCR**. Auto-populates names, policy numbers, expiry periods, insurance agencies, and sum assured details safely.
            </p>
          </div>
        </div>
      )}

      {/* Manual and OCR Editable Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative border border-slate-200 animate-scale-in p-6 space-y-4">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0504AA]" />
                {formMode === "create" ? "Configure New Policy" : "Modify Policy Specifications"}
              </h3>

              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  >
                    <option value="">-- Choose policyholder --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Policy Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Policy Type *</label>
                  <input
                    type="text"
                    required
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    placeholder="e.g. Term Life Insurance, Family Floater Health..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Insurance Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Insurance Company *</label>
                  <input
                    type="text"
                    required
                    value={insuranceCompany}
                    onChange={(e) => setInsuranceCompany(e.target.value)}
                    placeholder="e.g. HDFC Ergo, LIC, Star Health..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Policy Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Policy Certificate Number *</label>
                  <input
                    type="text"
                    required
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. TL-89472-A"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                  />
                </div>

                {/* Premium Amount & Payment Frequency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Premium (₹) *</label>
                    <input
                      type="number"
                      required
                      value={premiumAmount}
                      onChange={(e) => setPremiumAmount(e.target.value)}
                      placeholder="e.g. 15400"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Payment Interval</label>
                    <select
                      value={paymentFrequency}
                      onChange={(e: any) => setPaymentFrequency(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                    >
                      <option value="Yearly">Yearly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Start, Expiry, Renewal Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => {
                        setExpiryDate(e.target.value);
                        if (!renewalDate) setRenewalDate(e.target.value);
                      }}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs"
                    />
                  </div>
                </div>

                {/* Commission % & Document URL */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Advisor Comm %</label>
                    <input
                      type="number"
                      value={commissionPercentage}
                      onChange={(e) => setCommissionPercentage(e.target.value)}
                      placeholder="12"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cloud Doc URL</label>
                    <input
                      type="text"
                      value={documentUrl}
                      onChange={(e) => setDocumentUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0504AA] hover:bg-[#04038F] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  {formMode === "create" ? "Save Policy" : "Update Specifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Message Composer Modal */}
      {isAIOpen && selectedPolicyForAI && selectedClientForAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsAIOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full relative overflow-hidden border border-slate-200 animate-scale-in p-6 space-y-5">
            <button
              onClick={() => setIsAIOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#E8E8FF] text-[#0504AA] mb-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Gemini Assistant
              </span>
              <h3 className="text-base font-bold text-slate-950">AI Notification Copywriter</h3>
              <p className="text-xs text-slate-500">Draft customized templates for {selectedClientForAI.full_name} ({selectedClientForAI.phone})</p>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Notification Type</label>
                <select
                  value={aiMessageType}
                  onChange={(e) => handleAIFieldChange(e.target.value, aiMessageTone)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-semibold bg-slate-50"
                >
                  <option value="Renewal Reminder">Renewal Reminder</option>
                  <option value="Premium Due Reminder">Premium Due Reminder</option>
                  <option value="Upsell Suggestion">Upsell Suggestion</option>
                  <option value="Custom Message">Custom Message</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Communication Tone</label>
                <select
                  value={aiMessageTone}
                  onChange={(e) => handleAIFieldChange(aiMessageType, e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-semibold bg-slate-50"
                >
                  <option value="Professional">💼 Professional</option>
                  <option value="Friendly">☕ Friendly</option>
                  <option value="Urgent">🚨 Urgent</option>
                  <option value="Premium">✨ Premium</option>
                </select>
              </div>
            </div>

            {/* Textarea generated message display */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Copywriting Preview</label>
              <div className="relative">
                <textarea
                  rows={5}
                  value={aiGeneratedCopy}
                  onChange={(e) => setAIGeneratedCopy(e.target.value)}
                  disabled={isGeneratingAI}
                  className="block w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-xs text-slate-800 leading-relaxed font-semibold disabled:bg-slate-50"
                />
                {isGeneratingAI && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0504AA]"></div>
                    <span className="ml-2.5 text-xs text-slate-500 font-semibold">Gemini is drafting message...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trigger Actions */}
            <div className="border-t border-slate-100 pt-4 flex space-x-3">
              <button
                onClick={copyAICopy}
                disabled={!aiGeneratedCopy || isGeneratingAI}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 focus:outline-none"
              >
                {copiedAI ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                onClick={triggerWhatsAppSend}
                disabled={!aiGeneratedCopy || isGeneratingAI}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm focus:outline-none"
              >
                <Send className="h-4 w-4" />
                <span>Open WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
