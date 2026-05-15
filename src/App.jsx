import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ProductApp from "./ProductApp.jsx";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Gauge,
  LineChart,
  Linkedin,
  Lock,
  Menu,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  Twitter,
  WalletCards,
  X,
  Youtube,
  Zap,
} from "lucide-react";

const cashFlowData = [
  { month: "Jan", inflow: 122, outflow: 78, forecast: 96 },
  { month: "Feb", inflow: 138, outflow: 82, forecast: 105 },
  { month: "Mar", inflow: 126, outflow: 91, forecast: 92 },
  { month: "Apr", inflow: 149, outflow: 88, forecast: 118 },
  { month: "May", inflow: 158, outflow: 103, forecast: 126 },
  { month: "Jun", inflow: 142, outflow: 117, forecast: 88 },
  { month: "Jul", inflow: 171, outflow: 111, forecast: 139 },
];

const revenueData = [
  { week: "W1", value: 42 },
  { week: "W2", value: 51 },
  { week: "W3", value: 48 },
  { week: "W4", value: 63 },
  { week: "W5", value: 58 },
  { week: "W6", value: 72 },
];

const features = [
  {
    icon: LineChart,
    title: "AI Cash Flow Forecasting",
    text: "Predict future balances from receivables, expenses, seasonality, and payment behavior.",
  },
  {
    icon: Gauge,
    title: "Risk Scoring System",
    text: "Spot deteriorating liquidity conditions with explainable daily risk grades.",
  },
  {
    icon: Zap,
    title: "What-If Simulation",
    text: "Model delayed invoices, new hires, larger inventory orders, or slower revenue cycles.",
  },
  {
    icon: BellRing,
    title: "Smart Financial Alerts",
    text: "Get warnings before cash dips, payment delays, or expense spikes become urgent.",
  },
  {
    icon: BarChart3,
    title: "Expense Trend Analysis",
    text: "Understand where spend is rising and which vendors affect runway the most.",
  },
  {
    icon: Sparkles,
    title: "Predictive Insights Dashboard",
    text: "Turn complex accounting data into recommended actions your team can use immediately.",
  },
];

const benefits = [
  "Prevent Cash Shortages",
  "Improve Financial Planning",
  "Reduce Business Risk",
  "Make Faster Decisions",
  "Affordable for SMEs",
  "No Finance Expertise Needed",
];

const testimonials = [
  {
    quote:
      "FlowGuard AI gave us a three-week warning before a supplier-heavy month. We moved a few payouts and avoided drawing on our credit line.",
    name: "Lyxter",
    role: "Founder, Laguna Home Living",
    img: "/lyxter-profile.png",
  },
  {
    quote:
      "The risk score is simple enough for my ops team and detailed enough for our accountant. It changed how we plan payroll every cutoff.",
    name: "Paolo Reyes",
    role: "Owner, Cebu North Logistics",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
  },
  {
    quote:
      "We finally have a forecast that reacts to late customer payments. It feels like having a finance lead watching the numbers every day.",
    name: "Trisha Santos",
    role: "CEO, Davao Harvest Foods",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$29",
    text: "For small teams getting serious about cash visibility.",
    features: ["1 business entity", "30-day forecast", "Basic alerts", "Excel workbook upload"],
  },
  {
    name: "Growth",
    price: "$79",
    text: "For growing SMEs that need deeper forecasting and scenarios.",
    popular: true,
    features: ["3 business entities", "12-month forecast", "Risk scoring", "What-if simulations", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    text: "For multi-location teams with advanced finance workflows.",
    features: ["Unlimited entities", "Custom models", "Audit controls", "Dedicated onboarding", "SAML SSO"],
  },
];

const faqs = [
  {
    q: "How accurate is the AI?",
    a: "FlowGuard AI combines accounting history, payment timing, expense trends, and market signals. Accuracy varies by data quality, but customers typically see forecast confidence above 90% after the first complete workbook upload.",
  },
  {
    q: "Is my financial data secure?",
    a: "Yes. The platform is designed with bank-grade encryption, role-based access, audit logs, and secure handling for uploaded financial workbooks.",
  },
  {
    q: "Can small businesses use this?",
    a: "Absolutely. FlowGuard AI is built for SMEs that need CFO-level foresight without hiring a finance team.",
  },
  {
    q: "Does it integrate with accounting software?",
    a: "It can work without accounting software. Teams can upload the Excel files they already use for balances, receivables, payables, payroll, and sales tracking.",
  },
];

const section = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makePoints(data, key, width = 560, height = 210, pad = 18) {
  const values = data.map((item) => item[key]);
  const min = Math.min(...values) - 8;
  const max = Math.max(...values) + 8;
  return data
    .map((item, index) => {
      const x = pad + (index * (width - pad * 2)) / (data.length - 1);
      const y = height - pad - ((item[key] - min) / (max - min)) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function CashFlowChart() {
  const width = 560;
  const height = 230;
  const inflow = makePoints(cashFlowData, "inflow", width, height);
  const forecast = makePoints(cashFlowData, "forecast", width, height);
  const outflow = makePoints(cashFlowData, "outflow", width, height);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role="img" aria-label="Cash flow forecast chart">
      <defs>
        <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#37f5a9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#37f5a9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[52, 96, 140, 184].map((y) => (
        <line key={y} x1="18" x2="542" y1={y} y2={y} stroke="rgba(255,255,255,.08)" />
      ))}
      <polygon points={`18,212 ${inflow} 542,212`} fill="url(#cashFill)" />
      <polygon points={`18,212 ${forecast} 542,212`} fill="url(#forecastFill)" />
      <polyline points={inflow} fill="none" stroke="#37f5a9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={forecast} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={outflow} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 8" />
      {cashFlowData.map((item, index) => (
        <text key={item.month} x={18 + (index * 524) / (cashFlowData.length - 1)} y="226" textAnchor="middle" className="fill-slate-400 text-[12px]">
          {item.month}
        </text>
      ))}
    </svg>
  );
}

function RevenueChart() {
  const width = 720;
  const height = 210;
  const points = makePoints(revenueData, "value", width, height);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role="img" aria-label="Revenue trend chart">
      {[42, 82, 122, 162].map((y) => (
        <line key={y} x1="18" x2="702" y1={y} y2={y} stroke="rgba(255,255,255,.08)" />
      ))}
      <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {revenueData.map((item, index) => {
        const [x, y] = points.split(" ")[index].split(",");
        return (
          <g key={item.week}>
            <circle cx={x} cy={y} r="5" fill="#37f5a9" />
            <text x={18 + (index * 684) / (revenueData.length - 1)} y="204" textAnchor="middle" className="fill-slate-400 text-[12px]">
              {item.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 23) % 100}%`,
        delay: (i % 9) * 0.35,
        size: 2 + (i % 4),
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-70">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-cyan-300/50 blur-[1px]"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [-10, 24, -10], opacity: [0.15, 0.8, 0.15] }}
          transition={{ duration: 5 + (p.id % 6), delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function Navbar({ dark, setDark }) {
  const [open, setOpen] = useState(false);
  const links = ["Platform", "Dashboard", "Pricing", "FAQ"];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl dark:bg-slate-950/70">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <a href="#top" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-mint to-ocean text-slate-950 shadow-mint">
            <ShieldCheck size={22} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">FlowGuard AI</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link} href={`#${link.toLowerCase()}`} className="text-sm text-slate-300 transition hover:text-white">
              {link}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <button
            aria-label="Toggle color mode"
            onClick={() => setDark(!dark)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100" href="/app">
            Open App
          </a>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-white/10 bg-slate-950/95 px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setOpen(false)} className="text-slate-200">
                {link}
              </a>
            ))}
            <button onClick={() => setDark(!dark)} className="flex items-center gap-2 text-slate-200">
              {dark ? <Sun size={18} /> : <Moon size={18} />} Toggle mode
            </button>
            <a href="/app" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
              Open App
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function MiniMetric({ icon: Icon, label, value, trend }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between text-slate-300">
        <Icon size={18} />
        <span className={cn("text-xs font-semibold", trend === "good" ? "text-mint" : "text-rose-400")}>{trend === "good" ? "+8.4%" : "Watch"}</span>
      </div>
      <p className="mt-5 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

function DashboardMockup({ compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className={cn("relative mx-auto w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/[0.07] p-3 shadow-glow backdrop-blur-2xl", compact && "max-w-5xl")}
    >
      <div className="absolute -inset-1 -z-10 rounded-[30px] bg-gradient-to-br from-cyan-400/30 via-emerald-300/15 to-blue-600/25 blur-2xl" />
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Live cash intelligence</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Risk Command Center</h3>
          </div>
          <div className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">Low Risk</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric icon={WalletCards} label="Projected cash" value="$482K" trend="good" />
          <MiniMetric icon={Clock3} label="Runway" value="7.8 mo" trend="good" />
          <MiniMetric icon={AlertTriangle} label="At-risk invoices" value="$38K" trend="warn" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_.95fr]">
          <div className="glass rounded-2xl p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Cash Flow Forecast</p>
                <p className="text-xs text-slate-400">Next 90 days, AI confidence 95%</p>
              </div>
              <TrendingUp className="text-mint" size={20} />
            </div>
            <div className="h-64">
              <CashFlowChart />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Risk Score</p>
                <Gauge className="text-cyan-200" size={20} />
              </div>
              <div className="relative mx-auto mt-5 grid h-36 w-36 place-items-center rounded-full bg-conic">
                <div className="grid h-28 w-28 place-items-center rounded-full bg-slate-950">
                  <div className="text-center">
                    <p className="text-4xl font-semibold text-white">18</p>
                    <p className="text-xs text-mint">LOW RISK</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-medium text-white">AI Recommendations</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p className="rounded-xl bg-mint/10 p-3 text-mint">Collect invoice FG-204 by Jun 12 to protect payroll buffer.</p>
                <p className="rounded-xl bg-cyan-400/10 p-3 text-cyan-100">Delay non-critical inventory purchase by 9 days.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-24 pt-32 lg:px-8 lg:pt-40">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            <Bot size={16} /> AI-powered Smart Cash Flow Risk Predictor
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-[4rem] lg:leading-[1.1]">
            Predict Cash Flow Problems Before They Happen
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            FlowGuard AI helps SMEs forecast cash shortages, analyze financial risks, and make smarter business decisions using AI-powered insights.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/app" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-mint to-ocean px-6 py-3 font-semibold text-slate-950 shadow-mint transition hover:scale-[1.02]">
              Start Free Trial <ArrowRight size={18} />
            </a>
            <a href="#dashboard" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              <Play size={18} /> Watch Demo
            </a>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Check size={16} className="text-mint" /> No credit card required</span>
            <span className="flex items-center gap-2"><Lock size={16} className="text-mint" /> Bank-grade encryption</span>
          </div>
        </motion.div>
        <DashboardMockup />
      </div>
    </section>
  );
}

function Trust() {
  return (
    <motion.section variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["10,000+", "SMEs Protected"],
          ["95%", "Forecast Accuracy"],
          ["$50M+", "Financial Risks Prevented"],
        ].map(([value, label]) => (
          <div key={label} className="glass rounded-2xl p-6 text-center">
            <p className="text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 opacity-80">
        {["NOVA BANK", "LEDGERLY", "KIN FINANCE", "BRIGHTBOOK", "ATLAS PAY"].map((logo) => (
          <span key={logo} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-xs font-semibold tracking-[0.2em] text-slate-400">
            {logo}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

function Problem() {
  const items = [
    [AlertTriangle, "Late customer payments", "Receivables arrive days or weeks after payroll and vendor bills are due."],
    [TrendingDown, "Revenue fluctuations", "Seasonality, churn, and order volatility hide future cash gaps."],
    [CircleDollarSign, "Unexpected expenses", "Tax, supplier, and inventory spikes can erase operating buffers."],
    [LineChart, "Poor cash forecasting", "Spreadsheet forecasts go stale before decisions reach the team."],
    [WalletCards, "Financial blind spots", "Static spreadsheets miss the signals that accounting data already contains."],
  ];
  return (
    <motion.section variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="section-kicker">The SME cash gap</p>
          <h2 className="section-title">Most cash flow problems are visible too late.</h2>
          <p className="section-copy">FlowGuard AI turns delayed payments, expense changes, and forecasting uncertainty into early signals your business can act on.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(([Icon, title, text]) => (
            <div key={title} className="glass group rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300/30">
              <div className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function Solution() {
  return (
    <motion.section id="platform" variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="section-kicker">The FlowGuard AI platform</p>
        <h2 className="section-title">AI forecasting, risk scoring, and alerts in one finance cockpit.</h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <motion.div key={title} whileHover={{ y: -7 }} className="glass rounded-2xl p-6">
            <div className="mb-6 inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-mint/20 to-ocean/20 text-cyan-100">
              <Icon size={24} />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function InteractiveDashboard() {
  return (
    <motion.section id="dashboard" variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="section-kicker">Interactive dashboard</p>
            <h2 className="section-title">A financial radar built for operators.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400 sm:text-base">Monitor runway, inspect forecast changes, compare revenue momentum, and receive AI recommendations before risk escalates.</p>
        </div>
        <DashboardMockup compact />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <p className="mb-4 text-sm font-medium text-white">Revenue Trends</p>
            <div className="h-56">
              <RevenueChart />
            </div>
          </div>
            <div className="glass rounded-2xl p-5">
              <p className="mb-4 text-sm font-medium text-white">Upcoming Expense Alerts</p>
              <div className="space-y-3">
                {["Payroll due in 6 days", "Supplier invoice increased 18%", "Tax reserve below target"].map((alert) => (
                  <div key={alert} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">
                    <BellRing size={16} className="shrink-0 text-amber-300" /> {alert}
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>
    </motion.section>
  );
}

function HowItWorks() {
  const steps = [
    ["01", "Upload Your Excel Files", "Bring in the workbooks your team already uses for cash, receivables, payroll, and expenses."],
    ["02", "AI Analyzes Financial Data", "Models detect receivable patterns, spend changes, and liquidity risk."],
    ["03", "Receive Forecasts & Risk Warnings", "Your team gets recommended actions and early alerts."],
  ];
  return (
    <motion.section variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="section-kicker">How it works</p>
        <h2 className="section-title">From accounting data to operating decisions.</h2>
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {steps.map(([number, title, text]) => (
          <div key={title} className="glass relative rounded-2xl p-6">
            <span className="text-sm font-semibold text-mint">{number}</span>
            <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {["Cash Position.xlsx", "Receivables Tracker.xlsx", "Payroll Schedule.xlsx"].map((sheet) => (
          <span key={sheet} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white">
            <Building2 size={17} /> {sheet}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

function Benefits() {
  return (
    <motion.section variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="section-kicker">Business outcomes</p>
          <h2 className="section-title">Better decisions without finance complexity.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit} className="glass flex items-center gap-4 rounded-2xl p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-mint/10 text-mint">
                <Check size={18} />
              </span>
              <span className="font-medium text-white">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function Testimonials() {
  return (
    <motion.section variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="section-kicker">Customers</p>
        <h2 className="section-title">Built for business owners who need clarity fast.</h2>
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.name} className="glass rounded-2xl p-6">
            <p className="leading-7 text-slate-300">"{t.quote}"</p>
            <div className="mt-6 flex items-center gap-4">
              <img src={t.img} alt={t.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-sm text-slate-400">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function Pricing() {
  return (
    <motion.section id="pricing" variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="section-kicker">Pricing</p>
        <h2 className="section-title">Simple plans for every SME stage.</h2>
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {pricing.map((plan) => (
          <div key={plan.name} className={cn("glass rounded-2xl p-6", plan.popular && "border-mint/40 bg-mint/[0.08] shadow-mint")}>
            {plan.popular && <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-slate-950">Most popular</span>}
            <h3 className="mt-5 text-2xl font-semibold text-white">{plan.name}</h3>
            <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{plan.text}</p>
            <div className="mt-6 flex items-end gap-2">
              <span className="text-4xl font-semibold text-white">{plan.price}</span>
              {plan.price !== "Custom" && <span className="pb-1 text-slate-400">/month</span>}
            </div>
            <a href="#top" className={cn("mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold transition", plan.popular ? "bg-gradient-to-r from-mint to-ocean text-slate-950" : "border border-white/10 bg-white/5 text-white hover:bg-white/10")}>
              Get started
            </a>
            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <p key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                  <Check size={16} className="text-mint" /> {feature}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <motion.section id="faq" variants={section} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
      <div className="text-center">
        <p className="section-kicker">FAQ</p>
        <h2 className="section-title">Questions finance teams ask first.</h2>
      </div>
      <div className="mt-10 space-y-3">
        {faqs.map((faq, index) => (
          <div key={faq.q} className="glass rounded-2xl">
            <button onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-5 text-left text-white">
              <span className="font-semibold">{faq.q}</span>
              <ChevronDown className={cn("shrink-0 transition", open === index && "rotate-180")} size={18} />
            </button>
            {open === index && <p className="px-5 pb-5 text-sm leading-6 text-slate-400">{faq.a}</p>}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-white/[0.06] to-emerald-300/20 p-6 text-center shadow-glow sm:p-10">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-6xl">Stop Guessing. Start Predicting.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-slate-300">Give your team the cash flow visibility, risk warnings, and AI guidance needed to operate with confidence.</p>
        <a href="/app" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100">
          Get Started Today <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

function AssistantWidget() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="fixed bottom-10 right-10 z-40 hidden w-64 rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-glow backdrop-blur-xl md:block">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-mint to-ocean text-slate-950">
          <Bot size={20} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">FlowGuard Assistant</p>
          <p className="text-xs text-slate-400">Cash risk changed 4 min ago</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">Invoice delays may reduce next month's buffer by $18.4K. Review payment plan?</p>
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-12 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-mint to-ocean text-slate-950">
              <ShieldCheck size={22} />
            </span>
            <span className="text-lg font-semibold">FlowGuard AI</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">AI-powered cash flow risk prediction for ambitious SMEs.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            ["Product", "Forecasting", "Risk Score", "Dashboard", "Imports"],
            ["Company", "About", "Careers", "Partners", "Contact"],
            ["Legal", "Security", "Status", "Terms", "Privacy"],
          ].map(([title, ...links]) => (
            <div key={title}>
              <p className="font-semibold text-white">{title}</p>
              <div className="mt-4 space-y-3">
                {links.map((link) => (
                  <a key={link} href="#top" className="block text-sm text-slate-400 transition hover:text-white">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3 sm:col-start-3">
            {[
              [Linkedin, "LinkedIn"],
              [Twitter, "X"],
              [Youtube, "YouTube"],
            ].map(([Icon, label]) => (
              <a key={label} href="#top" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white">
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [dark, setDark] = useState(true);
  const isProductApp = typeof window !== "undefined" && window.location.pathname.startsWith("/app");

  if (isProductApp) {
    return <ProductApp />;
  }

  return (
    <div className={cn(dark ? "dark" : "light-theme", "min-h-screen")}>
      <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950 dark:bg-radial-grid dark:text-white">
        <Particles />
        <Navbar dark={dark} setDark={setDark} />
        <Hero />
        <Trust />
        <Problem />
        <Solution />
        <InteractiveDashboard />
        <HowItWorks />
        <Benefits />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
        <AssistantWidget />
      </main>
    </div>
  );
}
