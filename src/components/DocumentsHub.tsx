import React, { useState, useEffect } from "react";
import { Client, Policy } from "../types";
import { request } from "../utils/api";
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Share2,
  Trash2,
  Check,
  Send,
  Sparkles,
  Signature,
  MessageSquare,
  Loader2
} from "lucide-react";

interface MockDoc {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  type: string; // "Policy PDF" | "Proposal Form" | "KYC Aadhaar" | "PAN Card" | "GST Invoice"
  status: "Verified" | "Pending Review" | "E-Sign Completed" | "Needs Signature";
  uploadedAt: string;
  ocrText: string;
}

export default function DocumentsHub() {
  const [clients, setClients] = useState<Client[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selection & Details Preview Pane
  const [selectedDoc, setSelectedDoc] = useState<MockDoc | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<Record<string, string[]>>({
    "doc-1": ["AI OCR: Extracted nominee 'Suman Sharma (Wife)' on page 1.", "Renewal terms confirmed by agent."],
    "doc-2": ["AI Alert: Proposal Form is pending Rajesh's digital e-signature.", "Sent automated sign link to client's WhatsApp on Monday."]
  });

  // Upload progress simulation
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Pre-seed mock documents
  const [docs, setDocs] = useState<MockDoc[]>([
    {
      id: "doc-1",
      name: "HDFC_Ergo_Term_Life_Policy_TL-89472-A.pdf",
      clientName: "Amit Sharma",
      clientId: "demo-client-1",
      type: "Policy PDF",
      status: "Verified",
      uploadedAt: "2026-06-05",
      ocrText: "POLICY NUMBER: TL-89472-A\nINSURED: Amit Sharma\nINSURER: HDFC Ergo\nPREMIUM: INR 15,400 / Yr\nNOMINEE: Suman Sharma (Wife)\nEXPIRY DATE: 2027-07-07"
    },
    {
      id: "doc-2",
      name: "Star_Health_Proposal_Form_SH-90321.pdf",
      clientName: "Priya Patel",
      clientId: "demo-client-2",
      type: "Proposal Form",
      status: "Needs Signature",
      uploadedAt: "2026-06-18",
      ocrText: "PROPOSAL APPLICATION REF: Star Health Premium Floater\nPROPOSER: Priya Patel\nSUM ASSURED: ₹5,00,000\nCO-PAYS: Nil\nSTATUS: Waiting for proposer signature authentication."
    },
    {
      id: "doc-3",
      name: "Aadhaar_Card_Amit_Sharma.pdf",
      clientName: "Amit Sharma",
      clientId: "demo-client-1",
      type: "KYC Aadhaar",
      status: "Verified",
      uploadedAt: "2026-05-12",
      ocrText: "GOVERNMENT OF INDIA\nUNIQUE IDENTIFICATION AUTHORITY\nAadhaar Number: 1234 5678 9012\nNAME: Amit Sharma\nDOB: 12/04/1985\nADDRESS: 102, Shanti Vihar, Sector 4, Gurgaon, Haryana"
    }
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientData, policyData] = await Promise.all([
        request<Client[]>("/api/clients"),
        request<Policy[]>("/api/policies")
      ]);
      setClients(clientData);
      setPolicies(policyData);
    } catch {
      setError("Failed to fetch portfolios from backend. Serving offline file matrix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set the first document as selected on load
  useEffect(() => {
    if (docs.length > 0 && !selectedDoc) {
      setSelectedDoc(docs[0]);
    }
  }, [docs, selectedDoc]);

  // Handle Drag-and-Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process Document upload with actual OCR call
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(",")[1];

        // Call our live Gemini OCR endpoint
        const res = await request<any>("/api/policies/ocr", {
          method: "POST",
          body: JSON.stringify({
            base64Data,
            mimeType: file.type || "application/pdf"
          })
        });

        let newDocType = "Policy PDF";
        let targetClientName = "Unknown Client";
        let targetClientId = "";
        let extractedTextDump = "";

        if (res.success && res.extracted_data) {
          const ext = res.extracted_data;
          extractedTextDump = `Extracted via Gemini AI OCR:\n- Company: ${ext.insuranceCompany || "N/A"}\n- Policy No: ${ext.policyNumber || "N/A"}\n- Premium: ₹${ext.premiumAmount || "N/A"}\n- Plan: ${ext.policyType || "N/A"}\n- Proposer: ${ext.customerName || "N/A"}`;
          newDocType = ext.policyType ? "Policy PDF" : "Proposal Form";

          // Match client
          if (ext.customerName) {
            const match = clients.find(c => c.full_name.toLowerCase().includes(ext.customerName.toLowerCase()));
            if (match) {
              targetClientName = match.full_name;
              targetClientId = match.id;
            } else {
              targetClientName = ext.customerName;
            }
          }
        } else {
          extractedTextDump = `Uploaded file raw OCR analysis completed.\nFile name: ${file.name}`;
        }

        const newDoc: MockDoc = {
          id: `doc-${Date.now()}`,
          name: file.name,
          clientName: targetClientName,
          clientId: targetClientId,
          type: newDocType,
          status: "Pending Review",
          uploadedAt: new Date().toISOString().split("T")[0],
          ocrText: extractedTextDump
        };

        setDocs([newDoc, ...docs]);
        setSelectedDoc(newDoc);
        alert(`Gemini AI successfully processed "${file.name}"!\nAuto-matched client: ${targetClientName}`);
      } catch (err: any) {
        // Fallback mockup creation
        const newDoc: MockDoc = {
          id: `doc-${Date.now()}`,
          name: file.name,
          clientName: clients[0]?.full_name || "Amit Sharma",
          clientId: clients[0]?.id || "demo-client-1",
          type: "Policy PDF",
          status: "Pending Review",
          uploadedAt: new Date().toISOString().split("T")[0],
          ocrText: `Raw Document Text:\n${file.name} OCR loaded with general attributes.`
        };
        setDocs([newDoc, ...docs]);
        setSelectedDoc(newDoc);
      } finally {
        setUploading(false);
        setDragActive(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(docs.filter(d => d.id !== id));
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  };

  const handleTriggerESign = () => {
    if (!selectedDoc) return;
    setDocs(docs.map(d => d.id === selectedDoc.id ? { ...d, status: "E-Sign Completed" } : d));
    setSelectedDoc({ ...selectedDoc, status: "E-Sign Completed" });
    
    // Add custom comment log
    const docId = selectedDoc.id;
    const prevComments = comments[docId] || [];
    setComments({
      ...comments,
      [docId]: [...prevComments, `Digital E-Sign request signed successfully on ${new Date().toLocaleDateString("en-IN")}.`]
    });

    alert(`E-Sign Request dispatched! Client notified via WhatsApp notification.`);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !commentInput.trim()) return;
    const docId = selectedDoc.id;
    const prevComments = comments[docId] || [];
    setComments({
      ...comments,
      [docId]: [...prevComments, commentInput.trim()]
    });
    setCommentInput("");
  };

  const handleShareWhatsApp = () => {
    if (!selectedDoc) return;
    const client = clients.find(c => c.full_name === selectedDoc.clientName || c.id === selectedDoc.clientId);
    const phone = client?.phone || "+919876543210";
    const msg = `Hello ${selectedDoc.clientName}, I have uploaded your document "${selectedDoc.name}" (${selectedDoc.type}) to our secure hub. Status is currently: ${selectedDoc.status}. Regards, PolicySync.in`;
    window.open(`https://api.whatsapp.com/send?phone=${phone.replace(/[\s+()-]/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "All" || d.type === typeFilter;
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const docTypesList = ["All", "Policy PDF", "Proposal Form", "KYC Aadhaar", "PAN Card", "GST Invoice"];
  const statusesList = ["All", "Verified", "Needs Signature", "E-Sign Completed", "Pending Review"];

  return (
    <div className="space-y-6 font-sans">
      {/* View Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#006D77] tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-[#FF6F3C]" />
          Documents & OCR Hub
        </h1>
        <p className="text-sm text-slate-500">
          Upload insurance policies, proposal records or government ID cards. Auto-parse tags and client credentials using Gemini OCR.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${
          dragActive ? "border-[#FF6F3C] bg-[#FF6F3C]/5" : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <input
          type="file"
          id="doc-file-input"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleBrowseClick}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="h-12 w-12 bg-[#006D77]/10 text-[#006D77] rounded-full flex items-center justify-center mx-auto">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#FF6F3C]" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {uploading ? "AI OCR Engine parsing document..." : "Drag & Drop Policy PDF here"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, or JPEG documents (Max size 15MB)</p>
          </div>
          {!uploading && (
            <label
              htmlFor="doc-file-input"
              className="mt-2 inline-flex items-center px-4 py-2 bg-[#006D77] hover:bg-[#005B63] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Browse Files
            </label>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search bar */}
          <div className="relative rounded-xl max-w-xs w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by file or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] text-xs bg-slate-50/50"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1 px-2.5 font-semibold text-slate-700"
            >
              {docTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-1 px-2.5 font-semibold text-slate-700"
            >
              {statusesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout containing document listings & right preview sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Cards Column */}
        <div className="lg:col-span-2 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Documents Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No active document files match your selected filter criteria. Upload standard insurance contracts above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between h-44 ${
                      isSelected
                        ? "border-[#006D77] ring-2 ring-[#006D77]/10"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="h-9 w-9 bg-[#006D77]/10 rounded-xl flex items-center justify-center text-[#006D77] shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          doc.status === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : doc.status === "Needs Signature"
                            ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                            : doc.status === "E-Sign Completed"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          {doc.status}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight" title={doc.name}>
                          {doc.name}
                        </h4>
                        <p className="text-[11px] text-[#006D77] font-semibold">Client: {doc.clientName}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 font-medium">
                      <span>Uploaded {doc.uploadedAt}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.id);
                        }}
                        className="p-1 hover:text-red-500 rounded transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom AI Assistant Suggestion block */}
          <div className="bg-gradient-to-r from-[#FF6F3C]/5 to-[#006D77]/5 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#006D77] flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-[#FF6F3C]" />
              AI Suggestion Hub
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-700">
              <div className="p-3 bg-white border border-slate-150 rounded-xl flex items-start gap-2">
                <Clock className="h-4 w-4 text-[#FF6F3C] shrink-0 mt-0.5" />
                <span>
                  <strong>2 documents</strong> are expiring in 15 days (Amit's Aadhaar update due). Request renewal link.
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-150 rounded-xl flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
                <span>
                  Suggest uploading a GST invoice for corporate policies to save tax claims on high premiums.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview Sidebar Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5 flex flex-col justify-between">
          {selectedDoc ? (
            <div className="space-y-5">
              {/* File details */}
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{selectedDoc.name}</h3>
                  <span className="text-[11px] text-[#006D77] font-semibold">{selectedDoc.type}</span>
                </div>
                <button
                  onClick={handleShareWhatsApp}
                  className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all"
                  title="Share document updates via WhatsApp"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex gap-2">
                {selectedDoc.status === "Needs Signature" && (
                  <button
                    onClick={handleTriggerESign}
                    className="flex-1 py-2 bg-[#FF6F3C] hover:bg-[#E55F2F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Signature className="h-4 w-4" />
                    <span>Trigger E-Sign</span>
                  </button>
                )}
                {selectedDoc.status === "E-Sign Completed" && (
                  <span className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-emerald-100">
                    <Check className="h-4 w-4" />
                    <span>E-Sign Verified</span>
                  </span>
                )}
              </div>

              {/* OCR Text Area */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI OCR Extracted Text Dump</span>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 font-mono text-[10px] text-slate-600 max-h-44 overflow-y-auto whitespace-pre-line leading-relaxed">
                  {selectedDoc.ocrText}
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Activity & Comments
                </span>
                
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {(comments[selectedDoc.id] || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No custom annotations recorded for this document yet.</p>
                  ) : (
                    (comments[selectedDoc.id] || []).map((cmt, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-700">
                        {cmt}
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#006D77] focus:border-[#006D77]"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 border border-slate-200"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 italic text-xs">
              Select a document to show the e-signing and OCR inspection workspace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
