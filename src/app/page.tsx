'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Attempt login via NextAuth
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    });

    if (result?.error) {
      // Debugging help: Show exact error
      alert('Login Error: ' + result.error);
      setError('Login failed: ' + result.error);
      setLoading(false);
    } else {
      // Success
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <>
      {/* Bootstrap CDN specifically for this page styling as requested */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css" rel="stylesheet" crossOrigin="anonymous" />

      <section className="h-100">
        <div className="container h-100">
          <div className="row justify-content-sm-center h-100">
            <div className="col-xxl-4 col-xl-5 col-lg-5 col-md-7 col-sm-9">
              <div className="text-center my-5">
                <img src="/file.svg" alt="logo" width="100" style={{ filter: 'invert(1)' }} />
              </div>
              <div className="card shadow-lg">
                <div className="card-body p-5">
                  <h1 className="fs-4 card-title fw-bold mb-4">Login</h1>
                  <form onSubmit={handleLogin} className="needs-validation" noValidate autoComplete="off">
                    <div className="mb-3">
                      <label className="mb-2 text-muted" htmlFor="email">E-Mail Address</label>
                      <input
                        id="email"
                        type="email"
                        className="form-control"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                      <div className="invalid-feedback">
                        Email is invalid
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="form-group mb-6">
                        <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Password</label>
                        <input
                          type="password"
                          className="input w-full"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <div className="flex justify-end mt-1">
                          <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            Forgot Password?
                          </Link>
                        </div>
                      </div>
                      {error && (
                        <div className="text-danger mt-2" style={{ fontSize: '0.875rem' }}>
                          {error}
                        </div>
                      )}
                    </div>

                    <div className="d-flex align-items-center">
                      <div className="form-check">
                        <input type="checkbox" name="remember" id="remember" className="form-check-input" />
                        <label htmlFor="remember" className="form-check-label">Remember Me</label>
                      </div>
                      <button type="submit" className="btn btn-primary ms-auto" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                      </button>
                    </div>
                  </form>
                </div>
                <div className="card-footer py-3 border-0">
                  <div className="text-center">
                    Don't have an account? <Link href="/register" className="text-dark">Create One</Link>
                  </div>
                </div>
              </div>
              <div className="text-center mt-5 text-muted">
                Copyright &copy; 2025 &mdash; 163 SQN
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
