import React, { useState, useEffect } from 'react';
import { dbClient } from '../utils/dbClient';

export default function ApplicationUpdater() {
  const [currentVersion, setCurrentVersion] = useState('...');
  const [status, setStatus] = useState('idle'); // idle, checking, available, not-available, downloading, downloaded, error
  const [versionInfo, setVersionInfo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Get current version on mount
    dbClient.getAppVersion().then(ver => setCurrentVersion(ver));

    // Register IPC listeners
    const handleChecking = () => {
      setStatus('checking');
      setErrorMsg('');
    };
    const handleAvailable = (info) => {
      setStatus('available');
      setVersionInfo(info);
    };
    const handleNotAvailable = () => {
      setStatus('not-available');
      if (window.showToast) {
        window.showToast('You are on the latest version! 🎉', 'success');
      }
    };
    const handleError = (err) => {
      if (err && err.toLowerCase().includes('cancel')) {
        setStatus('available');
        return;
      }
      setStatus('error');
      setErrorMsg(err);
    };
    const handleProgress = (prog) => {
      setStatus('downloading');
      setProgress(prog);
    };
    const handleDownloaded = (info) => {
      setStatus('downloaded');
      setVersionInfo(info);
    };

    dbClient.onUpdaterEvent('updater:checking', handleChecking);
    dbClient.onUpdaterEvent('updater:update-available', handleAvailable);
    dbClient.onUpdaterEvent('updater:update-not-available', handleNotAvailable);
    dbClient.onUpdaterEvent('updater:error', handleError);
    dbClient.onUpdaterEvent('updater:download-progress', handleProgress);
    dbClient.onUpdaterEvent('updater:update-downloaded', handleDownloaded);

    return () => {
      dbClient.offUpdaterEvent('updater:checking', handleChecking);
      dbClient.offUpdaterEvent('updater:update-available', handleAvailable);
      dbClient.offUpdaterEvent('updater:update-not-available', handleNotAvailable);
      dbClient.offUpdaterEvent('updater:error', handleError);
      dbClient.offUpdaterEvent('updater:download-progress', handleProgress);
      dbClient.offUpdaterEvent('updater:update-downloaded', handleDownloaded);
    };
  }, []);

  const handleCheck = () => {
    setStatus('checking');
    dbClient.updaterCheck();
  };

  const handleDownload = () => {
    setStatus('downloading');
    setProgress({ percent: 0, transferred: 0, total: 100, bytesPerSecond: 0 }); // reset view
    dbClient.updaterDownload();
  };

  const handleCancelDownload = () => {
    setStatus('available');
    dbClient.updaterCancel();
  };

  const handleInstall = () => {
    dbClient.updaterInstall();
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Application Update</h2>
      <p className="text-gray-600 mb-8">
        Current Version: <span className="font-semibold text-gray-900">{currentVersion}</span>
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden transition-all duration-300 min-h-[250px] flex flex-col justify-center">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center p-4">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Check for Updates</h3>
            <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
              Ensure you have the latest features and bug fixes. Updates are not downloaded automatically in the background.
            </p>
            <button onClick={handleCheck} className="px-6 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition shadow-sm">
              Check for Updates
            </button>
          </div>
        )}

        {status === 'checking' && (
          <div className="flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-800 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium mb-6">Communicating with update server...</p>
            <button 
              onClick={() => setStatus('idle')} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'not-available' && (
          <div className="flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">You are up to date!</h3>
            <p className="text-sm text-gray-500 mb-6">You are running the latest version of Bukhari Lab.</p>
            <div className="flex gap-3">
              <button 
                onClick={handleCheck} 
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition"
              >
                Check Again
              </button>
              <button 
                onClick={() => setStatus('idle')} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {status === 'available' && versionInfo && (
          <div className="flex flex-col items-start p-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">New Update Available</h3>
                <p className="text-sm text-gray-500 font-medium">Version <span className="text-blue-600">{versionInfo.version}</span> is ready to download.</p>
              </div>
            </div>
            
            {versionInfo.releaseNotes && (
              <div className="mt-2 w-full bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto mb-2">
                {typeof versionInfo.releaseNotes === 'string' ? versionInfo.releaseNotes : "System enhancement update."}
              </div>
            )}

            <div className="mt-6 flex gap-3 w-full border-t border-gray-100 pt-5">
              <button 
                onClick={handleDownload} 
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
              >
                Download Update
              </button>
              <button 
                onClick={() => setStatus('idle')} 
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === 'downloading' && progress && (
          <div className="flex flex-col p-4 w-full animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Downloading Update...</h3>
                <p className="text-sm text-gray-500">Please do not close the application.</p>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {Math.round(progress.percent)}%
              </div>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden relative shadow-inner">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out relative" 
                style={{ width: `${Math.max(progress.percent, 2)}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }}></div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 font-medium mb-4">
              <span>{(progress.transferred / 1048576).toFixed(1)} MB of {(progress.total / 1048576).toFixed(1)} MB</span>
              <span>{(progress.bytesPerSecond / 1048576).toFixed(2)} MB/s</span>
            </div>
            
            <div className="flex justify-center mt-2">
              <button 
                onClick={handleCancelDownload}
                className="px-5 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg font-medium hover:bg-gray-50 transition shadow-sm"
              >
                Cancel Download
              </button>
            </div>
            <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </div>
        )}

        {status === 'downloaded' && (
          <div className="flex flex-col items-center justify-center p-4 animate-in zoom-in duration-500">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm relative">
              <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ping opacity-20"></div>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Update Ready to Install</h3>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">
              Version {versionInfo?.version} has been successfully downloaded. The application requires a quick restart to apply the update.
            </p>
            <button 
              onClick={handleInstall} 
              className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md w-full sm:w-auto hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Restart & Install
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center text-center p-4 w-full animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Update Failed</h3>
            <p className="text-sm text-red-600/80 mb-6 max-w-sm bg-red-50 p-3 rounded-lg border border-red-100 max-h-32 overflow-y-auto">
              {errorMsg?.toString() || "An unknown error occurred while updating."}
            </p>
            <div className="flex gap-3">
              <button onClick={handleCheck} className="px-5 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition">
                Try Again
              </button>
              <button onClick={() => setStatus('idle')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
