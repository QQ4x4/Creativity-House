<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Inquiry Alert</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                        <td style="background:linear-gradient(135deg,#5b2751,#8a3f73);padding:28px 24px;color:#ffffff;">
                            <h1 style="margin:0;font-size:22px;font-weight:700;">Creativity House</h1>
                            <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">New inquiry received</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 24px;">
                            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
                                A new <strong>{{ $typeLabel }}</strong> inquiry was submitted on the website.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;width:140px;">Type</td>
                                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{{ $typeLabel }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Full name</td>
                                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{{ $fullName }}</td>
                                </tr>
                                @if (!empty($companyName))
                                    <tr>
                                        <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Company</td>
                                        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{{ $companyName }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Email</td>
                                    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">
                                        <a href="mailto:{{ $email }}" style="color:#5b2751;text-decoration:none;">{{ $email }}</a>
                                    </td>
                                </tr>
                                @if (!empty($phoneNumber))
                                    <tr>
                                        <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Phone</td>
                                        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;direction:ltr;">{{ $phoneNumber }}</td>
                                    </tr>
                                @endif
                                @if (!empty($targetCourse))
                                    <tr>
                                        <td style="padding:12px 16px;background:#faf5f9;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">Course</td>
                                        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{{ $targetCourse }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:12px 16px;background:#faf5f9;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;vertical-align:top;">Message</td>
                                    <td style="padding:12px 16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">{{ $messagePreview }}</td>
                                </tr>
                            </table>

                            <p style="margin:0;font-size:12px;color:#94a3b8;">
                                Inquiry #{{ $inquiryId }} — open Admin → Messages to reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
