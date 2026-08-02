<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#5b2751,#8a3f73);padding:28px 24px;color:#ffffff;">
                            <h1 style="margin:0;font-size:22px;font-weight:700;">Creativity House</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Password reset</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Hi {{ $firstName }},</p>
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                                Use this code to reset your password. It expires in
                                <strong>{{ $expiresInMinutes }} minutes</strong>.
                            </p>
                            <p style="margin:0 0 24px;text-align:center;">
                                <span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:700;color:#5b2751;background:#faf5f9;border:1px solid #e0bfd8;border-radius:12px;padding:14px 22px;">
                                    {{ $code }}
                                </span>
                            </p>
                            <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                                If you did not request a password reset, you can ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
