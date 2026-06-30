export interface User {
  id: string;
  name: string;
  email: string;
  role: "Agent" | "Agency Admin";
  agency_name: string;
  whatsapp_number: string;
  subscription_status: "trial" | "active" | "expired";
  trial_start_date: string;
  trial_end_date: string;
  razorpay_subscription_id?: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  pan_number: string;
  aadhaar_number: string;
  nominee_name: string;
  notes: string;
  created_at: string;
}

export interface Policy {
  id: string;
  user_id: string;
  client_id: string;
  policy_type: string;
  insurance_company: string;
  policy_number: string;
  premium_amount: number;
  payment_frequency: "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
  start_date: string;
  expiry_date: string;
  renewal_date: string;
  commission_percentage: number;
  document_url: string;
  extracted_data_json: string;
  status: "Active" | "Expired" | "Pending Renewal";
  created_at: string;
}

export interface AlertItem {
  policyId: string;
  clientName: string;
  clientPhone: string;
  policyType: string;
  policyNumber: string;
  insuranceCompany: string;
  expiryDate: string;
  premiumAmount: number;
  daysLeft: number;
  severity: "critical" | "warning";
}

export interface DashboardSummary {
  totalClients: number;
  activePoliciesCount: number;
  expiringIn7DaysCount: number;
  expiringIn30DaysCount: number;
  monthlyExpectedCommission: number;
  alertList: AlertItem[];
}

export interface DistributionItem {
  name: string;
  value: number;
}

export interface ForecastItem {
  month: string;
  premium: number;
  commission: number;
}

export interface HistoryItem {
  month: string;
  commission: number;
}

export interface ReportsData {
  premiumUnderManagement: number;
  policyDistribution: DistributionItem[];
  monthlyForecast: ForecastItem[];
  commissionHistory: HistoryItem[];
}
