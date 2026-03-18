import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/images/Logo.png';
import { dbClient } from '../utils/dbClient';

function generateRecoveryKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export default function LockScreen({ initialMode, onUnlock }) {
  const [screen, setScreen] = useState(initialMode);
  const [authData, setAuthData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    dbClient.getAuthData().then(res => {
      if (res.success && mounted) setAuthData(res.data);
    });
    return () => { mounted = false; };
  }, []);

  // Setup state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySectionExpanded, setSecuritySectionExpanded] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("What was your first pet's name?");
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Login state
  const [loginPassword, setLoginPassword] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const passwordInputRef = useRef(null);

  // Forgot state
  const [forgotTab, setForgotTab] = useState('key'); // 'key' | 'question'
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  
  // Reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (screen === 'login' && passwordInputRef.current && !isLockedOut) {
      passwordInputRef.current.focus();
    }
  }, [screen, isLockedOut]);

  // CSS for shake
  const shakeCss = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
    }
    .shake { animation: shake 0.5s ease-in-out; }
  `;

  const handleSetup = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (securitySectionExpanded && (!securityQuestion || !securityAnswer)) {
      setError('Please provide both a security question and an answer.');
      return;
    }

    setIsLoading(true);
    const generatedRawKey = generateRecoveryKey();
    const cleanKey = generatedRawKey.replace(/-/g, '');

    const q = securitySectionExpanded ? securityQuestion : null;
    const a = securitySectionExpanded ? securityAnswer : null;

    const res = await dbClient.setInitialAuth(password, cleanKey, q, a);
    setIsLoading(false);
    
    if (res.success) {
      await dbClient.setSecurityEnabled(true);
      setRawKey(generatedRawKey);
      setScreen('showKey');
    } else {
      setError('Failed to save security settings.');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(rawKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (isLockedOut) return;
    setError('');

    const res = await dbClient.verifyPassword(loginPassword);
    if (res.success && res.data === true) {
      onUnlock();
    } else {
      setLoginPassword('');
      const newAttempt = attemptCount + 1;
      setAttemptCount(newAttempt);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (newAttempt >= 5) {
        setIsLockedOut(true);
        setLockoutSeconds(30);
        setError('');
        const interval = setInterval(() => {
          setLockoutSeconds(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsLockedOut(false);
              setAttemptCount(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(`Incorrect password. ${5 - newAttempt} attempts remaining.`);
      }
    }
  };

  const handleVerifyKey = async () => {
    setError('');
    const cleanKey = recoveryKeyInput.replace(/-/g, '');
    const res = await dbClient.verifyRecoveryKey(cleanKey);
    if (res.success && res.data === true) {
      setScreen('resetPass');
    } else {
      setError('Invalid recovery key.');
    }
  };

  const handleVerifyQuestion = async () => {
    setError('');
    const res = await dbClient.verifySecurityAnswer(recoveryAnswerInput);
    if (res.success && res.data === true) {
      setScreen('resetPass');
    } else {
      setError('Incorrect answer.');
    }
  };

  const handleResetPass = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    const res = await dbClient.resetPassword(newPassword);
    if (res.success) {
      setResetSuccess(true);
      setTimeout(() => {
        setScreen('login');
        setLoginPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetSuccess(false);
        setAttemptCount(0);
        setIsLockedOut(false);
      }, 1500);
    } else {
      setError('Failed to reset password.');
    }
  };

  const renderLogo = () => (
    <div className="mb-4">
      <img src={logo} className="w-20 h-20 object-contain mx-auto mb-4" alt="Bukhari Lab" />
      <h1 className="text-white font-bold italic text-2xl tracking-tight text-center">BUKHARI LAB</h1>
      <p className="text-red-300 text-sm italic text-center mt-0.5">AL BASIT MEDICAL CENTER</p>
      <div className="border-t border-white/20 my-5"></div>
    </div>
  );

  return (
    <div className="w-full max-w-sm mx-auto">
      <style>{shakeCss}</style>
      <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl ${isShaking ? 'shake' : ''}`}>
        {renderLogo()}

        {screen === 'setup' && (
          <div>
            <h2 className="text-white font-semibold text-lg text-center mb-1">Create Your Password</h2>
            <p className="text-gray-400 text-xs text-center mb-5">Secure your patient data.</p>
            
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm mb-3"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm mb-3"
            />

            <div className="text-center mb-4 mt-2">
              <span 
                className="text-gray-400 text-xs underline cursor-pointer hover:text-white"
                onClick={() => setSecuritySectionExpanded(!securitySectionExpanded)}
              >
                {securitySectionExpanded ? '− Remove security question' : '+ Add security question (optional)'}
              </span>
            </div>

            {securitySectionExpanded && (
              <div className="mb-4 space-y-3">
                <select
                  value={securityQuestion}
                  onChange={e => setSecurityQuestion(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm [&>option]:text-gray-900"
                >
                  <option value="What was your first pet's name?">What was your first pet's name?</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What was the name of your first school?">What was the name of your first school?</option>
                  <option value="What is your oldest sibling's name?">What is your oldest sibling's name?</option>
                </select>
                <input
                  type="text"
                  placeholder="Your answer (case-insensitive)"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                />
                <p className="text-gray-500 text-xs mt-1">Answers are case-insensitive.</p>
              </div>
            )}

            {error && <p className="text-red-400 text-xs mt-1 mb-3">{error}</p>}

            <button
              onClick={handleSetup}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {isLoading ? 'Setting...' : 'Set Password'}
            </button>

            <button
              onClick={async () => {
                await dbClient.setSecurityEnabled(false);
                if (typeof window.showToast === 'function') {
                  window.showToast("Security bypassed. Application is open.", "info");
                }
                onUnlock();
              }}
              disabled={isLoading}
              className="bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-400 hover:text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors disabled:opacity-50"
            >
              Skip Security (Not Recommended)
            </button>
          </div>
        )}

        {screen === 'showKey' && (
          <div>
            <h2 className="text-white font-semibold text-lg text-center mb-1">Save Your Recovery Key</h2>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 mb-5">
              <p className="text-amber-300 text-xs text-center">
                Write this key down and store it in a safe place. It will NEVER be shown again. You will need it if you forget your password.
              </p>
            </div>
            
            <div className="bg-black/30 border border-white/30 rounded-xl p-4 text-center mb-4">
              <p className="text-white font-mono text-2xl tracking-[0.3em] font-bold">{rawKey}</p>
            </div>
            
            <div className="text-center mb-6">
              <button
                onClick={handleCopyKey}
                className="border border-white/20 text-gray-300 hover:bg-white/10 rounded px-3 py-1 text-xs transition-colors"
              >
                {copySuccess ? <span className="text-green-400">Copied ✓</span> : 'Copy Key'}
              </button>
            </div>

            <label className="flex items-start gap-2 mb-6 cursor-pointer group">
              <input
                type="checkbox"
                checked={keySaved}
                onChange={e => setKeySaved(e.target.checked)}
                className="mt-1"
              />
              <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                I have written down my recovery key and stored it safely.
              </span>
            </label>

            <button
              onClick={onUnlock}
              disabled={!keySaved}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to App
            </button>
          </div>
        )}

        {screen === 'login' && (
          <form onSubmit={handleLogin}>
            <h2 className="text-white font-semibold text-lg text-center mb-1">Welcome Back</h2>
            <p className="text-gray-400 text-xs text-center mb-5">Enter your password to continue.</p>
            
            <input
              ref={passwordInputRef}
              type="password"
              placeholder="Enter password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              disabled={isLockedOut}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm mb-1 disabled:opacity-50"
            />
            
            {error && <p className="text-red-400 text-xs text-center mt-2 mb-3">{error}</p>}
            {isLockedOut && <p className="text-amber-400 text-xs text-center mt-2 mb-3">Too many attempts. Try again in {lockoutSeconds}s.</p>}
            {!error && !isLockedOut && <div className="h-4 mb-3"></div>}

            <button
              type="submit"
              disabled={isLockedOut}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
            >
              Unlock App
            </button>

            <button
              type="button"
              onClick={() => { setScreen('forgot'); setError(''); }}
              className="text-gray-400 hover:text-white text-sm text-center w-full py-2 transition-colors"
            >
              Forgot Password?
            </button>
          </form>
        )}

        {screen === 'forgot' && (
          <div>
            <div className="relative mb-6">
              <button
                onClick={() => { setScreen('login'); setError(''); }}
                className="absolute left-0 top-1 text-gray-400 hover:text-white text-xs"
              >
                ← Back to Login
              </button>
              <h2 className="text-white font-semibold text-lg text-center mb-1 mt-6">Account Recovery</h2>
            </div>

            <div className="flex gap-4 border-b border-white/10 mb-5 pb-0">
              <button
                onClick={() => { setForgotTab('key'); setError(''); }}
                className={`text-sm pb-1 px-1 ${forgotTab === 'key' ? 'text-white font-semibold border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Recovery Key
              </button>
              {authData?.hasSecurityQuestion && (
                <button
                  onClick={() => { setForgotTab('question'); setError(''); }}
                  className={`text-sm pb-1 px-1 ${forgotTab === 'question' ? 'text-white font-semibold border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Security Question
                </button>
              )}
            </div>

            {forgotTab === 'key' && (
              <div>
                <p className="text-gray-400 text-xs text-center mb-4">Enter the 16-character recovery key you saved during setup.</p>
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={recoveryKeyInput}
                  onChange={e => setRecoveryKeyInput(e.target.value.toUpperCase())}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 font-mono tracking-widest text-center text-lg mb-1"
                />
                {error && <p className="text-red-400 text-xs text-center mt-2 mb-3">{error}</p>}
                {!error && <div className="h-4 mb-3"></div>}
                <button
                  onClick={handleVerifyKey}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors"
                >
                  Verify Key
                </button>
              </div>
            )}

            {forgotTab === 'question' && authData?.hasSecurityQuestion && (
              <div>
                <div className="bg-white/10 rounded-lg px-4 py-3 mb-4">
                  <p className="text-white text-sm text-center font-medium">{authData.securityQuestion}</p>
                </div>
                <input
                  type="text"
                  placeholder="Your answer"
                  value={recoveryAnswerInput}
                  onChange={e => setRecoveryAnswerInput(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm mb-1"
                />
                {error && <p className="text-red-400 text-xs text-center mt-2 mb-3">{error}</p>}
                {!error && <div className="h-4 mb-3"></div>}
                <button
                  onClick={handleVerifyQuestion}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors"
                >
                  Verify Answer
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'resetPass' && (
          <div>
            <h2 className="text-white font-semibold text-lg text-center mb-1">Set New Password</h2>
            {resetSuccess ? (
              <p className="text-green-400 text-sm text-center mb-5 mt-4">Password reset successfully!</p>
            ) : (
              <>
                <p className="text-green-400 text-xs text-center mb-5">Recovery verified. Create your new password.</p>
                
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm mb-3"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-red-400 text-sm mb-1"
                />
                
                {error && <p className="text-red-400 text-xs mt-1 mb-3">{error}</p>}
                {!error && <div className="h-4 mb-3"></div>}

                <button
                  onClick={handleResetPass}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg w-full text-sm transition-colors"
                >
                  Reset Password
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
