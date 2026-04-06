import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Validation ────────────────────────────────────────────────────────────────

function validate(fields) {
  const errors = {};

  if (!fields.full_name) {
    errors.full_name = 'Full name is required';
  } else if (fields.full_name.trim().length < 2) {
    errors.full_name = 'Name must be at least 2 characters';
  } else if (fields.full_name.trim().length > 100) {
    errors.full_name = 'Name must be 100 characters or fewer';
  }

  if (!fields.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!fields.password) {
    errors.password = 'Password is required';
  } else if (fields.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(fields.password)) {
    errors.password = 'Password must contain at least one uppercase letter';
  } else if (!/[0-9]/.test(fields.password)) {
    errors.password = 'Password must contain at least one number';
  }

  if (!fields.confirm_password) {
    errors.confirm_password = 'Please confirm your password';
  } else if (fields.confirm_password !== fields.password) {
    errors.confirm_password = 'Passwords do not match';
  }

  return errors;
}

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(password) {
  if (!password) return null;
  if (password.length < 8) return 'weak';

  const hasUpper   = /[A-Z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSymbol  = /[^A-Za-z0-9]/.test(password);
  const isLong     = password.length >= 12;

  if (isLong && hasUpper && hasNumber && hasSymbol) return 'strong';
  if (hasUpper && hasNumber) return 'medium';
  return 'medium';
}

const strengthConfig = {
  weak:   { label: 'Weak',   width: 'w-1/3', color: 'bg-red-500' },
  medium: { label: 'Medium', width: 'w-2/3', color: 'bg-yellow-400' },
  strong: { label: 'Strong', width: 'w-full', color: 'bg-green-500' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
  });
  const [touched, setTouched]         = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  if (user) return <Navigate to="/" replace />;

  const errors   = validate(fields);
  const isValid  = Object.keys(errors).length === 0;
  const strength = getStrength(fields.password);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((f) => ({ ...f, [name]: value }));
    setServerError('');
  }

  function handleBlur(e) {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ full_name: true, email: true, password: true, confirm_password: true });
    if (!isValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await register(fields.full_name.trim(), fields.email, fields.password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      // express-validator array or plain error string
      const msg = Array.isArray(data?.errors)
        ? data.errors[0].msg
        : (data?.error || 'Registration failed. Please try again.');
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg border text-gray-800 placeholder-gray-400 text-sm
     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
     ${touched[field] && errors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-gray-300 bg-white hover:border-gray-400'}`;

  const FieldError = ({ field }) =>
    touched[field] && errors[field] ? (
      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
        </svg>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-[calc(100vh-128px)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Join Yaxshilik.uz</h1>
          <p className="text-gray-500 mt-2 text-sm">Start making a difference today</p>
        </div>

        {/* Card */}
        <div className="bg-white shadow-lg rounded-xl p-8">

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
              </svg>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name" name="full_name" type="text" autoComplete="name"
                value={fields.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Alisher Navoi"
                className={inputClass('full_name')}
              />
              <FieldError field="full_name" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
                className={inputClass('email')}
              />
              <FieldError field="email" />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password" name="password" type="password" autoComplete="new-password"
                value={fields.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                className={inputClass('password')}
              />

              {/* Strength bar */}
              {fields.password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300
                        ${strengthConfig[strength].width}
                        ${strengthConfig[strength].color}`}
                    />
                  </div>
                  <p className={`mt-1 text-xs font-medium
                    ${strength === 'weak'   ? 'text-red-500'    : ''}
                    ${strength === 'medium' ? 'text-yellow-600' : ''}
                    ${strength === 'strong' ? 'text-green-600'  : ''}`}>
                    {strengthConfig[strength].label} password
                  </p>
                </div>
              )}

              <FieldError field="password" />

              {/* Requirements hint */}
              {!touched.password && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Min. 8 characters, 1 uppercase letter, 1 number
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm_password">
                Confirm password
              </label>
              <input
                id="confirm_password" name="confirm_password" type="password" autoComplete="new-password"
                value={fields.confirm_password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                className={inputClass('confirm_password')}
              />
              {/* Show match indicator when both fields have values */}
              {fields.confirm_password && fields.password && !errors.confirm_password && (
                <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                  Passwords match
                </p>
              )}
              <FieldError field="confirm_password" />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                disabled:opacity-70 disabled:cursor-not-allowed
                text-white font-semibold py-2.5 rounded-lg transition-colors mt-1"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
