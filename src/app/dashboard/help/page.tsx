'use client';

import { useState } from 'react';
import {
    BookOpen, Shield, HelpCircle, ChevronDown, ChevronRight, CheckCircle, Clock, Truck
} from 'lucide-react';

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('guides');
    const [openFaq, setOpenFaq] = useState<string | null>(null);

    const toggleFaq = (id: string) => {
        setOpenFaq(openFaq === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight mb-3">Help Center</h1>
                <p className="text-secondary text-lg max-w-2xl mx-auto">
                    Guides, workflows, and FAQs to help you manage transport indent requests efficiently.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
                <div className="glass-panel p-1 inline-flex rounded-xl">
                    <button
                        onClick={() => setActiveTab('guides')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'guides' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
                    >
                        User Guides
                    </button>
                    <button
                        onClick={() => setActiveTab('workflow')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'workflow' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
                    >
                        Workflow
                    </button>
                    <button
                        onClick={() => setActiveTab('faq')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'faq' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:text-primary'}`}
                    >
                        FAQs
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'guides' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel p-6">
                        <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-blue-500 mb-4">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">For Requestors</h3>
                        <ul className="space-y-3 text-secondary text-sm">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-blue-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">New Indent:</strong> Click "New Indent", fill in purpose, vehicle, and route. Save as Draft if you aren't ready.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-blue-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Status:</strong> "Pending AS3" means it's waiting for initial approval. You can't edit it once submitted unless an approver sends it back.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-blue-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Urgent:</strong> Requests &lt; 2 days away are flagged as urgent automatically.</div>
                            </li>
                        </ul>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="bg-green-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-green-500 mb-4">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">For Approvers (AS3/S3)</h3>
                        <ul className="space-y-3 text-secondary text-sm">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-green-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Review:</strong> Check "Pending" tabs. You can Approve, Reject, or Edit.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-green-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Editing:</strong> If you edit an indent, it returns to the Requestor for confirmation before proceeding.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-green-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Bulk:</strong> Use "Monthly Bulk Indents" to approve multiple routine trips at once.</div>
                            </li>
                        </ul>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="bg-orange-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-orange-500 mb-4">
                            <Truck size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">For MTC</h3>
                        <ul className="space-y-3 text-secondary text-sm">
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-orange-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Assignments:</strong> Use "In Camp TO Sched" to assign drivers for daily tasks.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1 bg-orange-500 w-1.5 h-1.5 rounded-full"></span>
                                <div><strong className="text-primary">Final Gate:</strong> You are the final approval step. Ensure resources are available before approving.</div>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'workflow' && (
                <div className="glass-panel p-10 flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-8">Indent Lifecycle</h3>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center text-blue-700 font-bold shadow-lg">
                                YOU
                            </div>
                            <span className="text-sm font-semibold">Draft / Submit</span>
                        </div>

                        <div className="h-8 w-0.5 md:w-16 md:h-0.5 bg-border"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-white border-2 border-yellow-500 flex items-center justify-center text-yellow-700 font-bold shadow-sm">
                                AS3
                            </div>
                            <span className="text-sm font-medium text-secondary">Initial Approval</span>
                        </div>

                        <div className="h-8 w-0.5 md:w-16 md:h-0.5 bg-border"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center text-orange-700 font-bold shadow-sm">
                                S3
                            </div>
                            <span className="text-sm font-medium text-secondary">Final Approval</span>
                        </div>

                        <div className="h-8 w-0.5 md:w-16 md:h-0.5 bg-border"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-white border-2 border-red-500 flex items-center justify-center text-red-700 font-bold shadow-sm">
                                MTC
                            </div>
                            <span className="text-sm font-medium text-secondary">Resource Check</span>
                        </div>

                        <div className="h-8 w-0.5 md:w-16 md:h-0.5 bg-border"></div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center text-green-700 font-bold shadow-lg">
                                <CheckCircle size={28} />
                            </div>
                            <span className="text-sm font-bold text-green-600">Approved</span>
                        </div>
                    </div>

                    <div className="mt-10 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-700 max-w-2xl text-center">
                        <strong>Note:</strong> If an approver edits your indent, it will come back to you as <span className="font-mono bg-yellow-200 px-1 rounded">PENDING_REQUESTOR</span>. You must accept the changes for it to proceed.
                    </div>
                </div>
            )}

            {activeTab === 'faq' && (
                <div className="glass-panel p-6 space-y-4">
                    {[
                        {
                            id: 'q1',
                            q: 'Why can\'t I edit my indent?',
                            a: 'Once an indent is submitted, it is locked for approval. To change it, you must cancel and create a new one, or ask the current approver to Reject it so you can edit.'
                        },
                        {
                            id: 'q2',
                            q: 'How do I cancel a trip?',
                            a: 'Go to "All Indents", find your trip, and click "Cancel". If it was already approved, the cancellation request must be approved by MTC.'
                        },
                        {
                            id: 'q3',
                            q: 'What happens if I miss the 2-day notice?',
                            a: 'The system will flag your indent as "Urgent". You should inform your AS3 personally to ensure it gets expedited.'
                        },
                        {
                            id: 'q4',
                            q: 'Can I duplicate a past indent?',
                            a: 'Yes! View any past indent and click the "Duplicate" button in the top right corner to pre-fill a new form.'
                        }
                    ].map((item) => (
                        <div key={item.id} className="border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleFaq(item.id)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface transition-colors"
                            >
                                <span className="font-semibold text-primary">{item.q}</span>
                                {openFaq === item.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {openFaq === item.id && (
                                <div className="p-4 pt-0 text-secondary text-sm border-t border-border bg-surface/50">
                                    <div className="mt-4">{item.a}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
