// utils/sendMailTo.js
import nodemailer from 'nodemailer';

export default function sendMailTo(email, pin, CData, password, esgData) {
    return new Promise((resolve, reject) => {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.MAIL_HOST,
                port: process.env.MAIL_PORT,
                secure: false,
                requireTLS: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
                tls: {
                    ciphers: 'SSLv3'
                }
            });

            let mailOptions;
            
            if (esgData && email) {
                mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'ESG Score Registration Request',
                    html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto;">
                        <h2 style="color: #0066cc; text-align: center;">ESG Score Registration Request</h2>
                        <p>Dear ${esgData.vendorName} Team,</p>
                        <p>We are reaching out regarding your product <strong>"${esgData.productName}"</strong> for ESG score registration.</p>
                        
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #0066cc; margin-top: 0;">Required ESG Information:</h3>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Environmental Score (0-100)</li>
                                <li>Social Score (0-100)</li>
                                <li>Governance Score (0-100)</li>
                                <li>Supporting documentation</li>
                            </ul>
                        </div>

                        <p>Please reply with your ESG scores and we'll process your registration within 2-3 business days.</p>
                        <p style="text-align: center; margin-top: 30px;">Best regards,<br/><strong>Sustainability Team</strong></p>
                    </div>
                    `,
                };
            }
            // ... rest of your existing email templates
            
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return reject(error);
                }
                resolve(info);
            });
        } catch (err) {
            reject(err);
        }
    });
}
