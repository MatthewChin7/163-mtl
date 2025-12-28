'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUserAction } from '@/app/actions/users';
import Link from 'next/link';
import { UserRole } from '@/types';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('REQUESTOR');
    const [msg, setMsg] = useState({ type: '', text: '' });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });

        if (!name || !email || !password) {
            setMsg({ type: 'danger', text: 'All fields are required.' });
            return;
        }

        // Call Server Action
        const result = await registerUserAction(name, email, password, role);

        if (result.success) {
            setMsg({ type: 'success', text: 'Registration successful! Please wait for Admin approval before logging in.' });
            setName('');
            setEmail('');
            setPassword('');
            setRole('REQUESTOR');
        } else {
            setMsg({ type: 'danger', text: result.error || 'Registration failed.' });
        }
    };

    return (
        <>
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
                                    <h1 className="fs-4 card-title fw-bold mb-4">Register</h1>
                                    <form onSubmit={handleRegister} className="needs-validation" noValidate autoComplete="off">
                                        <div className="mb-3">
                                            <label className="mb-2 text-muted" htmlFor="name">Name</label>
                                            <input
                                                id="name"
                                                type="text"
                                                className="form-control"
                                                name="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>

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
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="mb-2 text-muted" htmlFor="role">Role</label>
                                            <select
                                                id="role"
                                                className="form-control"
                                                name="role"
                                                value={role}
                                                onChange={(e) => setRole(e.target.value as UserRole)}
                                                required
                                            >
                                                <option value="REQUESTOR">Requestor</option>
                                                <option value="APPROVER_AS3">Initial Approver (MT POC)</option>
                                                <option value="APPROVER_S3">Final Approver (S3, DyCO, CO)</option>
                                                <option value="APPROVER_MTC">Approver (MTC)</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </div>

                                        <div className="mb-3">
                                            <label className="mb-2 text-muted" htmlFor="password">Password</label>
                                            <input
                                                id="password"
                                                type="password"
                                                className="form-control"
                                                name="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>

                                        {msg.text && (
                                            <div className={`alert alert-${msg.type} mb-3`} role="alert">
                                                {msg.text}
                                            </div>
                                        )}

                                        <p className="form-text text-muted mb-3">
                                            By registering you agree with our terms and condition.
                                        </p>

                                        <div className="align-items-center d-flex">
                                            <button type="submit" className="btn btn-primary ms-auto">
                                                Register
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                <div className="card-footer py-3 border-0">
                                    <div className="text-center">
                                        Already have an account? <Link href="/" className="text-dark">Login</Link>
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
