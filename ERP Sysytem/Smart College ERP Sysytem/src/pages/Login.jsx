// src/pages/Login.jsx (only show key changes)
import { api } from '../auth/api';
import { setToken } from '../auth/storage';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (e) => {
  e.preventDefault();
  setErr('');
  if (!email || !password) {
    setErr('Please enter email and password.');
    return;
  }
  try {
    setBusy(true);
    const res = await api.login({ email, password });
    if (res?.token) setToken(res.token);
    const next = res?.redirectPath || '/';
    navigate(next, { replace: true });
  } catch (e) {
    setErr(e.message || 'Invalid credentials. Please try again.');
  } finally {
    setBusy(false);
  }
};

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <header className="auth-header">
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </header>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <div className="input-group">
              <input
                className="input"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-group">
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle"
                onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="row">
            <label className="help">
              <input type="checkbox" style={{ marginRight: 6 }} /> Remember me
            </label>
            <a className="help" href="#">Forgot password?</a>
          </div>

          {err && <div className="form-error">{err}</div>}
          <button className="btn submit" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>New here?</span>
          <Link to="/signup" className="link">Create an account</Link>
        </footer>
      </div>
    </div>
  );
}