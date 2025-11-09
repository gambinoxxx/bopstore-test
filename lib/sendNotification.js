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
        // Using the 'service' option is more reliable for well-known providers like Gmail
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // --- Verify connection configuration before sending ---
    try {
        await transporter.verify();
        console.log("Email server is ready to take our messages");
    } catch (error) {
        console.error("Error with email transporter configuration:", error);
        // Provide a more specific error for debugging authentication issues.
        if (error.code === 'EAUTH') {
            console.error("Authentication failed. Please check your EMAIL_USER and EMAIL_PASS (use a Gmail App Password).");
        }
        throw new Error("Failed to connect to email server. Please check credentials and configuration.");
    }

    try {
        await transporter.sendMail({
            from: `"${process.env.EMAIL_SENDER_NAME || 'Bopstore'}" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        // Re-throw the error so the calling function knows the email failed.
        throw new Error(`Failed to send email. Please check server logs for details.`);
    }
}