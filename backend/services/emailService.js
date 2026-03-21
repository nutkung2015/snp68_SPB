/**
 * Email Service — ใช้ Resend HTTP API
 * 
 * ทำไมไม่ใช้ Nodemailer + Gmail SMTP?
 * → Render (และ Cloud Provider ฟรีส่วนใหญ่) บล็อกพอร์ต SMTP (25, 465, 587) ทั้งหมด
 * → Resend ส่งผ่าน HTTPS (พอร์ต 443) ซึ่งไม่โดนบล็อก
 * 
 * ENV ที่ต้องตั้ง:
 * - RESEND_API_KEY  (ได้จาก https://resend.com → API Keys)
 * - RESEND_FROM     (optional, default: "LivLink <onboarding@resend.dev>")
 *                    ถ้ามี Domain เอง สามารถตั้งเป็น "LivLink <noreply@livlink-solution.com>"
 */

/**
 * ส่ง Email สำหรับรีเซ็ตรหัสผ่าน
 * @param {string} toEmail - อีเมลผู้รับ
 * @param {string} userName - ชื่อผู้รับ
 * @param {string} resetLink - ลิงก์สำหรับรีเซ็ตรหัสผ่าน
 */
exports.sendResetPasswordEmail = async (toEmail, userName, resetLink) => {

    // Dev mode: log แทนส่งจริง ถ้ายังไม่ได้ตั้งค่า API Key
    if (!process.env.RESEND_API_KEY) {
        console.log('========================================');
        console.log('📧 [DEV MODE] Reset Password Email');
        console.log(`   To: ${toEmail}`);
        console.log(`   Name: ${userName}`);
        console.log(`   Link: ${resetLink}`);
        console.log('========================================');
        return { success: true, mode: 'dev', messageId: 'dev-mode' };
    }

    // สร้าง HTML Email Template
    const htmlContent = buildResetEmailHtml(userName, resetLink);

    // ส่งผ่าน Resend HTTP API (HTTPS พอร์ต 443 → ไม่โดนบล็อก)
    const fromAddress = process.env.RESEND_FROM || 'LivLink <onboarding@resend.dev>';

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [toEmail],
                subject: '🔐 รีเซ็ตรหัสผ่าน - LivLink',
                html: htmlContent,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('📧 Resend API Error:', data);
            throw new Error(data.message || `Resend API Error: ${response.status}`);
        }

        console.log(`📧 Reset password email sent to ${toEmail} (Resend ID: ${data.id})`);
        return { success: true, messageId: data.id };

    } catch (error) {
        console.error('📧 Failed to send reset password email:', error);
        throw error;
    }
};

/**
 * สร้าง HTML Template สำหรับอีเมลรีเซ็ตรหัสผ่าน
 */
function buildResetEmailHtml(userName, resetLink) {
    return `
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
                        <td style="background: linear-gradient(135deg, #1a233a 0%, #111827 100%); padding:40px 40px 30px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:28px; font-weight:800; letter-spacing:3px;">
                                LIV<span style="color:#5a8cef;">LINK</span>
                            </h1>
                            <p style="color:rgba(255,255,255,0.7); margin:8px 0 0; font-size:13px;">ระบบบริหารจัดการหมู่บ้านจัดสรรครบวงจร</p>
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
                                           style="display:inline-block; background:linear-gradient(135deg, #4a6694 0%, #354b72 100%); color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:10px; font-size:16px; font-weight:600; letter-spacing:0.5px;">
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
                                <a href="${resetLink}" style="color:#5a8cef; word-break:break-all;">${resetLink}</a>
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
    `;
}
