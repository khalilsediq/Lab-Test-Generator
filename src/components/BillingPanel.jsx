import React, { useState } from 'react';
import { dbClient } from '../utils/dbClient';

export default function BillingPanel({
  selectedPanels,
  testTemplates,
  testPrices,
  patientDetails,
  testData,
  onSaveSuccess,
  onRemovePanel,
  editedPanelNames,
  onPrintInvoice
}) {
  const [discountType, setDiscountType] = useState('none'); // 'none' | 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'online'
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintInvoiceBtn, setShowPrintInvoiceBtn] = useState(false);

  // Reset print button when panels change (starting a new patient/report)
  React.useEffect(() => {
    setShowPrintInvoiceBtn(false);
  }, [selectedPanels.join(',')]);

  // Filter out any null/undefined panels
  const activePanels = selectedPanels.filter(Boolean).map(id => {
    const template = testTemplates?.find(t => t.panel_id === id);
    return {
      panelId: id,
      panelName: editedPanelNames?.[id] || template?.panel_name || id,
      price: testPrices[id] || 0
    };
  });

  const subtotal = activePanels.reduce((sum, panel) => sum + panel.price, 0);

  let discountAmt = 0;
  const numDiscountVal = parseFloat(discountValue) || 0;
  if (discountType === 'percentage') {
    discountAmt = subtotal * (numDiscountVal / 100);
  } else if (discountType === 'fixed') {
    discountAmt = numDiscountVal;
  }
  // Cap discount at subtotal
  discountAmt = Math.min(discountAmt, subtotal);

  const netTotal = Math.max(0, subtotal - discountAmt);
  const numAmountPaid = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, netTotal - numAmountPaid);

  let paymentStatus = 'UNPAID';
  if (numAmountPaid >= netTotal && netTotal > 0) {
    paymentStatus = 'PAID';
  } else if (numAmountPaid > 0 && numAmountPaid < netTotal) {
    paymentStatus = 'PARTIAL';
  } else if (netTotal === 0 && numAmountPaid === 0 && subtotal > 0) {
    paymentStatus = 'PAID'; // Fully discounted
  }

  const handleSave = async () => {
    if (activePanels.length === 0) return;
    setIsSaving(true);
    try {
      // Step 1: Save Patient
      const patientData = {
        mrNo: patientDetails.mrNo,
        trId: patientDetails.trId,
        trNo: patientDetails.trNo,
        name: patientDetails.name,
        fatherHusbandName: patientDetails.fatherHusbandName,
        age: patientDetails.age,
        gender: patientDetails.gender,
        contactNo: patientDetails.contactNo,
        address: patientDetails.address,
        consultant: patientDetails.consultant,
        sampleLocation: patientDetails.sampleLocation,
        registrationDate: new Date().toISOString()
      };

      const patientResult = await dbClient.savePatient(patientData);
      if (!patientResult?.success) throw new Error("Failed to save patient");
      const patientId = patientResult.data.id || patientResult.data;

      // Step 2: Save Patient Panels
      const panelsArray = activePanels.map(p => ({
        panelId: p.panelId,
        panelName: p.panelName,
        price: p.price
      }));
      const panelsResult = await dbClient.savePatientPanels(patientId, panelsArray);
      if (!panelsResult?.success) throw new Error("Failed to save panels");

      // Step 3: Save Transaction
      const transactionData = {
        patientId,
        totalAmount: subtotal,
        discountType,
        discountValue: numDiscountVal,
        discountedTotal: netTotal,
        amountPaid: numAmountPaid,
        balanceDue,
        paymentMethod,
        paymentStatus
      };
      const transResult = await dbClient.saveTransaction(transactionData);
      if (!transResult?.success) throw new Error("Failed to save transaction");

      // Step 4: Save Test Results
      if (testData && Object.keys(testData).length > 0) {
        const resultsRes = await dbClient.saveTestResults(patientId, testData);
        if (!resultsRes?.success) {
          console.warn("Failed to save some test results");
        }
      }

      // On Success
      if (window.showToast) window.showToast("Patient registered successfully!", "success");
      
      const mrNoResult = await dbClient.getNextMrNo();
      if (mrNoResult?.success && mrNoResult.data) {
        onSaveSuccess(mrNoResult.data);
      }
      setShowPrintInvoiceBtn(true);
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast("Registration failed. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-5 border-b border-gray-100 flex items-center space-x-3 shrink-0 bg-gray-50/50">
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div>
          <h2 className="font-bold text-gray-900 leading-tight">Billing</h2>
          <p className="text-xs text-gray-500">Patient Invoice</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white custom-sidebar-scrollbar">
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Selected Tests</h3>
          {activePanels.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No tests selected. Click a test in the sidebar to add it.</p>
          ) : (
            <ul className="space-y-2">
              {activePanels.map((p) => (
                <li key={p.panelId} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100/50 hover:border-red-100 transition-colors group">
                  <span className="text-sm font-semibold text-gray-700 truncate flex-1 pr-3" title={p.panelName}>{p.panelName}</span>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-sm font-bold text-gray-800 tracking-tight">Rs. {p.price.toLocaleString()}</span>
                    <button onClick={() => onRemovePanel(p.panelId)} className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100" title="Remove Test">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-px bg-gray-100" />

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-gray-500">Subtotal</span>
            <span className="text-sm font-bold text-gray-900">Rs. {subtotal.toLocaleString()}</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</span>
            </div>
            <div className="flex flex-col space-y-2">
              <select 
                value={discountType} 
                onChange={e => { setDiscountType(e.target.value); setDiscountValue(''); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 bg-white font-medium text-gray-700 hover:border-gray-300 transition-colors shadow-sm"
              >
                <option value="none">None</option>
                <option value="percentage">Percentage %</option>
                <option value="fixed">Fixed Amount</option>
              </select>
              {discountType !== 'none' && (
                <input 
                  type="number" min="0" step="any" placeholder="0" 
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 bg-white font-mono shadow-sm"
                />
              )}
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between items-center text-red-600 pt-1">
                <span className="text-xs font-semibold">Discount Amount</span>
                <span className="text-sm font-bold tracking-tight">- Rs. {Math.round(discountAmt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Payment Method</span>
            <div className="flex space-x-6">
              <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'cash' ? 'border-red-500' : 'border-gray-300 group-hover:border-red-400'}`}>
                    {paymentMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                <input type="radio" value="cash" checked={paymentMethod === 'cash'} onChange={e => setPaymentMethod(e.target.value)} className="hidden" />
                <span className="text-gray-700 font-semibold select-none group-hover:text-gray-900 transition-colors">Cash</span>
              </label>
              <label className="flex items-center space-x-2 text-sm cursor-pointer group">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'online' ? 'border-red-500' : 'border-gray-300 group-hover:border-red-400'}`}>
                    {paymentMethod === 'online' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                <input type="radio" value="online" checked={paymentMethod === 'online'} onChange={e => setPaymentMethod(e.target.value)} className="hidden" />
                <span className="text-gray-700 font-semibold select-none group-hover:text-gray-900 transition-colors">Online</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5 px-1 pt-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Amount Paid (Rs.)</label>
            <input 
              type="number" min="0" step="any" placeholder="0" 
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold font-mono focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 bg-white shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl flex flex-col space-y-2 mt-4">
          <div className="flex justify-between items-center text-sm opacity-80">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between items-center text-sm text-red-300">
              <span>Discount</span>
              <span>- Rs. {Math.round(discountAmt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-y border-gray-700/50 my-1">
            <span className="font-medium text-gray-300">Net Total</span>
            <span className="font-bold text-lg">Rs. {Math.round(netTotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm opacity-80 mt-1">
            <span>Amount Paid</span>
            <span>Rs. {Math.round(numAmountPaid).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm pt-1">
            <span className="text-gray-400 font-semibold">Balance Due</span>
            <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>Rs. {Math.round(balanceDue).toLocaleString()}</span>
          </div>
          
          <div className="mt-4 flex justify-end outline-none py-1">
            <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${
              paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {paymentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-gray-100 bg-white shrink-0 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleSave}
          disabled={activePanels.length === 0 || isSaving}
          className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center transition-all ${
            activePanels.length === 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : isSaving 
                ? 'bg-red-700 text-white opacity-80 cursor-wait'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-500/30 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-500/40 active:translate-y-0'
          }`}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save & Register Patient'
          )}
        </button>

        {showPrintInvoiceBtn && (
          <button 
            onClick={() => onPrintInvoice({
              patientName:    patientDetails.name || '—',
              mrNo:           patientDetails.mrNo || '—',
              age:            patientDetails.age || '—',
              gender:         patientDetails.gender || '—',
              contactNo:      patientDetails.contactNo || '—',
              consultant:     patientDetails.consultant || '—',
              invoiceDate:    new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              }),
              tests: activePanels.map(p => ({
                name: p.panelName,
                price: p.price
              })),
              subtotal:       subtotal,
              discountType:   discountType,
              discountValue:  numDiscountVal,
              discountAmount: Math.round(discountAmt),
              netTotal:       Math.round(netTotal),
              amountPaid:     Math.round(numAmountPaid),
              balanceDue:     Math.round(balanceDue),
              paymentMethod:  paymentMethod,
              paymentStatus:  paymentStatus.toLowerCase(),
            })}
            className="w-full border-2 border-red-600 text-red-600 hover:bg-red-50 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
        )}
      </div>
    </div>
  );
}
