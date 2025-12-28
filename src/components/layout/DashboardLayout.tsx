'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { User } from '@/types';
import { LogOut, PieChart, PlusCircle, FileText, Settings, Menu, Calendar, User as UserIcon, Users } from 'lucide-react';
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
        {
            label: 'All Indents',
            href: '/dashboard/indents',
            icon: FileText,
            subItems: [
                { label: 'Drafts', href: '/dashboard/indents?status=DRAFT' },
                { label: 'Pending', href: '/dashboard/indents?status=PENDING' },
                { label: 'Approved', href: '/dashboard/indents?status=APPROVED' },
                { label: 'History', href: '/dashboard/indents?status=CANCELLED' },
            ]
        },
        { label: 'Daily MT Schedule', href: '/dashboard/schedule', icon: Calendar },
        { label: 'Monthly Bulk Indents', href: '/dashboard/bulk-indents', icon: FileText, role: 'APPROVER_AS3' },
        { label: 'In Camp TO Sched', href: '/dashboard/mtc-schedule', icon: UserIcon, role: 'APPROVER_MTC' },
        { label: 'User Management', href: '/dashboard/admin', icon: Users, role: 'ADMIN' },
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

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                    {navItems.map((item) => {
                        // Custom logic for Monthly Bulk: Visible to AS3, S3, MTC
                        if (item.label === 'Monthly Bulk Indents') {
                            if (!['APPROVER_AS3', 'APPROVER_S3', 'APPROVER_MTC'].includes(user.role)) return null;
                        }
                        else if (item.role && user.role !== item.role && user.role !== 'ADMIN') return null;

                        const isActive = pathname === item.href && !item.subItems; // Only active if exact match or simple item
                        const Icon = item.icon;
                        const hasActiveChild = item.subItems?.some(sub => pathname === sub.href.split('?')[0] && window.location.search === sub.href.split('?')[1]);

                        return (
                            <div key={item.href}>
                                <Link
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
                                {item.subItems && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                        {item.subItems.map(sub => {
                                            // Simple check for query param match if needed, but pathname check is cleaner.
                                            // Since usePathname doesn't include query, we need to be careful.
                                            // Actually, client side isActive check for query params is tricky without useSearchParams.
                                            // For now, let's just make them links.
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    style={{
                                                        padding: '0.5rem 0.75rem 0.5rem 3rem',
                                                        fontSize: '0.875rem',
                                                        color: 'var(--fg-secondary)',
                                                        textDecoration: 'none',
                                                        display: 'block',
                                                        opacity: 0.8
                                                    }}
                                                    className="hover:opacity-100"
                                                >
                                                    {sub.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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
