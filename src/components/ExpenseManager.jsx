import { useState, useEffect, useCallback, useRef } from 'react';
import { dbClient } from '../utils/dbClient';
import ConfirmModal from './ConfirmModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDateInputValue = (d) => d.toISOString().slice(0, 10);

const today = () => toDateInputValue(new Date());

const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return toDateInputValue(d);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const CATEGORY_COLORS = {
  'Chemicals & Reagents': 'bg-blue-100 text-blue-700',
  Equipment:              'bg-purple-100 text-purple-700',
  Utilities:              'bg-yellow-100 text-yellow-700',
  Staff:                  'bg-green-100 text-green-700',
  Rent:                   'bg-orange-100 text-orange-700',
  Maintenance:            'bg-gray-100 text-gray-700',
};

const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, colorClass, bgClass, borderClass, icon }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl p-5 border ${bgClass} ${borderClass}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>Rs. {Math.round(value).toLocaleString()}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// ─── Bar Chart Row ────────────────────────────────────────────────────────────

function BarRow({ label, total, max }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700 truncate max-w-[60%]">{label}</span>
        <span className="text-gray-500 font-mono">Rs. {Math.round(total).toLocaleString()}</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2 w-full">
        <div
          className="bg-red-500 rounded-full h-2 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────

function DashboardTab({ onRefresh }) {
  const [view, setView] = useState('daily'); // 'daily' | 'monthly'

  // Daily state
  const [dailyDate, setDailyDate] = useState(today);
  const [dailyReport, setDailyReport] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly state
  const now = new Date();
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [monthMonth, setMonthMonth] = useState(now.getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // ── Fetch Daily ────────────────────────────────────────────────────────────
  const fetchDaily = useCallback(async (date) => {
    setDailyLoading(true);
    try {
      const res = await dbClient.getDailyReport(date);
      if (res?.success) setDailyReport(res.data);
    } catch (err) {
      console.error('fetchDaily error', err);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'daily') fetchDaily(dailyDate);
  }, [view, dailyDate, fetchDaily]);

  // ── Fetch Monthly ─────────────────────────────────────────────────────────
  const fetchMonthly = useCallback(async (year, month) => {
    setMonthlyLoading(true);
    try {
      const res = await dbClient.getMonthlyReport(year, month);
      if (res?.success) setMonthlyReport(res.data);
    } catch (err) {
      console.error('fetchMonthly error', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'monthly') fetchMonthly(monthYear, monthMonth);
  }, [view, monthYear, monthMonth, fetchMonthly]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportDaily = async () => {
    if (!dailyReport) return;
    const d = dailyReport;
    const [y, m, dd] = d.date.split('-');
    const fmtDate = `${dd}/${m}/${y}`;
    let lines = [
      '===========================',
      'BUKHARI LAB - DAILY SUMMARY',
      `Date: ${fmtDate}`,
      '===========================',
      'REVENUE',
      `Total Patients: ${d.patientCount}`,
      `Total Revenue: Rs. ${Math.round(d.totalRevenue)}`,
      '',
      'EXPENSES',
      `Total Expenses: Rs. ${Math.round(d.totalExpenses)}`,
    ];
    (d.expenseBreakdown || []).forEach(e => {
      lines.push(`  ${e.category}: Rs. ${Math.round(e.total)}`);
    });
    lines.push('');
    lines.push(`NET PROFIT/LOSS: Rs. ${Math.round(d.netProfit)}`);
    lines.push('===========================');
    const content = lines.join('\n');
    const filename = `daily-summary-${d.date}.txt`;
    const res = await dbClient.exportText(content, filename);
    if (res?.success) {
      if (window.showToast) window.showToast('Summary exported successfully.');
    } else if (!res?.canceled) {
      if (window.showToast) window.showToast('Export failed.', 'error');
    }
  };

  const handleExportMonthly = async () => {
    if (!monthlyReport) return;
    const r = monthlyReport;
    const monthName = MONTH_NAMES[r.month - 1];
    let lines = [
      '============================',
      'BUKHARI LAB - MONTHLY SUMMARY',
      `Month: ${monthName} ${r.year}`,
      '============================',
      `Total Patients: ${r.totalPatients}`,
      `Total Revenue: Rs. ${Math.round(r.totalRevenue)}`,
      `Total Expenses: Rs. ${Math.round(r.totalExpenses)}`,
      `NET PROFIT/LOSS: Rs. ${Math.round(r.netProfit)}`,
      '',
      'TOP EXPENSE CATEGORIES',
    ];
    (r.topExpenseCategories || []).forEach(c => {
      lines.push(`  ${c.category}: Rs. ${Math.round(c.total)}`);
    });
    lines.push('');
    lines.push('DAILY BREAKDOWN');
    (r.dailyData || []).forEach(d => {
      lines.push(`  ${formatDate(d.date)} | Rev: Rs.${Math.round(d.revenue)} | Exp: Rs.${Math.round(d.expenses)} | Net: Rs.${Math.round(d.netProfit)}`);
    });
    lines.push('============================');
    const content = lines.join('\n');
    const filename = `monthly-summary-${r.year}-${String(r.month).padStart(2,'0')}.txt`;
    const res = await dbClient.exportText(content, filename);
    if (res?.success) {
      if (window.showToast) window.showToast('Monthly summary exported.');
    } else if (!res?.canceled) {
      if (window.showToast) window.showToast('Export failed.', 'error');
    }
  };

  // Manual refresh — re-fetches whichever view is active
  const handleManualRefresh = useCallback(() => {
    if (view === 'daily') fetchDaily(dailyDate);
    else fetchMonthly(monthYear, monthMonth);
    if (onRefresh) onRefresh();
  }, [view, dailyDate, monthYear, monthMonth, fetchDaily, fetchMonthly, onRefresh]);

  // ── Year options ──────────────────────────────────────────────────────────
  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) yearOptions.push(y);

  return (
    <div className="space-y-5">
      {/* View toggle + Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('daily')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'daily' ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('monthly')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'monthly' ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Monthly
          </button>
        </div>
        <button
          onClick={handleManualRefresh}
          title="Refresh dashboard"
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── DAILY VIEW ─────────────────────────────────────────────────────── */}
      {view === 'daily' && (
        <div className="space-y-5">
          {/* Date picker + export */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
            <button
              onClick={handleExportDaily}
              disabled={!dailyReport}
              className="border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export Summary
            </button>
          </div>

          {dailyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : dailyReport ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  label="Total Revenue"
                  value={dailyReport.totalRevenue}
                  sub={`${dailyReport.patientCount} patients`}
                  colorClass="text-green-600"
                  bgClass="bg-white"
                  borderClass="border-gray-200"
                  icon={<svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
                />
                <StatCard
                  label="Total Expenses"
                  value={dailyReport.totalExpenses}
                  sub={`${dailyReport.expenseCount} entries`}
                  colorClass="text-red-600"
                  bgClass="bg-white"
                  borderClass="border-gray-200"
                  icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
                />
                <StatCard
                  label="Net Profit / Loss"
                  value={dailyReport.netProfit}
                  sub={dailyReport.netProfit >= 0 ? 'After expenses' : 'In deficit'}
                  colorClass={dailyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
                  bgClass={dailyReport.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
                  borderClass={dailyReport.netProfit >= 0 ? 'border-green-200' : 'border-red-200'}
                  icon={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                />
              </div>

              {/* Breakdown panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Expense breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Expense Breakdown</h3>
                  {(dailyReport.expenseBreakdown || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No expenses recorded for this day.</p>
                  ) : (
                    <div className="space-y-3">
                      {dailyReport.expenseBreakdown.map(item => (
                        <BarRow
                          key={item.category}
                          label={item.category}
                          total={item.total}
                          max={dailyReport.totalExpenses}
                        />
                      ))}
                      <div className="border-t pt-2 text-right text-sm font-semibold text-gray-700">
                        Total: Rs. {Math.round(dailyReport.totalExpenses).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Revenue breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Revenue Breakdown</h3>
                  {(dailyReport.revenueBreakdown || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No patients registered today.</p>
                  ) : (
                    <div className="space-y-0 overflow-auto max-h-72">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                            <th className="pb-2 text-left font-semibold">Patient</th>
                            <th className="pb-2 text-left font-semibold hidden sm:table-cell">Panels</th>
                            <th className="pb-2 text-right font-semibold">Amount</th>
                            <th className="pb-2 text-right font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dailyReport.revenueBreakdown.map((row, i) => (
                            <tr
                              key={`${row.mrNo}-${i}`}
                              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                            >
                              <td className="py-2 pr-2">
                                <div className="font-medium text-gray-800 leading-tight">{row.patientName}</div>
                                <div className="text-xs text-gray-400">{row.mrNo}</div>
                              </td>
                              <td className="py-2 pr-2 hidden sm:table-cell">
                                <span className="text-xs text-gray-500 line-clamp-1 max-w-[140px]">{row.panels || '—'}</span>
                              </td>
                              <td className="py-2 text-right font-mono text-gray-800">
                                Rs. {Math.round(row.amountPaid).toLocaleString()}
                              </td>
                              <td className="py-2 pl-2 text-right">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                  row.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                                  row.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {row.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="border-t pt-2 text-right text-sm font-semibold text-gray-700">
                        Total: Rs. {Math.round(dailyReport.totalRevenue).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── MONTHLY VIEW ─────────────────────────────────────────────────────── */}
      {view === 'monthly' && (
        <div className="space-y-5">
          {/* Month / Year selectors + export */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={monthMonth}
                onChange={(e) => setMonthMonth(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              <select
                value={monthYear}
                onChange={(e) => setMonthYear(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={handleExportMonthly}
              disabled={!monthlyReport}
              className="border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export Monthly Summary
            </button>
          </div>

          {monthlyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />)}
            </div>
          ) : monthlyReport ? (
            <>
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  label="Total Revenue"
                  value={monthlyReport.totalRevenue}
                  colorClass="text-green-600"
                  bgClass="bg-white"
                  borderClass="border-gray-200"
                  icon={<svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
                />
                <StatCard
                  label="Total Expenses"
                  value={monthlyReport.totalExpenses}
                  colorClass="text-red-600"
                  bgClass="bg-white"
                  borderClass="border-gray-200"
                  icon={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
                />
                <StatCard
                  label="Net Profit / Loss"
                  value={monthlyReport.netProfit}
                  colorClass={monthlyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
                  bgClass={monthlyReport.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
                  borderClass={monthlyReport.netProfit >= 0 ? 'border-green-200' : 'border-red-200'}
                  icon={<svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                />
                <StatCard
                  label="Total Patients"
                  value={monthlyReport.totalPatients}
                  colorClass="text-blue-600"
                  bgClass="bg-white"
                  borderClass="border-gray-200"
                  icon={<svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
              </div>

              {/* Daily Trend Table */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Breakdown</h3>
                {(monthlyReport.dailyData || []).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No data for this month.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                          <th className="pb-2 text-left font-semibold">Date</th>
                          <th className="pb-2 text-right font-semibold">Revenue (Rs.)</th>
                          <th className="pb-2 text-right font-semibold">Expenses (Rs.)</th>
                          <th className="pb-2 text-right font-semibold">Net (Rs.)</th>
                          <th className="pb-2 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {monthlyReport.dailyData.map((d) => (
                          <tr key={d.date} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 pr-3 font-medium text-gray-700">{formatDate(d.date)}</td>
                            <td className="py-2 text-right text-green-700 font-mono">{Math.round(d.revenue).toLocaleString()}</td>
                            <td className="py-2 text-right text-red-600 font-mono">{Math.round(d.expenses).toLocaleString()}</td>
                            <td className={`py-2 text-right font-mono font-semibold ${d.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {Math.round(d.netProfit).toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                d.netProfit > 0 ? 'bg-green-100 text-green-700' :
                                d.netProfit < 0 ? 'bg-red-100 text-red-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {d.netProfit > 0 ? 'Profit' : d.netProfit < 0 ? 'Loss' : 'Break Even'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50/60">
                          <td className="pt-2 pb-1 text-gray-800">Monthly Total</td>
                          <td className="pt-2 pb-1 text-right text-green-700 font-mono">{Math.round(monthlyReport.totalRevenue).toLocaleString()}</td>
                          <td className="pt-2 pb-1 text-right text-red-600 font-mono">{Math.round(monthlyReport.totalExpenses).toLocaleString()}</td>
                          <td className={`pt-2 pb-1 text-right font-mono ${monthlyReport.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {Math.round(monthlyReport.netProfit).toLocaleString()}
                          </td>
                          <td className="pt-2 pb-1 text-right">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                              monthlyReport.netProfit > 0 ? 'bg-green-100 text-green-700' :
                              monthlyReport.netProfit < 0 ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {monthlyReport.netProfit > 0 ? 'Profit' : monthlyReport.netProfit < 0 ? 'Loss' : 'Break Even'}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Top Expense Categories */}
              {(monthlyReport.topExpenseCategories || []).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Top Expense Categories This Month</h3>
                  {monthlyReport.topExpenseCategories.map(item => (
                    <BarRow
                      key={item.category}
                      label={item.category}
                      total={item.total}
                      max={monthlyReport.totalExpenses}
                    />
                  ))}
                  <div className="border-t pt-2 text-right text-sm font-semibold text-gray-700">
                    Total: Rs. {Math.round(monthlyReport.totalExpenses).toLocaleString()}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── EXPENSES TAB ─────────────────────────────────────────────────────────────

function ExpensesTab({ onExpenseAdded }) {
  // Form state
  const [formDate, setFormDate] = useState(today);
  const [formCategory, setFormCategory] = useState('Chemicals & Reagents');
  const [formCustomCat, setFormCustomCat] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories
  const [categories, setCategories] = useState([
    'Chemicals & Reagents', 'Equipment', 'Utilities', 'Staff', 'Rent', 'Maintenance', 'Other'
  ]);

  // Log state
  const [rangeFrom, setRangeFrom] = useState(firstOfMonth);
  const [rangeTo, setRangeTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(firstOfMonth);
  const [appliedTo, setAppliedTo] = useState(today);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Load categories once
  useEffect(() => {
    dbClient.getExpenseCategories().then(res => {
      if (res?.success && Array.isArray(res.data)) setCategories(res.data);
    });
  }, []);

  const fetchExpenses = useCallback(async (from, to) => {
    setIsLoading(true);
    try {
      const res = await dbClient.getExpensesByRange(from, to);
      if (res?.success) setExpenses(res.data || []);
    } catch (err) {
      console.error('fetchExpenses error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses(appliedFrom, appliedTo);
  }, [appliedFrom, appliedTo, fetchExpenses]);

  const handleApplyFilter = () => {
    setAppliedFrom(rangeFrom);
    setAppliedTo(rangeTo);
  };

  const handleClearFilter = () => {
    const from = firstOfMonth();
    const to = today();
    setRangeFrom(from);
    setRangeTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const handleSubmit = async () => {
    const amt = parseInt(formAmount) || 0;
    if (amt <= 0) return;
    const cat = formCategory === 'Other' && formCustomCat.trim() ? formCustomCat.trim() : formCategory;
    setIsSubmitting(true);
    try {
      const res = await dbClient.saveExpenseEntry(formDate, cat, formDesc.trim(), amt);
      if (res?.success) {
        if (window.showToast) window.showToast('Expense recorded.');
        // Reset form
        setFormDate(today());
        setFormCategory('Chemicals & Reagents');
        setFormCustomCat('');
        setFormDesc('');
        setFormAmount('');
        // Reload list + notify parent (for dashboard refresh)
        fetchExpenses(appliedFrom, appliedTo);
        if (onExpenseAdded) onExpenseAdded();
        // Reload categories to include new custom ones
        dbClient.getExpenseCategories().then(r => {
          if (r?.success && Array.isArray(r.data)) setCategories(r.data);
        });
      }
    } catch (err) {
      console.error('saveExpenseEntry error', err);
      if (window.showToast) window.showToast('Failed to save expense.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setDeleteTarget(expense);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dbClient.deleteExpense(deleteTarget.id);
      if (res?.success) {
        if (window.showToast) window.showToast('Expense deleted.');
        setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
        if (onExpenseAdded) onExpenseAdded();
      }
    } catch (err) {
      console.error('deleteExpense error', err);
      if (window.showToast) window.showToast('Failed to delete expense.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  const totals = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="flex gap-6 min-h-0">
      {/* Left: Add Form */}
      <div className="w-72 shrink-0">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Add Expense</h3>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Custom Category input */}
          {formCategory === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Custom Category</label>
              <input
                type="text"
                value={formCustomCat}
                onChange={(e) => setFormCustomCat(e.target.value)}
                placeholder="e.g. Marketing"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (Rs.)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formAmount || parseInt(formAmount) <= 0}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </button>
        </div>
      </div>

      {/* Right: Expense Log */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Expense Log</h3>
        </div>

        {/* Date range filter */}
        <div className="flex items-center flex-wrap gap-2">
          <label className="text-xs text-gray-400 font-medium">From</label>
          <input
            type="date"
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
          />
          <label className="text-xs text-gray-400 font-medium">To</label>
          <input
            type="date"
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
          />
          <button
            onClick={handleApplyFilter}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-1.5 rounded-lg text-sm transition-colors"
          >
            Filter
          </button>
          <button
            onClick={handleClearFilter}
            className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Expense table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-gray-50">
                    <td className="px-4 py-3"><div className="w-20 h-4 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-4 py-3"><div className="w-24 h-5 bg-gray-200 animate-pulse rounded-full" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="w-32 h-4 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 animate-pulse rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="w-6 h-6 bg-gray-200 animate-pulse rounded ml-auto" /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-16 text-center text-sm text-gray-400">
                    No expenses in this date range.
                  </td>
                </tr>
              ) : (
                expenses.map((exp, i) => (
                  <tr
                    key={exp.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(exp.category)}`}>
                        {exp.category || 'Other'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-[180px] truncate">
                      {exp.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-800">
                      Rs. {Math.round(exp.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteClick(exp)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                        title="Delete expense"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isLoading && expenses.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-right text-sm font-semibold text-gray-700">
              Total: Rs. {Math.round(totals).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Expense"
        message="Delete this expense entry? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
      />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ExpenseManager({ isActive }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'expenses'
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // Auto-refresh when the Expenses tab is navigated to (isActive: false → true).
  // wasActiveRef tracks the previous value so we only refresh on the transition.
  // The setTimeout avoids the "setState-synchronously-in-effect" linter rule.
  const wasActiveRef = useRef(false);
  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current;
    wasActiveRef.current = !!isActive;
    if (becameActive) {
      const id = setTimeout(() => setDashboardRefreshKey(prev => prev + 1), 0);
      return () => clearTimeout(id);
    }
  }, [isActive]);

  const handleExpenseAdded = () => {
    setDashboardRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Expense Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track lab expenses and review financial performance</p>
      </div>

      {/* Inner Tab Bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 -mb-px">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 pt-3 text-sm transition-all border-b-2 ${
              activeTab === 'dashboard'
                ? 'text-red-600 font-semibold border-red-600'
                : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-3 pt-3 text-sm transition-all border-b-2 ${
              activeTab === 'expenses'
                ? 'text-red-600 font-semibold border-red-600'
                : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'dashboard' && <DashboardTab key={dashboardRefreshKey} onRefresh={handleExpenseAdded} />}
        {activeTab === 'expenses' && <ExpensesTab onExpenseAdded={handleExpenseAdded} />}
      </div>
    </div>
  );
}
