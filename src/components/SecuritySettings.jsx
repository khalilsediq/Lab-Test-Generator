import React, { useState, useEffect } from 'react';
import { dbClient } from '../utils/dbClient';

export default function SecuritySettings({ onEnableSecurity, onSecurityChanged }) {
  const [authData, setAuthData] = useState(null);
  
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Security Question state
  const [currentPasswordForQ, setCurrentPasswordForQ] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState("What was your first pet's name?");
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [qError, setQError] = useState('');
  const [isUpdatingQ, setIsUpdatingQ] = useState(false);
  const [showQForm, setShowQForm] = useState(false);

  // Remove Security state
  const [removePassword, setRemovePassword] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchAuthData = async () => {
    const res = await dbClient.getAuthData();
    if (res.success) {
      setAuthData(res.data);
      if (!res.data.hasSecurityQuestion) {
        setShowQForm(true);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await dbClient.getAuthData();
      if (mounted && res.success) {
        setAuthData(res.data);
        if (!res.data.hasSecurityQuestion) {
          setShowQForm(true);
        }
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleUpdatePassword = async () => {
    setPassError('');
    if (!currentPassword) {
      setPassError('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsUpdatingPass(true);
    const verifyRes = await dbClient.verifyPassword(currentPassword);
    if (!verifyRes.success || !verifyRes.data) {
      setPassError('Current password is incorrect.');
      setIsUpdatingPass(false);
      return;
    }

    const resetRes = await dbClient.resetPassword(newPassword);
    setIsUpdatingPass(false);
    if (resetRes.success) {
      if (typeof window.showToast === 'function') window.showToast("Password updated successfully.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setPassError('Failed to update password.');
    }
  };

  const handleUpdateQuestion = async () => {
    setQError('');
    if (!currentPasswordForQ) {
      setQError('Current password is required.');
      return;
    }
    if (!securityAnswer) {
      setQError('Please provide an answer.');
      return;
    }

    setIsUpdatingQ(true);
    const verifyRes = await dbClient.verifyPassword(currentPasswordForQ);
    if (!verifyRes.success || !verifyRes.data) {
      setQError('Current password is incorrect.');
      setIsUpdatingQ(false);
      return;
    }

    const updateRes = await dbClient.updateSecurityQuestion(securityQuestion, securityAnswer);
    setIsUpdatingQ(false);
    
    if (updateRes.success) {
      if (typeof window.showToast === 'function') window.showToast("Security question updated.");
      setCurrentPasswordForQ('');
      setSecurityAnswer('');
      setShowQForm(false);
      fetchAuthData();
    } else {
      setQError('Failed to update security question.');
    }
  };

  const handleRemoveSecurity = async () => {
    setRemoveError('');
    if (!removePassword) {
      setRemoveError('Current password is required.');
      return;
    }
    setIsRemoving(true);
    const verifyRes = await dbClient.verifyPassword(removePassword);
    if (!verifyRes.success || !verifyRes.data) {
      setRemoveError('Incorrect password.');
      setIsRemoving(false);
      return;
    }

    const res = await dbClient.setSecurityEnabled(false);
    setIsRemoving(false);
    if (res.success) {
      if (typeof window.showToast === 'function') window.showToast("Security has been disabled.", "info");
      fetchAuthData();
      if (onSecurityChanged) onSecurityChanged();
    } else {
      setRemoveError('Failed to remove security.');
    }
  };

  if (authData?.isSecurityEnabled === false) {
    return (
      <div className="w-full h-full pt-4 sm:pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500 mt-1">Security is currently disabled.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center mt-6">
          <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4m-4 5v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Password Protection is Off</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Enable security to protect patient data with a password and recovery key.</p>
          <button
            onClick={onEnableSecurity}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            Enable Security & Set Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full pt-4 sm:pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your password and recovery options.</p>
      </div>

      <div className="space-y-6">
        {/* Change Password Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 line-height-relaxed">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
          <div className="max-w-md">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block"
            />
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={e => setConfirmNewPassword(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block"
            />
            
            {passError && <p className="text-red-500 text-xs mb-3">{passError}</p>}
            
            <button
              onClick={handleUpdatePassword}
              disabled={isUpdatingPass}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isUpdatingPass ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Security Question Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 line-height-relaxed">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Security Question</h3>
          <p className="text-sm text-gray-400 mb-4">Used as a backup recovery method.</p>
          
          <div className="max-w-md">
            {authData?.hasSecurityQuestion && !showQForm && (
              <div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 mb-4">
                  {authData.securityQuestion}
                </div>
                <button
                  onClick={() => setShowQForm(true)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  Update Security Question
                </button>
              </div>
            )}

            {showQForm && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <select
                  value={securityQuestion}
                  onChange={e => setSecurityQuestion(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 bg-white"
                >
                  <option value="What was your first pet's name?">What was your first pet's name?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What was the name of your first school?">What was the name of your first school?</option>
                  <option value="What is your oldest sibling's name?">What is your oldest sibling's name?</option>
                </select>
                
                <input
                  type="text"
                  placeholder="New answer (case-insensitive)"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block"
                />
                
                <input
                  type="password"
                  placeholder="Current password to confirm"
                  value={currentPasswordForQ}
                  onChange={e => setCurrentPasswordForQ(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block"
                />

                {qError && <p className="text-red-500 text-xs mt-1 mb-3">{qError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateQuestion}
                    disabled={isUpdatingQ}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {isUpdatingQ ? 'Saving...' : 'Save Security Question'}
                  </button>
                  {authData?.hasSecurityQuestion && (
                    <button
                      onClick={() => { setShowQForm(false); setQError(''); }}
                      className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Remove Security Card */}
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6 line-height-relaxed mt-6">
          <h3 className="text-base font-semibold text-red-600 mb-1">Remove Security</h3>
          <p className="text-sm text-gray-500 mb-4">Disable password protection completely.</p>
          <div className="max-w-md bg-red-50 p-4 rounded-lg border border-red-100">
            <input
              type="password"
              placeholder="Current password to confirm"
              value={removePassword}
              onChange={e => setRemovePassword(e.target.value)}
              className="border border-red-200 rounded-lg px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 mb-3 block bg-white"
            />
            {removeError && <p className="text-red-500 text-xs mb-3">{removeError}</p>}
            <button
              onClick={handleRemoveSecurity}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isRemoving ? 'Removing...' : 'Disable Password Protection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
