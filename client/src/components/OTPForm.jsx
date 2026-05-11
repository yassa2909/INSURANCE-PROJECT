import { useState, useRef, useEffect } from 'react';
import { verifyOTP as verifyOTPApi, sendOTP } from '../services/api';
import { setToken, setUser } from '../utils/auth';

const OTPForm = ({ userData, onSuccess, onBack }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyOTPApi({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        code,
      });

      setToken(res.data.token);
      setUser(res.data.user);
      onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Verification failed. Please try again.';
      setError(msg);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await sendOTP(userData.phone);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <div className="form-icon">📱</div>
        <h1 className="form-title">Verify Your Phone</h1>
        <p className="form-subtitle">
          We sent a 6-digit code to <strong>{userData.phone}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="otp-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-input-${index}`}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`otp-input ${error ? 'field-error' : ''} ${digit ? 'otp-filled' : ''}`}
              autoFocus={index === 0}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {error && (
          <div className="server-error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          id="otp-submit-btn"
          type="submit"
          className="btn-primary"
          disabled={loading || otp.join('').length < 6}
        >
          {loading ? (
            <span className="btn-loading"><span className="spinner" /> Verifying…</span>
          ) : (
            'Verify OTP →'
          )}
        </button>
      </form>

      <div className="otp-footer">
        <button
          id="otp-back-btn"
          type="button"
          className="btn-ghost"
          onClick={onBack}
        >
          ← Change Details
        </button>

        <button
          id="otp-resend-btn"
          type="button"
          className="btn-ghost"
          onClick={handleResend}
          disabled={resendTimer > 0 || resending}
        >
          {resending
            ? 'Sending…'
            : resendTimer > 0
            ? `Resend in ${resendTimer}s`
            : 'Resend OTP'}
        </button>
      </div>
    </div>
  );
};

export default OTPForm;
