import React from 'react';
import type { FraudAlert, ObservedTransaction, DashboardMetrics } from '../types';
import {
  ArrowLeftRight,
  Coins,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Eye,
  BarChart3,
  Lightbulb,
  PieChart,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface DashboardViewProps {
  alerts: FraudAlert[];
  transactions: ObservedTransaction[];
  metrics?: DashboardMetrics | null;
  isLoading: boolean;
  onViewAllAlerts: () => void;
  onSelectAlert: (alert: FraudAlert) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  alerts,
  transactions,
  metrics,
  isLoading,
  onViewAllAlerts,
  onSelectAlert,
}) => {
  // 1. Real Counts & Metrics from Backend
  const totalTransactionsCount = metrics?.totalTransactions ?? transactions.length;

  const totalAmountValue = metrics?.totalAmount ?? transactions.reduce(
    (acc, t) => acc + (Number(t.amount) || 0),
    0
  );

  const flaggedCount = metrics?.flaggedAlerts ?? alerts.length;

  const activeHoldsCount = metrics?.activeHolds ?? alerts.filter((a) => a.status === 'HOLD_ACTIVE').length;

  // Real distinct affected accounts set
  const affectedAccountsCount = metrics?.affectedAccounts ?? (() => {
    const set = new Set<string>();
    alerts.forEach((a) => {
      if (a.sourceAccountId) set.add(a.sourceAccountId);
      if (a.intermediateAccountId) set.add(a.intermediateAccountId);
      if (a.destinationAccountId) set.add(a.destinationAccountId);
    });
    return set.size;
  })();

  // Real Top Card Displays
  const totalTxDisplay = totalTransactionsCount.toLocaleString();
  const totalAmountDisplay = Number(totalAmountValue).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
  const flaggedDisplay = flaggedCount.toLocaleString();
  const affectedDisplay = affectedAccountsCount.toLocaleString();

  // 2. Real Hourly Time Bins (00-04h, 04-08h, 08-12h, 12-16h, 16-20h, 20-24h)
  const defaultLabels = ['00–04h', '04–08h', '08–12h', '12–16h', '16–20h', '20–24h'];

  const timeBins = metrics?.timeBins && metrics.timeBins.length === 6
    ? metrics.timeBins.map((b, i) => ({
        label: defaultLabels[i],
        count: Number(b.count) || 0,
        alertCount: Number(b.alertCount) || 0,
        totalAmount: Number(b.totalAmount) || 0,
      }))
    : (() => {
        const bins = defaultLabels.map((label) => ({
          label,
          count: 0,
          alertCount: 0,
          totalAmount: 0,
        }));

        const anomalyTxIds = new Set<string>();
        alerts.forEach((a) => {
          if (a.secondTransactionId) anomalyTxIds.add(a.secondTransactionId);
        });

        transactions.forEach((tx) => {
          try {
            const d = new Date(tx.occurredAt || tx.createdAt || Date.now());
            const h = d.getHours();
            const idx = Math.min(5, Math.max(0, Math.floor(h / 4)));
            if (anomalyTxIds.has(tx.transactionId)) {
              bins[idx].alertCount++;
            } else {
              bins[idx].count++;
            }
            bins[idx].totalAmount += Number(tx.amount) || 0;
          } catch {}
        });

        return bins;
      })();

  // 3. Dynamic Sparkline Path Generator (built from real data values)
  const generateSparklinePath = (values: number[]): { fillPath: string; strokePath: string } => {
    const max = Math.max(1, ...values);
    const min = Math.min(...values);
    const range = max - min === 0 ? 1 : max - min;

    const coords = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * 80;
      const y = 25 - ((val - min) / range) * 19;
      return { x, y };
    });

    if (values.every((v) => v === 0)) {
      return {
        fillPath: 'M 0 25 L 80 25 L 80 30 L 0 30 Z',
        strokePath: 'M 0 25 L 80 25',
      };
    }

    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = ((p0.x + p1.x) / 2).toFixed(1);
      d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    const fillPath = `${d} L 80 30 L 0 30 Z`;
    const strokePath = d;
    return { fillPath, strokePath };
  };

  const sparklineTx = generateSparklinePath(timeBins.map((b) => b.count + b.alertCount));
  const sparklineAmount = generateSparklinePath(timeBins.map((b) => b.totalAmount));
  const sparklineAlerts = generateSparklinePath(timeBins.map((b) => b.alertCount));
  const sparklineAffected = generateSparklinePath(timeBins.map((b) => (b.alertCount > 0 ? b.alertCount + 1 : 0)));

  // 4. Real 24h Trend Calculation
  const now = Date.now();
  const twelveHoursMs = 12 * 60 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  const get24hTrend = (items: { date: string }[]) => {
    if (items.length === 0) return { text: '0%', positive: true };
    const recent = items.filter(
      (i) => now - new Date(i.date).getTime() <= twelveHoursMs
    ).length;
    const prior = items.filter((i) => {
      const diff = now - new Date(i.date).getTime();
      return diff > twelveHoursMs && diff <= twentyFourHoursMs;
    }).length;

    if (prior === 0 && recent > 0) {
      return { text: '+100%', positive: true };
    }
    if (prior === 0 && recent === 0) {
      return { text: 'Live', positive: true };
    }
    const change = Math.round(((recent - prior) / prior) * 100);
    return {
      text: change >= 0 ? `+${change}%` : `${change}%`,
      positive: change >= 0,
    };
  };

  const txTrend = get24hTrend(transactions.map((t) => ({ date: t.occurredAt || t.createdAt || '' })));
  const alertTrend = get24hTrend(alerts.map((a) => ({ date: a.createdAt })));

  // 5. Dynamic Y-Axis Scaling for Bar Visualizer
  const maxBinVal = Math.max(0, ...timeBins.map((b) => b.count + b.alertCount));
  let yAxisMax = 5;
  if (maxBinVal > 200) {
    yAxisMax = Math.ceil(maxBinVal / 50) * 50;
  } else if (maxBinVal > 50) {
    yAxisMax = Math.ceil(maxBinVal / 20) * 20;
  } else if (maxBinVal > 20) {
    yAxisMax = Math.ceil(maxBinVal / 10) * 10;
  } else if (maxBinVal > 10) {
    yAxisMax = 20;
  } else if (maxBinVal > 5) {
    yAxisMax = 10;
  } else {
    yAxisMax = 5;
  }

  const step = yAxisMax / 5;
  const ticks = [
    yAxisMax,
    Math.round(yAxisMax - step),
    Math.round(yAxisMax - step * 2),
    Math.round(yAxisMax - step * 3),
    Math.round(yAxisMax - step * 4),
    0,
  ];

  const peakAnomalyBin = timeBins.reduce(
    (max, b) => (b.alertCount > max.alertCount ? b : max),
    timeBins[0]
  );
  const totalAnomaliesInBins = timeBins.reduce((sum, b) => sum + b.alertCount, 0);

  // 6. Real Risk Distribution (Donut Chart)
  const displayTotal = totalTransactionsCount;
  const displaySuspicious = metrics
    ? Number(metrics.suspiciousTransactions)
    : Math.min(totalTransactionsCount, flaggedCount);
  const displayNormal = Math.max(0, displayTotal - displaySuspicious);

  const displayNormalPct =
    displayTotal > 0 ? Math.round((displayNormal / displayTotal) * 100) : 0;
  const displaySuspiciousPct =
    displayTotal > 0 ? 100 - displayNormalPct : 0;

  // Donut geometry calculations
  const donutRadius = 64;
  const donutCircumference = 2 * Math.PI * donutRadius; // ≈ 402.12
  const normalAngleSpan = (displayNormalPct / 100) * 360;
  const normalMidAngleDeg = -90 + normalAngleSpan / 2;
  const normalLeftPct = 50 + 35.5 * Math.cos((normalMidAngleDeg * Math.PI) / 180);
  const normalTopPct = 50 + 35.5 * Math.sin((normalMidAngleDeg * Math.PI) / 180);

  const suspAngleSpan = (displaySuspiciousPct / 100) * 360;
  const suspMidAngleDeg = -90 + normalAngleSpan + suspAngleSpan / 2;
  const suspLeftPct = 50 + 35.5 * Math.cos((suspMidAngleDeg * Math.PI) / 180);
  const suspTopPct = 50 + 35.5 * Math.sin((suspMidAngleDeg * Math.PI) / 180);

  const maskAccount = (acc?: string) => {
    if (!acc) return '10001';
    if (acc.length <= 5) return acc;
    return `..${acc.slice(-5)}`;
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Transactions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1877F2] shrink-0">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            {/* Real Blue Sparkline */}
            <div className="w-20 sm:w-24 h-9">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 80 30" fill="none">
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1877F2" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#1877F2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparklineTx.fillPath} fill="url(#sparkBlue)" />
                <path
                  d={sparklineTx.strokePath}
                  stroke="#1877F2"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Transactions</p>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              {isLoading ? '...' : totalTxDisplay}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[11px]">
                <TrendingUp className="h-3 w-3" />
                <span>{txTrend.text}</span>
              </span>
              <span className="text-slate-400 font-normal">vs previous 24h</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Transaction Amount */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            {/* Real Amber Sparkline */}
            <div className="w-20 sm:w-24 h-9">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 80 30" fill="none">
                <defs>
                  <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparklineAmount.fillPath} fill="url(#sparkAmber)" />
                <path
                  d={sparklineAmount.strokePath}
                  stroke="#F59E0B"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Transaction Amount</p>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              {isLoading ? '...' : `₹ ${totalAmountDisplay}`}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[11px]">
                <TrendingUp className="h-3 w-3" />
                <span>{txTrend.text}</span>
              </span>
              <span className="text-slate-400 font-normal">vs previous 24h</span>
            </div>
          </div>
        </div>

        {/* Card 3: Flagged Transactions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center text-[#FF2D55] shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            {/* Real Rose Sparkline */}
            <div className="w-20 sm:w-24 h-9">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 80 30" fill="none">
                <defs>
                  <linearGradient id="sparkRose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF2D55" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#FF2D55" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparklineAlerts.fillPath} fill="url(#sparkRose)" />
                <path
                  d={sparklineAlerts.strokePath}
                  stroke="#FF2D55"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Flagged Transactions</p>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              {isLoading ? '...' : flaggedDisplay}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 text-[#FF2D55] font-bold text-[11px]">
                <TrendingUp className="h-3 w-3" />
                <span>{alertTrend.text}</span>
              </span>
              <span className="text-slate-400 font-normal">vs previous 24h</span>
            </div>
          </div>
        </div>

        {/* Card 4: Affected Accounts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="h-11 w-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            {/* Real Purple Sparkline */}
            <div className="w-20 sm:w-24 h-9">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 80 30" fill="none">
                <defs>
                  <linearGradient id="sparkPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparklineAffected.fillPath} fill="url(#sparkPurple)" />
                <path
                  d={sparklineAffected.strokePath}
                  stroke="#8B5CF6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Affected Accounts</p>
            <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              {isLoading ? '...' : affectedDisplay}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px]">
                <ShieldCheck className="h-3 w-3" />
                <span>{activeHoldsCount} Active Holds</span>
              </span>
              <span className="text-slate-400 font-normal">in surveillance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Real Transaction Activity & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transaction Activity Bar Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1877F2] shrink-0">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Transaction Activity (24h Distribution)
                </h3>
                <p className="text-xs text-slate-400">
                  Computed live from actual ingested transactions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs font-semibold">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-[#1877F2]"></span>
                <span>Normal</span>
              </span>
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-[#FF2D55]"></span>
                <span>Flagged Anomaly</span>
              </span>
            </div>
          </div>

          {/* Chart Plot Section */}
          <div className="flex items-start mt-2">
            {/* Rotated Y-Axis Title */}
            <div className="h-60 flex items-center justify-center shrink-0 w-6">
              <span className="-rotate-90 text-[11px] font-medium text-slate-400 select-none whitespace-nowrap tracking-wide">
                Number of Transactions
              </span>
            </div>

            {/* Y-Axis Ticks */}
            <div className="relative h-60 w-12 shrink-0 select-none">
              {ticks.map((val) => (
                <div
                  key={val}
                  className="absolute right-2.5 text-[11px] font-medium text-slate-400 font-mono -translate-y-1/2 leading-none"
                  style={{ bottom: `${(val / yAxisMax) * 100}%` }}
                >
                  {val.toLocaleString()}
                </div>
              ))}
            </div>

            {/* Plot Area + X-Axis Labels */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Plot Area */}
              <div className="relative h-60 w-full">
                {/* Horizontal Dashed Grid Lines */}
                {ticks.map((val) => (
                  <div
                    key={val}
                    className={`absolute inset-x-0 ${
                      val === 0
                        ? 'border-b border-slate-300'
                        : 'border-b border-dashed border-slate-200/80'
                    }`}
                    style={{ bottom: `${(val / yAxisMax) * 100}%` }}
                  />
                ))}

                {/* Vertical Dashed Grid Lines between columns */}
                <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                  {timeBins.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-full ${
                        idx < timeBins.length - 1 ? 'border-r border-dashed border-slate-200/60' : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Bars Grid */}
                <div className="absolute inset-0 grid grid-cols-6 items-end px-2 sm:px-4">
                  {timeBins.map((bin) => {
                    const total = bin.count + bin.alertCount;
                    const barHeightPct = total > 0 ? Math.min(100, Math.max(6, (total / yAxisMax) * 100)) : 0;
                    const alertHeightPct = total > 0 ? (bin.alertCount / total) * 100 : 0;
                    const normalHeightPct = 100 - alertHeightPct;

                    return (
                      <div
                        key={bin.label}
                        className="flex flex-col items-center justify-end h-full relative group"
                      >
                        {/* Total Label Above Bar */}
                        <span className="text-xs font-bold text-slate-900 mb-1.5 leading-none select-none transition-transform group-hover:scale-110">
                          {total > 0 ? total.toLocaleString() : '0'}
                        </span>

                        {/* Stacked Bar Container */}
                        <div
                          className="w-full max-w-[56px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-300 shadow-xs cursor-pointer hover:brightness-105"
                          style={{ height: `${barHeightPct}%` }}
                          title={`${bin.label}: ${total.toLocaleString()} transactions (${bin.count} Normal, ${bin.alertCount} Anomalies, ₹${bin.totalAmount.toLocaleString('en-IN')})`}
                        >
                          {/* Top: Flagged Anomaly (Red) */}
                          {bin.alertCount > 0 && (
                            <div
                              className="w-full bg-[#FF2D55] flex items-center justify-center text-white font-bold transition-all"
                              style={{ height: `${alertHeightPct}%` }}
                            >
                              {alertHeightPct >= 20 && (
                                <span className="text-xs font-bold leading-none py-1 select-none">
                                  {bin.alertCount}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bottom: Normal (Blue) */}
                          {bin.count > 0 && (
                            <div
                              className="w-full bg-[#1877F2] flex items-center justify-center text-white font-bold transition-all"
                              style={{ height: `${normalHeightPct}%` }}
                            >
                              {normalHeightPct >= 20 && (
                                <span className="text-xs font-bold leading-none py-1 select-none">
                                  {bin.count}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Labels Grid */}
              <div className="grid grid-cols-6 px-2 sm:px-4 text-center mt-2.5">
                {timeBins.map((bin) => (
                  <span key={bin.label} className="text-xs font-medium text-slate-500 select-none">
                    {bin.label}
                  </span>
                ))}
              </div>

              {/* Time Range (Hours) */}
              <div className="text-center text-xs font-medium text-slate-400 mt-2 select-none">
                Time Range (Hours)
              </div>
            </div>
          </div>

          {/* Bottom Insight Alert Box */}
          <div className="mt-5 rounded-2xl bg-blue-50/60 border border-blue-100/90 p-3.5 px-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[#1877F2] shrink-0 shadow-xs">
              <Lightbulb className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              <strong className="font-bold text-slate-900 mr-1.5">Insight:</strong>
              {totalAnomaliesInBins > 0 ? (
                <>
                  Higher transaction activity detected between {peakAnomalyBin.label}, with{' '}
                  <span className="font-bold text-[#FF2D55]">{peakAnomalyBin.alertCount}</span> flagged as potential anomalies.
                </>
              ) : totalTransactionsCount > 0 ? (
                <>
                  All <span className="font-bold text-[#1877F2]">{totalTransactionsCount}</span> observed transactions in the 24h window are operating normally with zero flagged anomalies.
                </>
              ) : (
                <>
                  No transactions ingested yet in the 24h monitoring window. System is waiting for active payment events.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Transaction Risk Distribution Donut */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1877F2] shrink-0">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Transaction Risk Distribution
              </h3>
              <p className="text-xs text-slate-400">Live flagged anomaly ratio</p>
            </div>
          </div>

          {/* Donut Visualizer Area */}
          <div className="relative flex items-center justify-center py-4">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-52 h-52 overflow-visible transform -rotate-90" viewBox="0 0 180 180">
                <defs>
                  <filter id="redShadow" x="-20%" y="-20%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#FF2D55" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Base circle track */}
                <circle
                  cx="90"
                  cy="90"
                  r={donutRadius}
                  stroke="#F8FAFC"
                  strokeWidth="26"
                  fill="transparent"
                />

                {/* Suspicious / Mule (Red Arc with Crimson Glow) */}
                {displaySuspiciousPct > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    stroke="#FF2D55"
                    strokeWidth="26"
                    fill="transparent"
                    strokeDasharray={`${(displaySuspiciousPct / 100) * donutCircumference} ${donutCircumference}`}
                    strokeDashoffset={`-${(displayNormalPct / 100) * donutCircumference}`}
                    filter="url(#redShadow)"
                    className="transition-all duration-500"
                  />
                )}

                {/* Normal Pass (Royal Blue Arc) */}
                {displayNormalPct > 0 && (
                  <circle
                    cx="90"
                    cy="90"
                    r={donutRadius}
                    stroke="#1877F2"
                    strokeWidth="26"
                    fill="transparent"
                    strokeDasharray={`${(displayNormalPct / 100) * donutCircumference} ${donutCircumference}`}
                    strokeDashoffset="0"
                    className="transition-all duration-500"
                  />
                )}

                {/* Seam Dividers */}
                {displayNormalPct > 0 && displaySuspiciousPct > 0 && (
                  <>
                    <line
                      x1={90 + 51 * Math.cos(0)}
                      y1={90 + 51 * Math.sin(0)}
                      x2={90 + 77 * Math.cos(0)}
                      y2={90 + 77 * Math.sin(0)}
                      stroke="#ffffff"
                      strokeWidth="3.5"
                    />
                    <line
                      x1={90 + 51 * Math.cos((normalAngleSpan * Math.PI) / 180)}
                      y1={90 + 51 * Math.sin((normalAngleSpan * Math.PI) / 180)}
                      x2={90 + 77 * Math.cos((normalAngleSpan * Math.PI) / 180)}
                      y2={90 + 77 * Math.sin((normalAngleSpan * Math.PI) / 180)}
                      stroke="#ffffff"
                      strokeWidth="3.5"
                    />
                  </>
                )}
              </svg>

              {/* In-Arc Percentage Text: Normal */}
              {displayNormalPct >= 12 && (
                <span
                  className="absolute text-xs font-bold text-white select-none -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-xs"
                  style={{ left: `${normalLeftPct}%`, top: `${normalTopPct}%` }}
                >
                  {displayNormalPct}%
                </span>
              )}

              {/* In-Arc Percentage Text: Suspicious */}
              {displaySuspiciousPct >= 12 && (
                <span
                  className="absolute text-xs font-bold text-white select-none -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-xs"
                  style={{ left: `${suspLeftPct}%`, top: `${suspTopPct}%` }}
                >
                  {displaySuspiciousPct}%
                </span>
              )}

              {/* Donut Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {displayTotal}
                </span>
                <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase text-center mt-1.5 leading-tight">
                  TOTAL<br />TRANSACTIONS
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5 text-slate-700 font-semibold">
                <span className="h-3 w-3 rounded-full bg-[#1877F2] shrink-0"></span>
                <span>Normal Pass</span>
              </span>
              <span className="font-bold text-slate-900">
                {displayNormal} <span className="text-[#1877F2]">({displayNormalPct}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2.5 text-slate-700 font-semibold">
                <span className="h-3 w-3 rounded-full bg-[#FF2D55] shrink-0"></span>
                <span>Suspicious / Mule</span>
              </span>
              <span className="font-bold text-slate-900">
                {displaySuspicious} <span className="text-[#FF2D55]">({displaySuspiciousPct}%)</span>
              </span>
            </div>
          </div>

          {/* Bottom Insight Alert Box */}
          <div className="mt-4 rounded-2xl bg-rose-50/70 border border-rose-100/90 p-3.5 px-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-100/80 flex items-center justify-center text-[#FF2D55] shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>

            <div className="h-8 w-px bg-rose-200/80 shrink-0 mx-0.5"></div>

            <div className="text-xs leading-relaxed">
              <p className="text-slate-700 font-medium">
                <strong className="font-bold text-slate-900 mr-1.5">Insight:</strong>
                {displayTotal > 0 ? (
                  <>
                    <span className="font-bold text-[#FF2D55]">{displaySuspiciousPct}%</span> of the transactions are flagged as suspicious.
                  </>
                ) : (
                  <>0% flagged anomalies in the current monitoring stream.</>
                )}
              </p>
              <p className="text-slate-500 text-[11px] font-normal mt-0.5">
                {displaySuspicious > 0
                  ? 'Further investigation and hold verification recommended.'
                  : 'System is monitoring live payment flows.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Suspicious Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Suspicious Transactions</h3>
            <p className="text-xs text-slate-400">Live feed from real-time fraud detection engine</p>
          </div>
          <button
            onClick={onViewAllAlerts}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All ({alerts.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100 text-[11px]">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">From Account</th>
                <th className="py-3 px-6">Held Account</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6 text-center">Risk Score</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">
                      No Suspicious Transactions Detected Yet
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      When transactions in IndianBankSimulation trigger the rapid pass-through detector or high-value spike rule, they appear here live.
                    </p>
                  </td>
                </tr>
              ) : (
                recentAlerts.map((a) => {
                  const isHoldActive = a.status === 'HOLD_ACTIVE';
                  const isConfirmed = a.status === 'CONFIRMED_FRAUD';
                  const isResolved = a.status === 'RESOLVED';

                  return (
                    <tr
                      key={a.alertId}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-slate-600 font-medium">
                        {formatTime(a.createdAt)}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-slate-800 font-medium">
                        {maskAccount(a.sourceAccountId)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-rose-700">
                        {maskAccount(a.destinationAccountId)}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                        ₹{Number(a.secondAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200">
                          {a.decision === 'STOP' ? '95' : '75'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {isHoldActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-semibold border border-red-200">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            Active Hold
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200">
                            <ShieldAlert className="h-3 w-3 text-rose-600" />
                            Confirmed Fraud
                          </span>
                        ) : isResolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Cleared
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {a.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => onSelectAlert(a)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs cursor-pointer border border-blue-200/60"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
