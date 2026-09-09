<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inquiry Reply</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#5b2751,#8a3f73);padding:28px 24px;color:#ffffff;">
                            <h1 style="margin:0;font-size:22px;font-weight:700;">Creativity House</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Reply to your inquiry</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 16px;font-size:16px;">Hi {{ $fullName }},</p>
                            <div style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;white-space:pre-wrap;">{{ $replyBody }}</div>
                            @if (!empty($originalMessage))
                                <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
                                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#94a3b8;">Your original message</p>
                                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;white-space:pre-wrap;">{{ $originalMessage }}</p>
                                </div>
                            @endif
                            <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#64748b;">
                                Warm regards,<br>
                                The Creativity House Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
