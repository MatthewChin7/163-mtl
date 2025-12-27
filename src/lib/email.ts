import { Resend } from 'resend';

// Initialize Resend with the API key
// Use a placeholder if missing to prevent build crash (Vercel build env)
const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

const EMAIL_FROM = 'MTC Platform <onboarding@resend.dev>'; // Resend's testing domain
const ADMIN_EMAIL = 'admin@163.mil'; // Change this to real admin email if we have one, or just hardcode for demo

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!process.env.RESEND_API_KEY) {
        console.log('RESEND_API_KEY missing, skipping email:', { to, subject });
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [to], // In Resend free tier, you can only send to verified email (likely just yours for now)
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('Email sending failed:', error);
        } else {
            console.log('Email sent successfully:', data);
        }
    } catch (err) {
        console.error('Email sending error:', err);
    }
}
