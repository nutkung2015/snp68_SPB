const nodemailer = require('nodemailer');

const dns = require('dns');

// สร้าง transporter (Gmail SMTP)
const createTransporter = () => {
    // บังคับให้ใช้ IPv4 เท่านั้น (แก้ปัญหาเชื่อมต่อ IPv6 ENETUNREACH ล้มเหลว)
    dns.setDefaultResultOrder('ipv4first');

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT == 465, // ใช้ SSL ถ้าเป็นพอร์ต 465 (ถ้า 587 จะเป็น STARTTLS และ secure: false)
        family: 4,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * ส่ง Email สำหรับรีเซ็ตรหัสผ่าน
 * @param {string} toEmail - อีเมลผู้รับ
 * @param {string} userName - ชื่อผู้รับ
 * @param {string} resetLink - ลิงก์สำหรับรีเซ็ตรหัสผ่าน
 */
exports.sendResetPasswordEmail = async (toEmail, userName, resetLink) => {
    // Dev mode: log แทนส่งจริง ถ้ายังไม่ได้ตั้งค่า SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('========================================');
        console.log('📧 [DEV MODE] Reset Password Email');
        console.log(`   To: ${toEmail}`);
        console.log(`   Name: ${userName}`);
        console.log(`   Link: ${resetLink}`);
        console.log('========================================');
        return { success: true, mode: 'dev', messageId: 'dev-mode' };
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: `"LivLink Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: '🔐 รีเซ็ตรหัสผ่าน - LivLink',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:40px 40px 30px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:700;">🔐 LivLink</h1>
                            <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">ระบบจัดการหมู่บ้าน</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 16px; color:#333; font-size:22px;">รีเซ็ตรหัสผ่าน</h2>
                            <p style="color:#555; font-size:15px; line-height:1.6; margin:0 0 8px;">
                                สวัสดีคุณ <strong>${userName}</strong>,
                            </p>
                            <p style="color:#555; font-size:15px; line-height:1.6; margin:0 0 24px;">
                                ผู้ดูแลระบบได้ร้องขอให้รีเซ็ตรหัสผ่านของคุณ กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding:8px 0 32px;">
                                        <a href="${resetLink}" 
                                           style="display:inline-block; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:8px; font-size:16px; font-weight:600; letter-spacing:0.5px;">
                                            ตั้งรหัสผ่านใหม่
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Warning -->
                            <div style="background-color:#fff8e1; border-left:4px solid #ffc107; padding:14px 16px; border-radius:0 8px 8px 0; margin-bottom:24px;">
                                <p style="color:#856404; font-size:13px; margin:0; line-height:1.5;">
                                    ⏱️ ลิงก์นี้จะหมดอายุภายใน <strong>15 นาที</strong><br>
                                    หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้
                                </p>
                            </div>

                            <!-- Fallback Link -->
                            <p style="color:#999; font-size:12px; line-height:1.5; margin:0;">
                                หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์:<br>
                                <a href="${resetLink}" style="color:#667eea; word-break:break-all;">${resetLink}</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa; padding:24px 40px; text-align:center; border-top:1px solid #eee;">
                            <p style="color:#aaa; font-size:12px; margin:0;">
                                © ${new Date().getFullYear()} LivLink — ระบบจัดการหมู่บ้านอัจฉริยะ
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Reset password email sent to ${toEmail} (messageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('📧 Failed to send reset password email:', error);
        throw error;
    }
};
