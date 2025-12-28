'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsData } from '@/app/actions/analytics';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Loader2, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const res = await getAnalyticsData();
            setData(res);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[500px]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    const { metrics, charts } = data;

    const MetricCard = ({ title, value, sub, icon: Icon, color }: any) => (
        <div className="glass-panel p-6 flex items-start justify-between">
            <div>
                <p className="text-secondary text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-primary">{value}</h3>
                {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
            </div>
            <div className={`p-3 rounded-full bg-opacity-10`} style={{ backgroundColor: `${color}20`, color: color }}>
                <Icon size={24} />
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Analytics Overview</h1>
                <p className="text-secondary">Insights into transport operations and performance.</p>
            </div>

            {/* Core Metrics HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Indents (Month)"
                    value={metrics.totalIndents}
                    sub="Active requests"
                    icon={TrendingUp}
                    color="#0088FE"
                />
                <MetricCard
                    title="Utilization Rate"
                    value={`${metrics.utilizationRate}%`}
                    sub="Days with active movements"
                    icon={Calendar}
                    color="#00C49F"
                />
                <MetricCard
                    title="Cancellation Rate"
                    value={metrics.totalIndents ? `${Math.round((metrics.totalCancelled / (metrics.totalIndents + metrics.totalCancelled)) * 100)}%` : '0%'}
                    sub={`${metrics.totalCancelled} cancelled`}
                    icon={AlertCircle}
                    color="#FF8042"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Purpose Breakdown */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold mb-6">Transport Purpose</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={charts.purposeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {charts.purposeData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Time Analysis */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-semibold mb-6">Indent Lead Time</h3>
                    <p className="text-sm text-secondary mb-4">Time between creation and start date</p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.leadTimeData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="requests" name="Total Requests" fill="#0088FE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cancellation Timing */}
                <div className="glass-panel p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-6">Last-Minute Cancellations</h3>
                    <p className="text-sm text-secondary mb-4">When are trips being cancelled relative to start time?</p>
                    <div className="h-[300px] w-full">
                        {charts.cancellationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.cancellationData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" name="Cancellations" fill="#FF8042" radius={[0, 4, 4, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-secondary">
                                No cancellation data available
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
