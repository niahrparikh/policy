import React, { useEffect, useState } from "react";
import { Client, Policy } from "../types";
import { request } from "../utils/api";
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  X, 
  Clipboard, 
  CreditCard, 
  Phone, 
  Mail, 
  MapPin, 
  Heart,
  Calendar,
  AlertCircle
} from "lucide-react";

interface ClientsListProps {
  onScanRedirect: () => void;
}

export default function ClientsList({ onScanRedirect }: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed Modal Context
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Add/Edit Forms state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editClientId, setEditClientId] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [nomineeName, setNomineeName] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
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
      setError(err.message || "Failed to load clients. If trial expired, upgrade.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateForm = () => {
    setFormMode("create");
    setFullName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setPanNumber("");
    setAadhaarNumber("");
    setNomineeName("");
    setNotes("");
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setFormMode("edit");
    setEditClientId(client.id);
    setFullName(client.full_name);
    setPhone(client.phone);
    setEmail(client.email);
    setAddress(client.address);
    setPanNumber(client.pan_number);
    setAadhaarNumber(client.aadhaar_number);
    setNomineeName(client.nominee_name);
    setNotes(client.notes);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      setError("Name and Phone Number are mandatory");
      return;
    }

    try {
      if (formMode === "create") {
        const newClient = await request<Client>("/api/clients", {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName,
            phone,
            email,
            address,
            pan_number: panNumber,
            aadhaar_number: aadhaarNumber,
            nominee_name: nomineeName,
            notes,
          }),
        });
        setClients([newClient, ...clients]);
      } else {
        const updated = await request<Client>(`/api/clients/${editClientId}`, {
          method: "PUT",
          body: JSON.stringify({
            full_name: fullName,
            phone,
            email,
            address,
            pan_number: panNumber,
            aadhaar_number: aadhaarNumber,
            nominee_name: nomineeName,
            notes,
          }),
        });
        setClients(clients.map((c) => (c.id === editClientId ? updated : c)));
        if (selectedClient?.id === editClientId) {
          setSelectedClient(updated);
        }
      }
      setIsFormOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to persist client record.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you absolutely sure? Deleting this client will also cascade-delete all their policies!")) {
      return;
    }

    try {
      await request(`/api/clients/${id}`, { method: "DELETE" });
      setClients(clients.filter((c) => c.id !== id));
      setPolicies(policies.filter((p) => p.client_id !== id));
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete client.");
    }
  };

  const filteredClients = clients.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-[#0504AA]" />
            Client Relationship Manager
          </h1>
          <p className="text-sm text-slate-500">Add, edit, and explore user portfolios and client credentials</p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#0504AA] hover:bg-[#04038F] text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Client</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      {/* Main List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients Column List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Inputs */}
          <div className="relative rounded-xl w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search clients by name, phone, or email ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm bg-white shadow-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0504AA] mx-auto"></div>
              <p className="text-sm text-slate-500 mt-2 font-medium">Assembling client tables...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Clients Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active directories exist. Click "New Client" to configure your first policyholders!
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
              {filteredClients.map((client) => {
                const clientPolicies = policies.filter((p) => p.client_id === client.id);
                const isSelected = selectedClient?.id === client.id;
                return (
                  <div
                    key={client.id}
                    className={`p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                      isSelected ? "bg-[#E8E8FF]/20 border-l-4 border-l-[#0504AA]" : ""
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-950">{client.full_name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-[#0504AA] border border-indigo-100">
                          {clientPolicies.length} {clientPolicies.length === 1 ? "Policy" : "Policies"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {client.phone}
                        </span>
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> {client.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditForm(client)}
                        className="p-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl transition-colors bg-white shadow-sm"
                        title="Edit Client"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-xl transition-colors bg-white shadow-sm"
                        title="Delete Client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Client Profile Details View / Dashboard */}
        <div className="space-y-6">
          {selectedClient ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 relative">
              <button
                onClick={() => setSelectedClient(null)}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title Header */}
              <div className="text-center pt-2">
                <div className="h-16 w-16 bg-indigo-50 text-[#0504AA] flex items-center justify-center rounded-full text-xl font-bold mx-auto mb-3 border border-indigo-100">
                  {selectedClient.full_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-lg font-bold text-slate-950">{selectedClient.full_name}</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">ID: {selectedClient.id}</p>
              </div>

              {/* Contact Grid */}
              <div className="space-y-3.5 border-t border-b border-slate-100 py-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Credentials</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-3 text-xs text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">{selectedClient.phone}</span>
                  </div>
                  {selectedClient.email && (
                    <div className="flex items-center space-x-3 text-xs text-slate-700">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="flex items-start space-x-3 text-xs text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{selectedClient.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* KYC Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">KYC Verification</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-0.5">PAN Card</span>
                    <span className="font-mono font-bold text-slate-800">{selectedClient.pan_number || "NOT RECORDED"}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-0.5">Aadhaar Card</span>
                    <span className="font-mono font-bold text-slate-800">{selectedClient.aadhaar_number || "NOT RECORDED"}</span>
                  </div>
                </div>
                {selectedClient.nominee_name && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-slate-400 font-semibold">Nominee: </span>
                      <span className="font-bold text-slate-800">{selectedClient.nominee_name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Client Policies Nested list */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Associated Policies</h4>
                  <button
                    onClick={onScanRedirect}
                    className="text-[#0504AA] hover:text-[#04038F] text-xs font-bold"
                  >
                    + Scan Policy
                  </button>
                </div>
                {policies.filter((p) => p.client_id === selectedClient.id).length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-[11px] text-slate-500">No insurance policies synced to this profile yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {policies
                      .filter((p) => p.client_id === selectedClient.id)
                      .map((p) => (
                        <div key={p.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-tight">{p.policy_type}</span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{p.insurance_company} | {p.policy_number}</span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            p.status === "Active" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : p.status === "Pending Renewal" 
                              ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse" 
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="space-y-2 bg-indigo-50/40 p-3.5 border border-indigo-100/30 rounded-xl text-xs text-indigo-950">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Clipboard className="h-4 w-4" />
                    Advisor Sync Notes
                  </span>
                  <p className="leading-relaxed font-medium">{selectedClient.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm h-full min-h-[450px]">
              <Users className="h-12 w-12 text-slate-200 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Selection</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Choose a client profile from the list to view secure details, nominee settings, registered KYC records, and active policies instantly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Slide / Popup Dialog Form: Add/Edit Client */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto relative border border-slate-200 animate-scale-in">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0504AA]" />
                {formMode === "create" ? "Add Client Profile" : "Edit Client Credentials"}
              </h3>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 94440 12345"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email ID</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@gmail.com"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Home / Office Address</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete postal location details..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* PAN / Aadhaar */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Aadhaar Card</label>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value)}
                      placeholder="1234-5678-9012"
                      className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Nominee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nominee Name</label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="e.g. Sunita Chandra (Wife)"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Advisor Notes / Preferences</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Preferred language, custom policy requirements..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0504AA]/20 focus:border-[#0504AA] text-sm"
                  />
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
                  {formMode === "create" ? "Save Client" : "Update Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
