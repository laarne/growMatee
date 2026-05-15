import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  Bot,
  Building2,
  Calculator,
  CircleDollarSign,
  Clock3,
  Download,
  FileWarning,
  Gauge,
  LayoutDashboard,
  LineChart,
  Lock,
  Mail,
  MoreHorizontal,
  Plug,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const appForecast = [
  { label: "May 20", cash: 482, risk: 16, inflow: 122, outflow: 78 },
  { label: "May 27", cash: 456, risk: 21, inflow: 118, outflow: 84 },
  { label: "Jun 03", cash: 411, risk: 32, inflow: 101, outflow: 92 },
  { label: "Jun 10", cash: 376, risk: 48, inflow: 94, outflow: 111 },
  { label: "Jun 17", cash: 418, risk: 29, inflow: 138, outflow: 88 },
  { label: "Jun 24", cash: 463, risk: 18, inflow: 146, outflow: 82 },
  { label: "Jul 01", cash: 512, risk: 14, inflow: 158, outflow: 80 },
];

const navItems = [
  [LayoutDashboard, "Overview"],
  [LineChart, "Forecasts"],
  [Gauge, "Risk Score"],
  [Calculator, "What-If"],
  [BellRing, "Alerts"],
  [Plug, "Imports"],
  [Users, "Team"],
  [Settings, "Settings"],
];

const alertsSeed = [
  {
    level: "High",
    title: "Supplier payment may pressure payroll buffer",
    detail: "\u20b142,800 invoice due 3 days before payroll. Suggested action: split payment.",
    due: "Due Jun 08",
    owner: "Lyxter",
  },
  {
    level: "Medium",
    title: "Three invoices trending late",
    detail: "Customers Alpha Foods, Clarity Retail, and Maven Labs are 9-14 days slower than normal.",
    due: "Watchlist",
    owner: "Paolo",
  },
  {
    level: "Low",
    title: "Tax reserve below target",
    detail: "Reserve is \u20b18,400 under your Q2 target, but projected recovery is likely by Jul 01.",
    due: "Review",
    owner: "Trisha",
  },
];

const recommendations = [
  "Collect invoice INV-204 before Jun 12 to keep runway above 7 months.",
  "Move the supplier order from Jun 07 to Jun 14 to lower risk score by 17 points.",
  "Offer 1.5% early-payment discount to two late accounts with strong payment history.",
];

const importsSeed = [
  ["Cash Position.xlsx", "Imported", "Updated 4 minutes ago"],
  ["Receivables Tracker.xlsx", "Needs upload", "Last file was uploaded 3 days ago"],
  ["Payroll Schedule.xlsx", "Imported", "Next cutoff already modeled"],
  ["Supplier Payables.xlsx", "Needs review", "2 rows need category mapping"],
  ["Sales Summary.xlsx", "Imported", "Weekly revenue tab detected"],
  ["Expense Ledger.xlsx", "Needs upload", "Awaiting latest workbook"],
];

const team = [
  ["Lyxter", "Owner", "Full access", "Online"],
  ["Paolo Reyes", "Operations", "Forecasts, alerts", "Online"],
  ["Trisha Santos", "Accountant", "Reports, imports", "Invited"],
  ["Evan Brooks", "Advisor", "Read-only", "Offline"],
];

const activity = [
  ["4 min ago", "Cash Position.xlsx imported", "482 rows analyzed"],
  ["18 min ago", "Risk score changed from 27 to 32", "Late receivable pattern detected"],
  ["1 hr ago", "Action plan generated", "3 recommendations shared with operators"],
  ["Yesterday", "Supplier Payables.xlsx reviewed", "2 rows were remapped"],
];

const appGuide = [
  {
    icon: LineChart,
    title: "What the app does",
    text: "FlowGuard AI tracks cash balance, receivables, expenses, and runway so teams can see future cash pressure before it becomes urgent.",
  },
  {
    icon: SlidersHorizontal,
    title: "How to operate it",
    text: "Start in Overview, upload or refresh your workbooks, review the forecast and risk score, test scenarios in What-If, then work through alerts and recommendations.",
  },
  {
    icon: Sparkles,
    title: "How it helps",
    text: "It turns financial activity into clear priorities, helping operators prevent shortages, protect payroll, and plan with more confidence.",
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatPhp(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsdCompact(value) {
  return `\u20b1${Math.round(value)}K`;
}

function getRange(values, padding = 24) {
  return {
    min: Math.min(...values) - padding,
    max: Math.max(...values) + padding,
  };
}

function linePoints(data, key, { width = 760, height = 280, padLeft = 72, padRight = 26, padTop = 26, padBottom = 28, min, max } = {}) {
  return data
    .map((item, index) => {
      const x = padLeft + (index * (width - padLeft - padRight)) / (data.length - 1);
      const y = height - padBottom - ((item[key] - min) / (max - min)) * (height - padTop - padBottom);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function AppChart({ focus = "cash" }) {
  const width = 760;
  const height = 280;
  const padLeft = 74;
  const padRight = 22;
  const padTop = 20;
  const padBottom = 32;

  const cashRange = getRange(appForecast.map((item) => item.cash), 24);
  const riskRange = getRange(appForecast.map((item) => item.risk), 6);
  const flowRange = getRange([...appForecast.map((item) => item.inflow), ...appForecast.map((item) => item.outflow)], 10);

  const cash = linePoints(appForecast, "cash", { width, height, padLeft, padRight, padTop, padBottom, ...cashRange });
  const risk = linePoints(appForecast, "risk", { width, height, padLeft, padRight, padTop, padBottom, ...riskRange });
  const inflow = linePoints(appForecast, "inflow", { width, height, padLeft, padRight, padTop, padBottom, ...flowRange });
  const outflow = linePoints(appForecast, "outflow", { width, height, padLeft, padRight, padTop, padBottom, ...flowRange });
  const cashTicks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const value = cashRange.max - (cashRange.max - cashRange.min) * ratio;
    const y = padTop + (height - padTop - padBottom) * ratio;

    return {
      value,
      y,
    };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" role="img" aria-label="Cash flow and risk forecast">
      <defs>
        <linearGradient id="lightCash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f8df7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#4f8df7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {cashTicks.map((tick) => (
        <g key={tick.y}>
          <line x1={padLeft} x2={width - padRight} y1={tick.y} y2={tick.y} stroke="rgba(121, 150, 187, 0.16)" />
          <text x={padLeft - 10} y={tick.y + 4} textAnchor="end" className="fill-slate-400 text-[12px]">
            {formatUsdCompact(tick.value)}
          </text>
        </g>
      ))}
      <line x1={padLeft} x2={padLeft} y1={padTop} y2={height - padBottom} stroke="rgba(121, 150, 187, 0.12)" />
      <polygon points={`${padLeft},${height - padBottom} ${cash} ${width - padRight},${height - padBottom}`} fill="url(#lightCash)" />
      <polyline points={cash} fill="none" stroke="#4f8df7" strokeWidth={focus === "cash" ? "5" : "3.5"} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={risk} fill="none" stroke="#f0a23c" strokeWidth={focus === "risk" ? "4.5" : "3.5"} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 9" />
      {focus === "detail" && (
        <>
          <polyline points={inflow} fill="none" stroke="#3bb7a7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={outflow} fill="none" stroke="#ec6a5d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {appForecast.map((item, index) => (
        <text key={item.label} x={padLeft + (index * (width - padLeft - padRight)) / (appForecast.length - 1)} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[12px]">
          {item.label}
        </text>
      ))}
    </svg>
  );
}

function Sidebar({ activeView, setActiveView }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[1.6rem] border border-[#d9e6f6] bg-[linear-gradient(180deg,#ffffff,#f4f8fd)] px-3 py-4 shadow-[0_24px_70px_rgba(113,146,190,0.12)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-24 lg:rounded-[2rem] lg:px-3">
      <div className="flex items-center justify-between gap-3 lg:flex-col lg:justify-start">
        <a href="/" aria-label="FlowGuard AI home" className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#4d96e6] to-[#3bb7a7] text-white shadow-[0_18px_36px_rgba(81,134,208,0.24)]">
          <ShieldCheck size={24} />
        </a>
        <div className="hidden h-px w-10 bg-[#d9e6f6] lg:block" />
        <button
          type="button"
          onClick={() => setActiveView("Overview")}
          className="grid h-12 w-12 place-items-center rounded-2xl border border-[#dce8f6] bg-white text-[#4d78b2] transition hover:bg-[#f5f9ff] lg:mt-2"
          title="Laguna Home Living"
        >
          <Building2 size={22} />
        </button>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:mt-4 lg:flex-1 lg:flex-col lg:items-center lg:gap-4 lg:overflow-visible lg:pb-0">
        {navItems.slice(0, 5).map(([Icon, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveView(label)}
            title={label}
            aria-label={label}
            aria-current={activeView === label ? "page" : undefined}
            className={cn(
              "flex h-11 min-w-max items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition lg:grid lg:h-12 lg:w-12 lg:place-items-center lg:px-0",
              activeView === label ? "bg-[#4f8df7] text-white shadow-[0_18px_34px_rgba(79,141,247,0.26)]" : "bg-white/70 text-[#7a93b5] hover:bg-white hover:text-[#3a6399] lg:bg-transparent"
            )}
          >
            <Icon size={20} />
            <span className="lg:hidden">{label}</span>
          </button>
        ))}
        {navItems.slice(5).map(([Icon, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveView(label)}
            title={label}
            aria-label={label}
            aria-current={activeView === label ? "page" : undefined}
            className={cn(
              "flex h-11 min-w-max items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition lg:grid lg:h-12 lg:w-12 lg:place-items-center lg:px-0",
              activeView === label ? "bg-[#4f8df7] text-white shadow-[0_18px_34px_rgba(79,141,247,0.26)]" : "bg-white/70 text-[#7a93b5] hover:bg-white hover:text-[#3a6399] lg:bg-transparent"
            )}
          >
            <Icon size={20} />
            <span className="lg:hidden">{label}</span>
          </button>
        ))}
      </nav>
      <div className="hidden h-px w-full bg-[#d9e6f6] lg:block" />
      <div className="hidden items-center justify-center pb-2 lg:flex">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#cfe3d6] bg-[#eef8f0] text-[#5a9a62]" title="Secure data room">
          <Lock size={19} />
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto lg:hidden">
        <div className="inline-flex min-w-max items-center gap-2 rounded-2xl border border-[#cfe3d6] bg-[#eef8f0] px-3 py-2 text-sm font-semibold text-[#5a9a62]">
          <Lock size={18} /> Secure data room
        </div>
      </div>
    </aside>
  );
}

function MetricCard({ icon: Icon, label, value, delta, good = true }) {
  return (
    <div className="min-h-40 rounded-[1.4rem] border border-[#dbe7f5] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-5 shadow-[0_22px_60px_rgba(109,142,188,0.1)]">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fe] text-[#4f8df7]">
          <Icon size={20} />
        </span>
        <span className={cn("flex items-center gap-1 text-xs font-semibold", good ? "text-[#5b9a62]" : "text-[#e26d5d]")}>
          {good ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {delta}
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-[#294770] xl:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-[#7b93b4]">{label}</p>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return <section className={cn("rounded-[1.5rem] border border-[#dbe7f5] bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-[0_22px_60px_rgba(109,142,188,0.1)]", className)}>{children}</section>;
}

function RiskMeter({ score = 32 }) {
  const status = score > 60 ? "HIGH" : score > 40 ? "MED" : "LOW-MED";
  const color = score > 60 ? "text-[#e26d5d]" : score > 40 ? "text-[#f0a23c]" : "text-[#5b9a62]";

  return (
    <Panel className="bg-[linear-gradient(180deg,#ffffff,#f6fbff)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#294770]">AI Risk Score</p>
          <p className="mt-1 text-xs text-[#8aa0bc]">Updated 4 minutes ago</p>
        </div>
        <Gauge className="text-[#5f8dcc]" size={22} />
      </div>
      <div className="mx-auto mt-7 grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(from_230deg,#3bb7a7_0deg,#4f8df7_96deg,#f0a23c_132deg,rgba(216,227,242,0.9)_134deg_360deg)]">
        <div className="grid h-32 w-32 place-items-center rounded-full bg-white">
          <div className="text-center">
            <p className="text-5xl font-semibold text-[#294770]">{score}</p>
            <p className={cn("text-xs font-bold tracking-[0.2em]", color)}>{status}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-2 text-center text-xs sm:grid-cols-3">
        <span className="rounded-lg bg-[#eef8f0] py-2 text-[#5b9a62]">Cash stable</span>
        <span className="rounded-lg bg-[#fff5e6] py-2 text-[#d18d2c]">Invoices late</span>
        <span className="rounded-lg bg-[#edf4fe] py-2 text-[#4f8df7]">Runway OK</span>
      </div>
    </Panel>
  );
}

function WhatIfSimulator({ embedded = false }) {
  const [delay, setDelay] = useState(14);
  const [expense, setExpense] = useState(12000);
  const [discount, setDiscount] = useState(1.5);
  const risk = Math.min(91, 22 + Math.round(delay * 1.4) + Math.round(expense / 1800) - Math.round(discount * 3));
  const runway = Math.max(2.1, 8.4 - delay * 0.08 - expense / 18000 + discount * 0.18).toFixed(1);
  const cashImpact = Math.round(-delay * 1900 - expense + discount * 7200);

  return (
    <Panel className={embedded ? "" : "min-h-[540px]"}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#294770]">What-If Simulator</p>
          <p className="mt-1 text-xs text-[#8aa0bc]">Stress test payment timing, expenses, and collection incentives.</p>
        </div>
        <Calculator className="text-[#3bb7a7]" size={22} />
      </div>
      <div className="mt-5 space-y-5">
        <label className="block">
          <span className="flex justify-between text-sm text-[#6f87a8]">
            Customer payment delay <b className="text-[#294770]">{delay} days</b>
          </span>
          <input className="mt-3 w-full accent-[#3bb7a7]" type="range" min="0" max="45" value={delay} onChange={(event) => setDelay(Number(event.target.value))} />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm text-[#6f87a8]">
            Extra expense <b className="text-[#294770]">{formatPhp(expense)}</b>
          </span>
          <input className="mt-3 w-full accent-[#4f8df7]" type="range" min="0" max="50000" step="1000" value={expense} onChange={(event) => setExpense(Number(event.target.value))} />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm text-[#6f87a8]">
            Early-payment discount <b className="text-[#294770]">{discount.toFixed(1)}%</b>
          </span>
          <input className="mt-3 w-full accent-[#f0a23c]" type="range" min="0" max="4" step="0.25" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
        </label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#f5f9ff] p-4">
          <p className="text-xs text-[#8aa0bc]">Projected risk</p>
          <p className={cn("mt-2 text-2xl font-semibold", risk > 60 ? "text-[#e26d5d]" : risk > 40 ? "text-[#f0a23c]" : "text-[#5b9a62]")}>{risk}</p>
        </div>
        <div className="rounded-xl bg-[#f5f9ff] p-4">
          <p className="text-xs text-[#8aa0bc]">Runway</p>
          <p className="mt-2 text-2xl font-semibold text-[#294770]">{runway} mo</p>
        </div>
        <div className="rounded-xl bg-[#f5f9ff] p-4">
          <p className="text-xs text-[#8aa0bc]">Cash impact</p>
          <p className={cn("mt-2 text-2xl font-semibold", cashImpact >= 0 ? "text-[#5b9a62]" : "text-[#e26d5d]")}>{cashImpact >= 0 ? "+" : "-"}{"\u20b1"}{Math.abs(cashImpact / 1000).toFixed(1)}K</p>
        </div>
      </div>
    </Panel>
  );
}

function AlertsList({ alerts, setAlerts }) {
  const [filter, setFilter] = useState("All");
  const shown = alerts.filter((alert) => filter === "All" || alert.level === filter);

  return (
    <Panel>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-semibold text-[#294770]">Alerts Center</p>
          <p className="mt-1 text-sm text-[#7b93b4]">Prioritized warnings with recommended next actions.</p>
        </div>
        <div className="flex gap-2">
          {["All", "High", "Medium", "Low"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn("rounded-full px-3 py-2 text-xs font-bold transition", filter === item ? "bg-[#4f8df7] text-white" : "bg-[#f3f8ff] text-[#7188a8] hover:bg-[#eaf2fd]")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {shown.map((alert) => (
          <div key={alert.title} className="rounded-[1.2rem] border border-[#e0ebf8] bg-[#fbfdff] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", alert.level === "High" ? "bg-[#feeae7] text-[#df6c5e]" : alert.level === "Medium" ? "bg-[#fff4e2] text-[#d18d2c]" : "bg-[#eef8f0] text-[#5b9a62]")}>{alert.level}</span>
                  <p className="text-lg font-semibold text-[#294770]">{alert.title}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#7b93b4]">{alert.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm text-[#8aa0bc] lg:pt-0.5">
                <span className="rounded-full bg-[#f2f7fe] px-3 py-1.5 font-medium text-[#6e86a7]">{alert.due}</span>
                <button
                  type="button"
                  onClick={() => setAlerts((items) => items.filter((item) => item.title !== alert.title))}
                  className="rounded-full bg-white px-3 py-1.5 font-semibold text-[#5f7da2] transition hover:bg-[#e8f0fb] hover:text-[#294770]"
                >
                  Resolve
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#9bb0c9]">
              <span className="font-medium">Owner:</span>
              <span>{alert.owner}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ImportsPanel({ imports, setImports }) {
  function toggleImport(name) {
    setImports((items) =>
      items.map(([itemName, status, detail]) =>
        itemName === name
          ? [
              itemName,
              status === "Imported" ? "Needs upload" : "Imported",
              status === "Imported" ? "Waiting for latest workbook" : "Uploaded just now",
            ]
          : [itemName, status, detail]
      )
    );
  }

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[#294770]">Spreadsheet Imports</p>
          <p className="mt-1 text-sm text-[#7b93b4]">Upload the Excel files your team already maintains.</p>
        </div>
        <ReceiptText className="text-[#5f8dcc]" size={22} />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {imports.map(([name, status, detail]) => (
          <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fe] text-[#4f8df7]">
                <ReceiptText size={19} />
              </span>
              <div>
                <p className="font-semibold text-[#294770]">{name}</p>
                <p className="text-xs text-[#7b93b4]">{detail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleImport(name)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition",
                status === "Imported"
                  ? "bg-[#eef8f0] text-[#5b9a62] hover:bg-[#e5f4e8]"
                  : status === "Needs review"
                    ? "bg-[#fff5e6] text-[#d18d2c] hover:bg-[#ffefd3]"
                    : "bg-[#edf4fe] text-[#4f8df7] hover:bg-[#e5effd]"
              )}
            >
              {status === "Imported" ? "Imported" : status === "Needs review" ? "Review" : "Upload"}
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Header({ activeView, setActiveView, search, setSearch, showNotifications, setShowNotifications, setShowModel, setShowPlan, unread }) {
  return (
    <header className="sticky top-0 z-20 w-full rounded-[1.6rem] border border-[#d9e6f6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,255,0.92))] px-4 py-4 shadow-[0_24px_70px_rgba(113,146,190,0.12)] backdrop-blur-xl sm:px-6 lg:rounded-[2rem]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <a href="/" className="hidden items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-3 py-2 text-sm text-[#6881a2] transition hover:text-[#294770] sm:flex">
            <ArrowLeft size={16} /> Landing
          </a>
          <label className="hidden w-80 max-w-[34vw] items-center gap-3 rounded-full border border-[#dbe7f5] bg-white px-4 py-2 text-[#8aa0bc] lg:flex">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices, risks, forecasts..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[#294770] outline-none placeholder:text-[#8aa0bc]"
            />
          </label>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowModel(true)}
            className="hidden items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2 text-sm font-semibold text-[#6881a2] transition hover:bg-[#f7fbff] hover:text-[#294770] xl:inline-flex"
          >
            <SlidersHorizontal size={16} /> Model
          </button>
          <button
            type="button"
            onClick={() => setShowPlan(true)}
            className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-[#4f8df7] to-[#3bb7a7] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(79,141,247,0.22)] xl:inline-flex"
          >
            <Sparkles size={16} /> Action plan
          </button>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[#dbe7f5] bg-white text-[#6881a2] transition hover:bg-[#f7fbff] hover:text-[#294770]"
          >
            <BellRing size={18} />
            {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef7257] px-1 text-[10px] font-bold text-white">{unread}</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveView("Team")}
            className={cn("flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white py-1 pl-1 pr-3 transition hover:bg-[#f7fbff] sm:gap-3 sm:pr-4", activeView === "Team" && "border-[#bfd8ff] bg-[#edf4fe]")}
          >
            <img src="/lyxter-profile.png" alt="Lyxter" className="h-9 w-9 rounded-full object-cover object-top" />
            <span className="hidden text-sm font-medium text-[#294770] sm:block">Lyxter</span>
          </button>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-full border border-[#dbe7f5] bg-white px-4 py-2 text-[#8aa0bc] lg:hidden">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search invoices, risks, forecasts..."
          className="min-w-0 flex-1 bg-transparent text-sm text-[#294770] outline-none placeholder:text-[#8aa0bc]"
        />
      </label>
    </header>
  );
}

function SearchResults({ search, setSearch, setActiveView }) {
  const items = [
    ["Forecasts", "Jun 10 cash low point", "Projected balance falls to \u20b1376K."],
    ["Alerts", "Supplier payment may pressure payroll buffer", "\u20b142.8K invoice needs action."],
    ["Imports", "Receivables Tracker.xlsx", "Upload the latest workbook to refresh the forecast."],
    ["Team", "Trisha Santos", "Accountant invited to reports."],
  ].filter((item) => item.join(" ").toLowerCase().includes(search.toLowerCase()));

  if (!search) return null;

  return (
    <Panel className="mb-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#294770]">Search results for "{search}"</p>
        <button type="button" onClick={() => setSearch("")} className="text-[#8aa0bc] transition hover:text-[#294770]">
          <X size={18} />
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map(([view, title, detail]) => (
          <button key={title} type="button" onClick={() => setActiveView(view)} className="rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4 text-left transition hover:bg-[#f5f9ff]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4f8df7]">{view}</p>
            <p className="mt-2 font-semibold text-[#294770]">{title}</p>
            <p className="mt-1 text-sm text-[#7b93b4]">{detail}</p>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-[#7b93b4]">No matching finance signals found.</p>}
      </div>
    </Panel>
  );
}

function Overview({ greeting, setShowModel, setShowPlan, alerts, setAlerts, imports, setImports }) {
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-[1.8rem] border border-[#dbe7f5] bg-[radial-gradient(circle_at_15%_0%,rgba(79,141,247,0.14),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(59,183,167,0.14),transparent_26%),linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-[0_24px_70px_rgba(113,146,190,0.12)] sm:p-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-semibold text-[#5f8dcc]">{greeting}, Lyxter</p>
            <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-[#294770] sm:text-3xl xl:text-4xl">Your cash position is stable, but June has two watchpoints.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b93b4] sm:text-base">FlowGuard AI found supplier timing and late receivables as the biggest short-term risk drivers.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowModel(true)} className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-3 text-sm font-semibold text-[#294770] transition hover:bg-[#f7fbff]">
              <SlidersHorizontal size={17} /> Adjust model
            </button>
            <button onClick={() => setShowPlan(true)} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4f8df7] to-[#3bb7a7] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(79,141,247,0.22)]">
              <Sparkles size={17} /> Generate action plan
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={WalletCards} label="Current cash balance" value="₱482.4K" delta="+8.4%" />
        <MetricCard icon={Gauge} label="Forecast risk score" value="32 / 100" delta="+11 pts" good={false} />
        <MetricCard icon={Clock3} label="Projected runway" value="7.6 mo" delta="+0.8 mo" />
        <MetricCard icon={ReceiptText} label="At-risk receivables" value="₱38.2K" delta="3 late" good={false} />
      </section>

      <section className="mt-5">
        <AppGuidePanel />
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.45fr_.85fr]">
        <ForecastCard />
        <RiskMeter />
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[.95fr_1.05fr]">
        <RecommendationsPanel />
        <WhatIfSimulator embedded />
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.1fr_.9fr]">
        <AlertsList alerts={alerts} setAlerts={setAlerts} />
        <ImportsPanel imports={imports.slice(0, 4)} setImports={setImports} />
      </section>
    </>
  );
}

function ForecastCard({ detail = false }) {
  return (
    <Panel>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-lg font-semibold text-[#294770]">Cash Flow Forecast</p>
          <p className="mt-1 text-sm text-[#7b93b4]">Blue is projected cash in PHP. Amber dashed line is risk pressure.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-[#fff5e6] px-3 py-1 font-semibold text-[#c27a18]">PHP</span>
          <span className="rounded-full bg-[#edf4fe] px-3 py-1 text-[#4f8df7]">95% confidence</span>
          <span className="rounded-full bg-[#eef8f0] px-3 py-1 text-[#5b9a62]">7-week horizon</span>
        </div>
      </div>
      <div className="mt-5 h-72 sm:h-80">
        <AppChart focus={detail ? "detail" : "cash"} />
      </div>
    </Panel>
  );
}

function RecommendationsPanel() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-[#294770]">AI Recommendations</p>
          <p className="mt-1 text-sm text-[#7b93b4]">Ranked by cash impact and confidence.</p>
        </div>
        <Bot className="text-[#3bb7a7]" size={24} />
      </div>
      <div className="mt-5 space-y-3">
        {recommendations.map((item, index) => (
          <div key={item} className="flex gap-3 rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#4f8df7] text-sm font-bold text-white">{index + 1}</span>
            <p className="text-sm leading-6 text-[#6881a2]">{item}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AppGuidePanel() {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-[#294770]">How FlowGuard Works</p>
          <p className="mt-1 text-sm text-[#7b93b4]">Quick instructions for new users and client walkthroughs.</p>
        </div>
        <Bot className="text-[#4f8df7]" size={24} />
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {appGuide.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fe] text-[#4f8df7]">
              <Icon size={18} />
            </span>
            <p className="mt-4 font-semibold text-[#294770]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#7b93b4]">{text}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ForecastsView() {
  return (
    <div className="space-y-5">
      <ViewTitle kicker="Forecasts" title="Forecast every cash movement before it reaches the bank." text="Compare inflows, outflows, cash balance, and risk pressure across the next seven weeks." />
      <ForecastCard detail />
      <div className="grid gap-5 xl:grid-cols-3">
        {appForecast.map((week) => (
          <Panel key={week.label}>
            <p className="text-sm font-semibold text-[#294770]">{week.label}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <span className="rounded-xl bg-[#edf4fe] p-3 text-[#4f8df7]">Cash ₱{week.cash}K</span>
              <span className="rounded-xl bg-[#fff5e6] p-3 text-[#d18d2c]">Risk {week.risk}</span>
              <span className="rounded-xl bg-[#eef8f0] p-3 text-[#5b9a62]">Inflow ₱{week.inflow}K</span>
              <span className="rounded-xl bg-[#feeae7] p-3 text-[#df6c5e]">Outflow ₱{week.outflow}K</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function RiskView() {
  const drivers = [
    [TrendingDown, "Late receivables", "+14 pts", "Three customers are paying 9-14 days slower than their baseline."],
    [ReceiptText, "Supplier timing", "+11 pts", "One major invoice lands before payroll buffer rebuilds."],
    [CircleDollarSign, "Tax reserve", "+5 pts", "Q2 target reserve is temporarily underfunded."],
    [TrendingUp, "Sales momentum", "-8 pts", "Recent workbook uploads show weekly sales pacing above the prior 4-week average."],
  ];

  return (
    <div className="space-y-5">
      <ViewTitle kicker="Risk Score" title="Understand what changed, why it matters, and what to do next." text="Risk scoring combines balance trajectory, payment behavior, expense timing, and confidence bands." />
      <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
        <RiskMeter />
        <Panel>
          <p className="text-lg font-semibold text-[#294770]">Risk Drivers</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {drivers.map(([Icon, title, value, detail]) => (
              <div key={title} className="rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fe] text-[#4f8df7]">
                    <Icon size={19} />
                  </span>
                  <span className={cn("text-sm font-bold", value.startsWith("-") ? "text-[#5b9a62]" : "text-[#d18d2c]")}>{value}</span>
                </div>
                <p className="mt-4 font-semibold text-[#294770]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#7b93b4]">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AlertsView({ alerts, setAlerts }) {
  return (
    <div className="space-y-5">
      <ViewTitle kicker="Alerts" title="Work the warnings before they become cash events." text="Filter, assign, and resolve cash flow alerts from one queue." />
      <AlertsList alerts={alerts} setAlerts={setAlerts} />
    </div>
  );
}

function ImportsView({ imports, setImports }) {
  return (
    <div className="space-y-5">
      <ViewTitle kicker="Imports" title="Keep your Excel workbooks current and your forecast fresh." text="Upload balances, receivables, payables, payroll, and sales sheets without changing your current process." />
      <ImportsPanel imports={imports} setImports={setImports} />
    </div>
  );
}

function TeamView() {
  return (
    <div className="space-y-5">
      <ViewTitle kicker="Team" title="Control access for operators, accountants, and advisors." text="Invite collaborators, tune permission scopes, and monitor finance activity." />
      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-[#294770]">Members</p>
            <button className="inline-flex items-center gap-2 rounded-full bg-[#294770] px-3 py-2 text-sm font-semibold text-white">
              <Plus size={16} /> Invite
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {team.map(([name, role, access, status]) => (
              <div key={name} className="grid gap-3 rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-[#294770]">{name}</p>
                  <p className="text-sm text-[#7b93b4]">{role} - {access}</p>
                </div>
                <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", status === "Online" ? "bg-[#eef8f0] text-[#5b9a62]" : status === "Invited" ? "bg-[#edf4fe] text-[#4f8df7]" : "bg-[#f4f7fb] text-[#7b93b4]")}>{status}</span>
                <button className="text-[#8aa0bc] transition hover:text-[#294770]">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <p className="text-lg font-semibold text-[#294770]">Recent Activity</p>
          <div className="mt-5 space-y-4">
            {activity.map(([time, title, detail]) => (
              <div key={title} className="border-l border-[#dbe7f5] pl-4">
                <p className="text-xs font-semibold text-[#4f8df7]">{time}</p>
                <p className="mt-1 font-semibold text-[#294770]">{title}</p>
                <p className="mt-1 text-sm text-[#7b93b4]">{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SettingsView() {
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [cashFloor, setCashFloor] = useState(220000);
  const [riskLimit, setRiskLimit] = useState(55);

  return (
    <div className="space-y-5">
      <ViewTitle kicker="Settings" title="Tune alert thresholds and reporting preferences." text="These controls update locally so the product feels like a real operating console." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <p className="text-lg font-semibold text-[#294770]">Alert Thresholds</p>
          <label className="mt-5 block">
            <span className="flex justify-between text-sm text-[#6f87a8]">
              Minimum cash floor <b className="text-[#294770]">{formatPhp(cashFloor)}</b>
            </span>
            <input className="mt-3 w-full accent-[#3bb7a7]" type="range" min="100000" max="500000" step="10000" value={cashFloor} onChange={(event) => setCashFloor(Number(event.target.value))} />
          </label>
          <label className="mt-5 block">
            <span className="flex justify-between text-sm text-[#6f87a8]">
              Risk alert limit <b className="text-[#294770]">{riskLimit}</b>
            </span>
            <input className="mt-3 w-full accent-[#f0a23c]" type="range" min="20" max="90" value={riskLimit} onChange={(event) => setRiskLimit(Number(event.target.value))} />
          </label>
        </Panel>
        <Panel>
          <p className="text-lg font-semibold text-[#294770]">Reports</p>
          <button
            type="button"
            onClick={() => setWeeklyDigest(!weeklyDigest)}
            className="mt-5 flex w-full items-center justify-between rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4 text-left"
          >
            <span>
              <span className="block font-semibold text-[#294770]">Weekly owner digest</span>
              <span className="mt-1 block text-sm text-[#7b93b4]">Send forecast summary every Monday.</span>
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", weeklyDigest ? "bg-[#eef8f0] text-[#5b9a62]" : "bg-[#f4f7fb] text-[#7b93b4]")}>{weeklyDigest ? "On" : "Off"}</span>
          </button>
          <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-3 text-sm font-semibold text-[#294770] transition hover:bg-[#f7fbff]">
            <Download size={17} /> Export audit log
          </button>
        </Panel>
      </div>
    </div>
  );
}

function ViewTitle({ kicker, title, text }) {
  return (
    <div className="rounded-[1.8rem] border border-[#dbe7f5] bg-[radial-gradient(circle_at_20%_0%,rgba(79,141,247,0.12),transparent_30%),linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-[0_24px_70px_rgba(113,146,190,0.12)] sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4f8df7]">{kicker}</p>
      <h1 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight text-[#294770] sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7b93b4] sm:text-base">{text}</p>
    </div>
  );
}

function FloatingPanel({ title, children, onClose, icon: Icon }) {
  return (
    <div className="fixed inset-0 z-40 bg-[#d8e5f7]/55 px-4 py-6 backdrop-blur-sm">
      <div className="ml-auto max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-auto rounded-[1.8rem] border border-[#dbe7f5] bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5 shadow-[0_30px_80px_rgba(113,146,190,0.18)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4fe] text-[#4f8df7]">{Icon && <Icon size={20} />}</span>
            <p className="text-lg font-semibold text-[#294770]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#8aa0bc] transition hover:bg-[#f7fbff] hover:text-[#294770]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function NotificationsPanel({ alerts, onClose, setActiveView }) {
  return (
    <FloatingPanel title="Notifications" icon={BellRing} onClose={onClose}>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <button key={alert.title} type="button" onClick={() => { setActiveView("Alerts"); onClose(); }} className="w-full rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4 text-left transition hover:bg-[#f5f9ff]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d18d2c]">{alert.level} alert</p>
            <p className="mt-2 font-semibold text-[#294770]">{alert.title}</p>
            <p className="mt-1 text-sm text-[#7b93b4]">{alert.due}</p>
          </button>
        ))}
      </div>
    </FloatingPanel>
  );
}

function ModelPanel({ onClose }) {
  const [seasonality, setSeasonality] = useState(68);
  const [latePayment, setLatePayment] = useState(74);
  const [expenseSensitivity, setExpenseSensitivity] = useState(52);

  return (
    <FloatingPanel title="Forecast Model" icon={SlidersHorizontal} onClose={onClose}>
      <div className="space-y-5">
        {[
          ["Seasonality weight", seasonality, setSeasonality],
          ["Late-payment sensitivity", latePayment, setLatePayment],
          ["Expense volatility", expenseSensitivity, setExpenseSensitivity],
        ].map(([label, value, setter]) => (
          <label key={label} className="block rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
            <span className="flex justify-between text-sm text-[#6f87a8]">
              {label} <b className="text-[#294770]">{value}%</b>
            </span>
            <input className="mt-3 w-full accent-[#4f8df7]" type="range" min="0" max="100" value={value} onChange={(event) => setter(Number(event.target.value))} />
          </label>
        ))}
        <div className="rounded-xl bg-[#edf4fe] p-4 text-sm leading-6 text-[#4f8df7]">
          Current model confidence remains 95%. Changes affect dashboard projections instantly in a live deployment.
        </div>
      </div>
    </FloatingPanel>
  );
}

function ActionPlanPanel({ onClose, setActiveView }) {
  return (
    <FloatingPanel title="Action Plan" icon={Sparkles} onClose={onClose}>
      <div className="space-y-3">
        {recommendations.map((item, index) => (
          <div key={item} className="rounded-xl border border-[#e0ebf8] bg-[#fbfdff] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4f8df7]">Step {index + 1}</p>
            <p className="mt-2 text-sm leading-6 text-[#6881a2]">{item}</p>
          </div>
        ))}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => setActiveView("Alerts")} className="inline-flex items-center gap-2 rounded-full bg-[#294770] px-4 py-3 text-sm font-semibold text-white">
            <FileWarning size={17} /> Review alerts
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-3 text-sm font-semibold text-[#294770]">
            <Mail size={17} /> Share plan
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}

export default function ProductApp() {
  const [activeView, setActiveView] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [alerts, setAlerts] = useState(alertsSeed);
  const [imports, setImports] = useState(importsSeed);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const view = {
    Overview: <Overview greeting={greeting} setShowModel={setShowModel} setShowPlan={setShowPlan} alerts={alerts} setAlerts={setAlerts} imports={imports} setImports={setImports} />,
    Forecasts: <ForecastsView />,
    "Risk Score": <RiskView />,
    "What-If": (
      <div className="space-y-5">
        <ViewTitle kicker="What-If" title="Stress test cash decisions before you make them." text="Use scenario controls to model delayed collections, expense shocks, and early-payment incentives." />
        <WhatIfSimulator />
      </div>
    ),
    Alerts: <AlertsView alerts={alerts} setAlerts={setAlerts} />,
    Imports: <ImportsView imports={imports} setImports={setImports} />,
    Team: <TeamView />,
    Settings: <SettingsView />,
  }[activeView];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(79,141,247,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,183,167,0.15),transparent_24%),linear-gradient(180deg,#f6faff_0%,#edf4fb_46%,#f8fbff_100%)] px-3 py-3 text-[#294770] sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-4 lg:flex-row">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="min-w-0 flex-1">
          <Header
            activeView={activeView}
            setActiveView={setActiveView}
            search={search}
            setSearch={setSearch}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            setShowModel={setShowModel}
            setShowPlan={setShowPlan}
            unread={alerts.length}
          />
          <div id="overview" className="w-full px-2 py-5 sm:px-4 lg:px-6">
            <SearchResults search={search} setSearch={setSearch} setActiveView={setActiveView} />
            {view}
          </div>
        </main>
      </div>
      {showNotifications && <NotificationsPanel alerts={alerts} onClose={() => setShowNotifications(false)} setActiveView={setActiveView} />}
      {showModel && <ModelPanel onClose={() => setShowModel(false)} />}
      {showPlan && <ActionPlanPanel onClose={() => setShowPlan(false)} setActiveView={setActiveView} />}
    </div>
  );
}
