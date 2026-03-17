import React, { useState, useEffect, useCallback } from 'react';
import { dbClient } from '../utils/dbClient';
import ConfirmModal from './ConfirmModal';

export default function PatientHistory({ onOpenInReport }) {
  const [patients, setPatients] = useState([]);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [stats, setStats] = useState({ totalPatients: 0, totalRevenue: 0, totalOutstanding: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientPanels, setPatientPanels] = useState([]);
  const [transaction, setTransaction] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Trash handling
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [patientToTrash, setPatientToTrash] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await dbClient.getTotalStats();
      if (res?.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchPatients = useCallback(async (query, page) => {
    setIsLoading(true);
    try {
      if (query.length >= 2) {
        const res = await dbClient.searchPatients(query);
        if (res?.success) {
          setPatients(res.data.rows || []);
          setTotalPatientsCount(res.data.totalCount || 0);
        }
      } else {
        const offset = (page - 1) * itemsPerPage;
        const res = await dbClient.getAllPatients(itemsPerPage, offset);
        if (res?.success) {
          setPatients(res.data.rows || []);
          setTotalPatientsCount(res.data.totalCount || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch patients", err);
      if (window.showToast) window.showToast("Failed to load patient history", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPatients(searchQuery, currentPage);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentPage, fetchPatients]);

  const handleRefresh = () => {
    fetchStats();
    fetchPatients(searchQuery, currentPage);
  };

  const openModal = async (patient) => {
    setSelectedPatient(patient);
    setIsModalLoading(true);
    setPaymentAmount('');
    try {
      const panelsRes = await dbClient.getPatientPanels(patient.id);
      if (panelsRes?.success) {
        setPatientPanels(panelsRes.data || []);
      }
      const transRes = await dbClient.getTransaction(patient.id);
      if (transRes?.success) {
        setTransaction(transRes.data);
      }
    } catch (err) {
      console.error("Failed to load patient details", err);
      if (window.showToast) window.showToast("Failed to load patient details", "error");
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!transaction) return;
    const amountToAdd = parseFloat(paymentAmount) || 0;
    if (amountToAdd <= 0) return;

    setIsUpdatingPayment(true);
    try {
      const newAmountPaid = (transaction.amountPaid || 0) + amountToAdd;
      const netTotal = transaction.discountedTotal || 0;
      let newBalanceDue = netTotal - newAmountPaid;
      let newPaymentStatus = 'PARTIAL';

      if (newAmountPaid >= netTotal) {
        newBalanceDue = 0;
        newPaymentStatus = 'PAID';
      }

      newBalanceDue = Math.max(0, newBalanceDue); // Ensure not negative

      const updates = {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        paymentStatus: newPaymentStatus
      };

      const res = await dbClient.updateTransaction(transaction.id, updates);
      if (res?.success) {
        if (window.showToast) window.showToast("Payment updated successfully");
        setTransaction(prev => ({ ...prev, ...updates }));
        fetchStats();
        // Optimistically update the list row
        setPatients(prev => prev.map(p => 
          p.id === selectedPatient.id 
            ? { ...p, netTotal, paymentStatus: newPaymentStatus } 
            : p
        ));
        setPaymentAmount('');
      } else {
        throw new Error("DB Error");
      }
    } catch (err) {
      console.error("Failed to update payment", err);
      if (window.showToast) window.showToast("Failed to update payment", "error");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleOpenInReport = () => {
    if (selectedPatient && onOpenInReport) {
      onOpenInReport(selectedPatient);
    }
  };

  const handlePreviewClick = async () => {
    if (!selectedPatient) return;
    setIsModalLoading(true);
    try {
      const resultsRes = await dbClient.getTestResults(selectedPatient.id);
      const testData = resultsRes?.success ? resultsRes.data : {};
      
      const payload = {
        patientDetails: selectedPatient,
        panels: patientPanels,
        transaction,
        testData
      };

      if (window.showPreviewReport) {
        window.showPreviewReport(payload);
      } else {
        console.warn("showPreviewReport not attached to window");
      }
    } catch (err) {
      console.error("Failed to load preview data", err);
      if (window.showToast) window.showToast("Failed to load preview data", "error");
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleTrashClick = (patient, e) => {
    e.stopPropagation();
    setPatientToTrash(patient);
    setIsTrashModalOpen(true);
  };

  const handleConfirmTrash = async () => {
    if (!patientToTrash) return;
    try {
      const success = await dbClient.softDeletePatient(patientToTrash.id);
      if (success) {
        if (window.showToast) window.showToast("Patient moved to trash", "success");
        setPatients(prev => prev.filter(p => p.id !== patientToTrash.id));
        setTotalPatientsCount(prev => prev - 1);
        fetchStats();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast("Failed to move patient to trash", "error");
    } finally {
      setIsTrashModalOpen(false);
      setPatientToTrash(null);
    }
  };

  const totalPages = Math.ceil(totalPatientsCount / itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Row */}
      <div className="flex items-center justify-between px-6 pl-8 py-5 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Patient History</h1>
          <p className="text-sm text-gray-400 mt-0.5">All registered patients</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <svg className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, MR number, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col shadow-sm">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-bold">Total Patients</span>
            <span className="text-xl font-bold text-gray-900 mt-1">{stats.totalPatients}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col shadow-sm">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-bold">Total Revenue</span>
            <span className="text-xl font-bold text-green-600 mt-1">Rs. {Math.round(stats.totalRevenue).toLocaleString()}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col shadow-sm">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-bold">Outstanding Balance</span>
            <span className={`text-xl font-bold mt-1 ${stats.totalOutstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              Rs. {Math.round(stats.totalOutstanding).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">MR No</th>
                <th className="px-4 py-3 font-semibold">Patient</th>
                <th className="px-4 py-3 font-semibold">Age/Gender</th>
                <th className="px-4 py-3 font-semibold">Tests</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading Skeletons
                [...Array(5)].map((_, i) => (
                  <tr key={'skeleton-' + i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3"><div className="w-10 h-4 bg-gray-200 animate-pulse rounded"></div></td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-4 bg-gray-200 animate-pulse rounded mb-1.5"></div>
                      <div className="w-16 h-3 bg-gray-200 animate-pulse rounded"></div>
                    </td>
                    <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div></td>
                    <td className="px-4 py-3"><div className="w-32 h-4 bg-gray-200 animate-pulse rounded"></div></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div></td>
                    <td className="px-4 py-3"><div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div></td>
                    <td className="px-4 py-3"><div className="w-12 h-5 bg-gray-200 animate-pulse rounded-full"></div></td>
                    <td className="px-4 py-3 text-right"><div className="w-6 h-6 bg-gray-200 animate-pulse rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan="8" className="px-4 py-16 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">No patients registered yet.</h3>
                    <p className="text-sm text-gray-500">Use the New Report tab to register your first patient.</p>
                  </td>
                </tr>
              ) : (
                // Real rows
                patients.map((p, index) => (
                  <tr 
                    key={p.id} 
                    onClick={(e) => {
                      if (e.target.closest('button')) return;
                      openModal(p);
                    }}
                    className={`border-b border-gray-100 last:border-0 hover:bg-red-50/30 cursor-pointer transition-colors ${index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                  >
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm font-mono text-gray-600">{p.mrNo}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 max-w-[150px] truncate">{p.fatherHusbandName ? `S/O ${p.fatherHusbandName}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm text-gray-600 block">{p.age} / {p.gender}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-xs text-gray-500 max-w-[200px] truncate" title={p.panelNames}>
                        {p.panelNames || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle hidden lg:table-cell">
                      <span className="text-sm text-gray-500">
                        {p.registrationDate ? new Date(p.registrationDate).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-sm font-mono font-medium text-gray-900">Rs. {p.netTotal != null ? Math.round(p.netTotal).toLocaleString() : '0'}</span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                        p.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' :
                        p.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        p.paymentStatus === 'UNPAID' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {p.paymentStatus || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={(e) => handleTrashClick(p, e)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title="Move to Trash"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openModal(p); }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPatientsCount > 20 && searchQuery.length < 2 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, totalPatientsCount)}</span> of <span className="font-medium text-gray-900">{totalPatientsCount}</span> patients
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedPatient(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Patient Details</h2>
              <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 p-2 rounded-xl transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8">
              {isModalLoading ? (
                <div className="flex justify-center items-center h-40">
                  <svg className="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
              ) : (
                <>
                  {/* Section 1: Patient Info */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Information</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div><div className="text-xs text-gray-400 uppercase">MR No</div><div className="text-sm font-medium text-gray-900">{selectedPatient.mrNo || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Name</div><div className="text-sm font-medium text-gray-900">{selectedPatient.name || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">S/O D/O W/O</div><div className="text-sm font-medium text-gray-900">{selectedPatient.fatherHusbandName || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Age</div><div className="text-sm font-medium text-gray-900">{selectedPatient.age || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Gender</div><div className="text-sm font-medium text-gray-900">{selectedPatient.gender || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Contact</div><div className="text-sm font-medium text-gray-900">{selectedPatient.contactNo || '—'}</div></div>
                      <div className="col-span-2"><div className="text-xs text-gray-400 uppercase">Address</div><div className="text-sm font-medium text-gray-900">{selectedPatient.address || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Consultant</div><div className="text-sm font-medium text-gray-900">{selectedPatient.consultant || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Registration Date</div><div className="text-sm font-medium text-gray-900">{selectedPatient.registrationDate ? new Date(selectedPatient.registrationDate).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Sample Location</div><div className="text-sm font-medium text-gray-900">{selectedPatient.sampleLocation || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">Specimen</div><div className="text-sm font-medium text-gray-900">{selectedPatient.specimen || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">T/R ID</div><div className="text-sm font-medium text-gray-900">{selectedPatient.trId || '—'}</div></div>
                      <div><div className="text-xs text-gray-400 uppercase">T/R No</div><div className="text-sm font-medium text-gray-900">{selectedPatient.trNo || '—'}</div></div>
                    </div>
                  </section>

                  {/* Section 2: Selected Tests */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Selected Tests</h3>
                    {patientPanels.length > 0 ? (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-gray-100">
                            {patientPanels.map(panel => (
                              <tr key={panel.id} className="bg-gray-50/50">
                                <td className="px-4 py-2.5 font-medium text-gray-700">{panel.panelName}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-gray-900">Rs. {panel.price != null ? panel.price.toLocaleString() : '0'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No tests recorded.</p>
                    )}
                  </section>

                  {/* Section 3: Billing Summary */}
                  {transaction && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Billing Summary</h3>
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Subtotal</span>
                            <span className="text-gray-900 font-semibold">Rs. {Math.round(transaction.totalAmount || 0).toLocaleString()}</span>
                         </div>
                         {(transaction.discountValue > 0) && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-red-400 font-medium">Discount ({transaction.discountType})</span>
                              <span className="text-red-600 font-bold">- Rs. {Math.round((transaction.totalAmount || 0) - (transaction.discountedTotal || 0)).toLocaleString()}</span>
                            </div>
                         )}
                         <div className="flex justify-between items-center py-2 my-1 border-t border-b border-gray-200">
                            <span className="text-gray-700 font-bold">Net Total</span>
                            <span className="text-gray-900 font-bold text-lg">Rs. {Math.round(transaction.discountedTotal || 0).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-gray-500 font-medium">Amount Paid</span>
                            <span className="text-gray-900 font-semibold">Rs. {Math.round(transaction.amountPaid || 0).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-medium">Balance Due</span>
                            <span className={`text-base font-bold ${transaction.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs. {Math.round(transaction.balanceDue || 0).toLocaleString()}</span>
                         </div>
                         
                         <div className="flex justify-between items-center mt-4 border-t border-gray-200 pt-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status & Method</span>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{transaction.paymentMethod}</span>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                transaction.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' :
                                transaction.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {transaction.paymentStatus}
                              </span>
                            </div>
                         </div>
                      </div>
                    </section>
                  )}

                  {/* Section 4: Update Payment */}
                  {transaction && transaction.balanceDue > 0 && (
                    <section className="bg-red-50/50 p-5 rounded-xl border border-red-100 mt-6">
                      <h3 className="text-sm font-bold text-red-900 mb-3">Record Additional Payment</h3>
                      <div className="flex items-end space-x-4">
                        <div className="flex-1">
                          <label className="text-xs font-semibold text-red-700 mb-1 block">Amount to add (Rs.)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max={transaction.balanceDue}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder={`Max: ${Math.round(transaction.balanceDue)}`}
                            className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                          />
                        </div>
                        <button 
                          onClick={handleUpdatePayment}
                          disabled={isUpdatingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                        >
                          {isUpdatingPayment ? 'Updating...' : 'Update Payment'}
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
              <button 
                onClick={() => setSelectedPatient(null)}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handlePreviewClick}
                disabled={patientPanels.length === 0}
                className="px-5 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mx-2"
              >
                Preview Report
              </button>
              <button 
                onClick={handleOpenInReport}
                className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/20 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                Open in New Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Confirmation Modal */}
      <ConfirmModal
        isOpen={isTrashModalOpen}
        title="Move to Trash"
        message={`Are you sure you want to move ${patientToTrash?.name} to the trash?`}
        confirmText="Move to Trash"
        cancelText="Cancel"
        onConfirm={handleConfirmTrash}
        onCancel={() => {
          setIsTrashModalOpen(false);
          setPatientToTrash(null);
        }}
        type="danger"
      />
    </div>
  );
}
