'use client';

import { useState, useRef, useEffect } from 'react';
import IndentForm from './IndentForm';
import { Indent } from '@/types';
import { useToast } from '@/components/ui/Toast';

interface ManagedForm {
    id: string;
    initialData?: Indent;
    prefillData?: Partial<Indent>; // For duplication
    status: 'active' | 'saved';
    isEditing?: boolean;
}

export default function IndentManager({ initialIndent }: { initialIndent?: Indent }) {
    const { showToast } = useToast();
    const [forms, setForms] = useState<ManagedForm[]>(() => {
        if (initialIndent) {
            return [{ id: 'edit-1', initialData: initialIndent, status: 'active', isEditing: true }];
        }
        return [{ id: 'new-1', status: 'active' }];
    });

    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when a new form is added
    useEffect(() => {
        if (forms.length > 1) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [forms.length]);

    const handleAction = (formId: string, action: 'ADD_NEW' | 'DUPLICATE' | 'SUBMIT' | 'DELETE', data?: any) => {
        if (action === 'DELETE') {
            setForms(prev => prev.filter(f => f.id !== formId));
            // If last form is deleted, maybe redirect or show message?
            // For now, allow emptying the list (or if last one, maybe add new empty one?)
            // But usually user deletes draft to clear it.
        } else if (action === 'SUBMIT') {
            // Just mark as saved? Or remove?
            // User requested "saved forms" to stay visible.
            setForms(prev => prev.map(f => f.id === formId ? { ...f, status: 'saved' as const } : f));
            showToast('Indent Submitted Successfully', 'success');
        } else if (action === 'ADD_NEW') {
            // Mark current as saved and add new empty one
            setForms(prev => [
                ...prev.map(f => f.id === formId ? { ...f, status: 'saved' as const } : f),
                { id: `new-${Date.now()}`, status: 'active' as const }
            ]);
            showToast('Indent Saved. New form added below.', 'success');
        } else if (action === 'DUPLICATE') {
            // Mark current as saved and add new one with data
            setForms(prev => [
                ...prev.map(f => f.id === formId ? { ...f, status: 'saved' as const } : f),
                { id: `dup-${Date.now()}`, status: 'active' as const, prefillData: data }
            ]);
            showToast('Indent Saved. Duplicated below.', 'success');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '4rem' }}>
            {forms.map((form, index) => (
                <div key={form.id} style={{ opacity: form.status === 'saved' ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                    {form.status === 'saved' && (
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '0.5rem',
                            background: 'var(--bg-success-subtle)',
                            color: 'var(--fg-success)',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600
                        }}>
                            ✓ Indent #{index + 1} Saved
                        </div>
                    )}
                    <div style={{ pointerEvents: form.status === 'saved' ? 'none' : 'auto' }}>
                        <IndentForm
                            initialData={form.initialData}
                            prefillData={form.prefillData}
                            isEditing={form.isEditing}
                            onAction={(action, data) => handleAction(form.id, action, data)}
                        />
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
