export const INITIAL_KEYWORDS = [
  { id: 'kw-1', name: 'Artificial Intelligence', priority: 'High', color: 'violet', enabled: true },
  { id: 'kw-2', name: 'Software Discounts', priority: 'High', color: 'emerald', enabled: true },
  { id: 'kw-3', name: 'Infrastructure', priority: 'Medium', color: 'amber', enabled: true },
  { id: 'kw-4', name: 'Cloud Grants', priority: 'High', color: 'rose', enabled: true },
  { id: 'kw-5', name: 'Developer Tools', priority: 'Low', color: 'slate', enabled: true },
];

export const INITIAL_ITEMS = [
  {
    id: "item_001",
    title: "HCP Terraform Essentials & Standard Plan Restructure",
    summary: "HashiCorp introduced updated resource-based pricing (RUM) starting at $0.10/resource/month with 500 free resources for small teams.",
    source: {
      name: "HashiCorp Pricing",
      url: "https://www.hashicorp.com/en/pricing?tab=terraform",
      domain: "hashicorp.com",
      favicon: "https://www.google.com/s2/favicons?domain=hashicorp.com&sz=64"
    },
    type: "deal",
    keywords: ["Software Discounts", "Infrastructure", "Developer Tools"],
    priority: 95,
    offer: {
      description: "500 Managed Resources Free + $500 Trial Credit",
      discountValue: "Free Tier",
      expiresAt: "2026-10-31T23:59:00Z"
    },
    deadline: {
      dueAt: "2026-10-31T23:59:00Z",
      reminderEnabled: true
    },
    capturedAt: "2026-10-14T14:30:00Z",
    updatedAt: "2026-10-14T15:00:00Z",
    status: "unread",
    isSaved: true
  },
  {
    id: "item_002",
    title: "GitHub Student Developer Pack: $200 Azure Credit Deadline",
    summary: "Eligible students must re-verify academic credentials to preserve access to free cloud instances and domain credits.",
    source: {
      name: "GitHub Education",
      url: "https://education.github.com",
      domain: "github.com",
      favicon: "https://www.google.com/s2/favicons?domain=github.com&sz=64"
    },
    type: "deadline",
    keywords: ["Software Discounts", "Developer Tools"],
    priority: 90,
    offer: {
      description: "Annual verification required for pack maintenance",
      discountValue: "100% OFF",
      expiresAt: "2026-10-15T18:00:00Z"
    },
    deadline: {
      dueAt: "2026-10-15T18:00:00Z",
      reminderEnabled: true
    },
    capturedAt: "2026-10-14T10:15:00Z",
    updatedAt: "2026-10-14T10:15:00Z",
    status: "unread",
    isSaved: false
  },
  {
    id: "item_003",
    title: "Anthropic Claude 3.7 Sonnet API Pricing Grant Program",
    summary: "Research grant applications open for teams utilizing hybrid reasoning models. Approved projects receive $5,000 in monthly API credits.",
    source: {
      name: "Anthropic Console",
      url: "https://anthropic.com",
      domain: "anthropic.com",
      favicon: "https://www.google.com/s2/favicons?domain=anthropic.com&sz=64"
    },
    type: "deal",
    keywords: ["Artificial Intelligence", "Cloud Grants"],
    priority: 88,
    offer: {
      description: "Up to $5,000 monthly API usage grant",
      discountValue: "$5,000 Credit",
      expiresAt: "2026-10-20T12:00:00Z"
    },
    deadline: {
      dueAt: "2026-10-20T12:00:00Z",
      reminderEnabled: true
    },
    capturedAt: "2026-10-13T16:20:00Z",
    updatedAt: "2026-10-13T16:20:00Z",
    status: "read",
    isSaved: true
  },
  {
    id: "item_004",
    title: "AWS Activate Founder Grant Renewal Notice",
    summary: "Early-stage startup AWS credits are eligible for top-tier bump to $25,000 for teams using infrastructure-as-code automation.",
    source: {
      name: "AWS Activate",
      url: "https://aws.amazon.com",
      domain: "aws.amazon.com",
      favicon: "https://www.google.com/s2/favicons?domain=aws.amazon.com&sz=64"
    },
    type: "announcement",
    keywords: ["Cloud Grants", "Infrastructure"],
    priority: 75,
    offer: {
      description: "Tier upgrade to $25,000 credits",
      discountValue: "Grant",
      expiresAt: null
    },
    deadline: {
      dueAt: "2026-11-05T00:00:00Z",
      reminderEnabled: false
    },
    capturedAt: "2026-10-12T09:00:00Z",
    updatedAt: "2026-10-12T09:00:00Z",
    status: "read",
    isSaved: false
  },
  {
    id: "item_005",
    title: "Vercel Enterprise Pro Trial Extension",
    summary: "Pro plan members can activate Preview Deployment Guardrails free for 60 days.",
    source: {
      name: "Vercel Dashboard",
      url: "https://vercel.com",
      domain: "vercel.com",
      favicon: "https://www.google.com/s2/favicons?domain=vercel.com&sz=64"
    },
    type: "deal",
    keywords: ["Developer Tools"],
    priority: 60,
    offer: {
      description: "60-day trial for Guardrails & Firewall",
      discountValue: "Free Extension",
      expiresAt: "2026-10-14T22:00:00Z"
    },
    deadline: {
      dueAt: "2026-10-14T22:00:00Z",
      reminderEnabled: true
    },
    capturedAt: "2026-10-14T12:00:00Z",
    updatedAt: "2026-10-14T12:00:00Z",
    status: "unread",
    isSaved: false
  }
];