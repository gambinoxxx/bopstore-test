import nodemailer from 'nodemailer';

/**
 * Sends an email notification.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 * @param {string} html - The HTML body of the email.
 */
export async function sendEmail({ to, subject, text, html }) {
    // --- Add validation for environment variables ---
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("Email credentials (EMAIL_USER, EMAIL_PASS) are not set in your environment variables.");
        throw new Error("Email service is not configured. Please check server logs.");
    }

    const transporter = nodemailer.createTransport({
        // Using the 'service' option is more reliable for well-known providers
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `"${process.env.EMAIL_SENDER_NAME || 'Bopstore'}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        // Re-throw the error so the calling function can handle it
        throw new Error(`Failed to send email. Please check server logs for details.`);
    }
}