import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import { setToken, setUser, clearPreLoginCredentials } from '../utils/auth';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    clearPreLoginCredentials();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onBlur' });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      const res = await loginUser(data);
      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/chat');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.requiresVerification) {
        // Redirect to verify if needed (would need to pass phone context)
        setServerError('Account not verified. Please verify your phone number.');
        // Optionally navigate to a verify page with state
      } else {
        setServerError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-centered">
      <div className="form-card">
        <div className="form-header">
          <div className="form-icon">🔐</div>
          <h1 className="form-title">Welcome Back</h1>
          <p className="form-subtitle">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field-group">
            <label htmlFor="email" className="field-label">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="john@example.com"
              className={`field-input ${errors.email ? 'field-error' : ''}`}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            {errors.email && <span className="error-msg">{errors.email.message}</span>}
          </div>

          <div className="field-group">
            <label htmlFor="password" className="field-label">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={`field-input ${errors.password ? 'field-error' : ''}`}
              {...register('password', {
                required: 'Password is required',
              })}
            />
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
          </div>

          {serverError && (
            <div className="server-error-box">
              <span>⚠️</span> {serverError}
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading"><span className="spinner" /> Logging in…</span>
            ) : (
              'Login →'
            )}
          </button>
        </form>
      </div>

      <p className="page-footnote">
        Don't have an account?{' '}
        <Link to="/" className="link-accent">Create Account</Link>
      </p>
    </div>
  );
};

export default Login;
