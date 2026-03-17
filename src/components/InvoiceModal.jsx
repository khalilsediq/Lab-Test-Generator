import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Logo from '../assets/images/Logo.png';

export default function InvoiceModal({ data, onClose }) {
  // ── Print styles injection ──────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'invoice-print-style';
    style.textContent = `
      @media print {
        /* Isolation: Hide everything except the print target */
        body > *:not(#report-print-target) { 
          display: none !important; 
        }

        html, body {
          display: block !important;
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #report-print-target { 
          display: block !important; 
          position: static !important;
          width: 100% !important;
          height: auto !important;
          background: white !important;
        }

        /* Override global A4 constraints for our A5 document */
        #report-print-target #invoice-document {
          width: 148mm !important;
          min-height: 210mm !important;
          padding: 8mm !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          display: flex !important;
          flex-direction: column !important;
        }

        @page {
          size: A5 portrait;
          margin: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById('invoice-print-style');
      if (existing) existing.remove();
    };
  }, []);

  if (!data) return null;

  const {
    patientName,
    mrNo,
    age,
    gender,
    contactNo,
    consultant,
    invoiceDate,
    tests,
    subtotal,
    discountType,
    discountAmount,
    netTotal,
    amountPaid,
    balanceDue,
    paymentMethod,
    paymentStatus,
  } = data;

  // ── The actual invoice document ─────────────────────────────────────────────
  const InvoiceDocument = (
    <div 
      id="invoice-document"
      className="bg-white shadow-lg w-[148mm] min-h-[210mm] p-[8mm] text-black font-sans print:shadow-none flex flex-col"
    >
      {/* SECTION 1 — LAB HEADER */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <img src={Logo} alt="Bukhari Lab Logo" className="w-16 h-16 object-contain" />
          <div className="flex flex-col">
            <h1 className="text-red-600 font-bold italic text-2xl tracking-tight leading-none mb-1">BUKHARI LAB</h1>
            <h2 className="text-red-600 font-bold italic text-[11pt]">AL BASIT MEDICAL CENTER</h2>
          </div>
        </div>
        <div className="text-right text-red-600 italic font-bold">
          <div className="text-[8pt] uppercase tracking-wider mb-0.5 opacity-80">LAB TECHNICIAN</div>
          <div className="text-[11pt] tracking-tight mb-0.5 whitespace-nowrap">SYED MOHEEB ULLAH</div>
          <div className="text-[10pt] tracking-widest leading-none">0332-3333800</div>
        </div>
      </div>
      <div className="border-t-2 border-red-600 mb-4 w-full"></div>

      {/* SECTION 2 — INVOICE LABEL AND DATE */}
      <div className="flex justify-between items-end mb-4">
        <span className="text-xl font-bold text-gray-900 tracking-[0.2em] uppercase">INVOICE</span>
        <span className="text-[10pt] text-gray-500 text-right">{invoiceDate}</span>
      </div>
      <div className="border-t border-gray-200 mb-4"></div>

      {/* SECTION 3 — PATIENT DETAILS */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
        <div className="space-y-2">
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">Patient:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{patientName}</span>
          </div>
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">MR No:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{mrNo}</span>
          </div>
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">Age/Gender:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{age} / {gender}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">Contact:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{contactNo}</span>
          </div>
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">Doctor:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{consultant}</span>
          </div>
          <div className="flex items-start">
            <span className="text-[9pt] text-gray-400 uppercase tracking-wide w-24 shrink-0">Date:</span>
            <span className="text-[10pt] font-semibold text-gray-900">{invoiceDate.split(',')[0]}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 mb-4"></div>

      {/* SECTION 4 — TESTS TABLE */}
      <div className="mb-6">
        <div className="flex justify-between bg-gray-100 rounded px-3 py-1.5 mb-2">
          <span className="text-[8pt] font-bold uppercase text-gray-600">TEST NAME</span>
          <span className="text-[8pt] font-bold uppercase text-gray-600 text-right">PRICE (Rs.)</span>
        </div>
        <div className="space-y-0.5">
          {tests && tests.length > 0 ? (
            tests.map((test, idx) => (
              <div key={idx} className="flex justify-between py-1.5 px-1 border-b border-gray-100 last:border-0">
                <span className="text-[10pt] text-gray-900">{test.name}</span>
                <span className="text-[10pt] font-mono text-gray-900 text-right">
                  {test.price.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-6 italic text-sm">No tests recorded</div>
          )}
        </div>
        <div className="border-t border-gray-300 mt-2"></div>
      </div>

      {/* SECTION 5 — BILLING SUMMARY */}
      <div className="flex justify-end">
        <div className="w-1/2 space-y-1.5 text-right">
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-[9pt] text-gray-500">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[9pt] text-red-600">
                <span>Discount ({discountType})</span>
                <span>- Rs. {discountAmount.toLocaleString()}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between text-[11pt] font-bold text-gray-900 border-t border-gray-300 pt-1 mt-1">
            <span>NET TOTAL</span>
            <span>Rs. {netTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-[9pt] text-gray-600 pt-1">
            <span>Amount Paid</span>
            <span>Rs. {amountPaid.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-[9pt] font-medium pt-0.5">
            <span className="text-gray-600">Balance Due</span>
            <span className={balanceDue > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
              Rs. {balanceDue.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-[9pt] text-gray-500 pt-0.5">
            <span>Payment Method</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
        </div>
      </div>

      {/* SECTION 6 — PAYMENT STATUS BADGE */}
      <div className="text-center mt-6">
        <div className={`inline-block px-5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase border ${
          paymentStatus.toLowerCase() === 'paid' 
            ? 'bg-green-100 text-green-700 border-green-200' 
            : paymentStatus.toLowerCase() === 'partial'
              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
              : 'bg-red-100 text-red-600 border-red-200'
        }`}>
          {paymentStatus.toLowerCase() === 'paid' ? '✓ PAID IN FULL' : 
           paymentStatus.toLowerCase() === 'partial' ? '◑ PARTIALLY PAID' : '✗ UNPAID'}
        </div>
      </div>

      {/* SECTION 7 — FOOTER */}
      <div className="mt-auto pt-8">
        <div className="border-t border-gray-200 pt-4 text-center">
          <p className="text-[9pt] text-gray-400 italic">Thank you for choosing Bukhari Lab</p>
          <p className="text-[7pt] text-gray-300 mt-2">Developed by KS Tech · +92-370-891-1924</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Screen Visuals ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-[158mm] max-h-[95vh] flex flex-col overflow-hidden">
          
          {/* Toolbar */}
          <div className="bg-white px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-gray-700">Invoice Preview</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-1.5 text-sm transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Invoice
              </button>
            </div>
          </div>

          {/* Scrollable Document Area */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-50">
            {InvoiceDocument}
          </div>
        </div>
      </div>

      {/* ── Print Target Portal ────────────────────────────────────────── */}
      {createPortal(
        <div id="report-print-target" className="screen-only">
          {InvoiceDocument}
        </div>,
        document.body
      )}
    </>
  );
}
