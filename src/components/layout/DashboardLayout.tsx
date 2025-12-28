'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { User } from '@/types';
import { LogOut, PieChart, PlusCircle, FileText, Settings, Menu, Calendar, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    const handleLogout = () => {
        signOut({ callbackUrl: '/' });
    };

    if (status === 'loading') return <div className="p-8">Loading session...</div>;
    if (!session || !session.user) return null;

    const user = session.user as User; // Cast to our User type (ensure session callback provided role)

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: PieChart },
        { label: 'New Indent', href: '/dashboard/new-indent', icon: PlusCircle, role: 'REQUESTOR' },
        { label: 'All Indents', href: '/dashboard/indents', icon: FileText },
        { label: 'Daily MT Schedule', href: '/dashboard/schedule', icon: Calendar },
        { label: 'Monthly Bulk Indents', href: '/dashboard/bulk-indents', icon: FileText, role: 'APPROVER_AS3' }, // Visible to AS3/S3/MTC via logic below
        { label: 'In Camp TO Sched', href: '/dashboard/mtc-schedule', icon: UserIcon, role: 'APPROVER_MTC' },
        { label: 'System Config', href: '/dashboard/admin/config', icon: Settings, role: 'ADMIN' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'var(--bg-panel)',
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                position: 'fixed',
                height: '100vh',
                zIndex: 10
            }}>
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--fg-primary)' }}>163MTL</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>Transport Management</div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {navItems.map((item) => {
                        // Custom logic for Monthly Bulk: Visible to AS3, S3, MTC
                        if (item.label === 'Monthly Bulk Indents') {
                            if (!['APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC'].includes(user.role)) return null;
                        }
                        else if (item.role && user.role !== item.role && user.role !== 'ADMIN') return null; // Simple RBAC for others

                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    color: isActive ? 'white' : 'var(--fg-secondary)',
                                    background: isActive ? 'var(--accent-primary)' : 'transparent',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                                {user.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--fg-secondary)' }}>
                                    {user.role === 'ADMIN' ? 'Admin' :
                                        user.role === 'APPROVER_AS3' ? 'Initial Approver' :
                                            user.role === 'APPROVER_S3' ? 'Final Approver' :
                                                user.role.replace('APPROVER_', '')}
                                </div>
                            </div>
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--fg-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                marginLeft: '260px',
                padding: '2rem',
                maxWidth: '1600px' // cap max width for large screens
            }}>
                {children}
            </main>
        </div>
    );
}
