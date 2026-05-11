import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { registerUser } from '../services/api';

const RegisterForm = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({ mode: 'onBlur' });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    let formattedPhone = data.phone.trim().replace(/\s/g, '');
    
    // If it's a 10-digit number starting with 6-9, assume India (+91)
    if (/^[6-9]\d{9}$/.test(formattedPhone)) {
      formattedPhone = '+91' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        phone: formattedPhone,
        password: data.password,
      });

      // Pass form data up so OTP screen has context (including password now)
      onSuccess({ 
        name: data.name, 
        email: data.email, 
        phone: formattedPhone,
        password: data.password 
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Something went wrong. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <div className="form-icon">👤</div>
        <h1 className="form-title">Create Account</h1>
        <p className="form-subtitle">Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Name */}
        <div className="field-group">
          <label htmlFor="name" className="field-label">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            className={`field-input ${errors.name ? 'field-error' : ''}`}
            {...register('name', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.name && <span className="error-msg">{errors.name.message}</span>}
        </div>

        {/* Email */}
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

        {/* Phone */}
        <div className="field-group">
          <label htmlFor="phone" className="field-label">Phone Number</label>
          <input
            id="phone"
            type="tel"
            placeholder="9876543210"
            className={`field-input ${errors.phone ? 'field-error' : ''}`}
            {...register('phone', {
              required: 'Phone number is required',
              pattern: {
                value: /^(\+91)?[6-9]\d{9}$|^\+?[1-9]\d{6,14}$/,
                message: 'Enter a valid 10-digit number or include country code',
              },
            })}
          />
          <span className="field-hint">Default is +91 (India). Just enter your 10-digit number.</span>
          {errors.phone && <span className="error-msg">{errors.phone.message}</span>}
        </div>

        {/* Password */}
        <div className="field-group">
          <label htmlFor="password" className="field-label">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className={`field-input ${errors.password ? 'field-error' : ''}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 5, message: 'Minimum 5 characters' },
              maxLength: { value: 20, message: 'Maximum 20 characters' },
              validate: {
                hasUpper: (v) => /[A-Z]/.test(v) || 'Must include an uppercase letter',
                hasLower: (v) => /[a-z]/.test(v) || 'Must include a lowercase letter',
                hasNumber: (v) => /[0-9]/.test(v) || 'Must include a number',
                hasSpecial: (v) => /[!@#$%^&*]/.test(v) || 'Must include a special character (!@#$%^&*)',
                noSpaces: (v) => !v.includes(' ') || 'No spaces allowed',
                notIdentity: (v) => {
                  const vals = getValues();
                  if (v === vals.email || v === vals.phone) {
                    return 'Password must not match email or phone number';
                  }
                  return true;
                }
              }
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
          id="register-submit-btn"
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? (
            <span className="btn-loading"><span className="spinner" /> Sending OTP…</span>
          ) : (
            'Send OTP →'
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
