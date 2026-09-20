<?php

namespace App\Mail;

use App\Models\User;
use App\Services\AccountClaimOtpService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountClaimOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
        public string $courseTitle = '',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Activate your Creativity House account',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.account-claim-otp',
            with: [
                'firstName' => $this->user->first_name ?: 'there',
                'code' => $this->code,
                'courseTitle' => $this->courseTitle,
                'expiresInMinutes' => AccountClaimOtpService::EXPIRY_MINUTES,
            ],
        );
    }
}
