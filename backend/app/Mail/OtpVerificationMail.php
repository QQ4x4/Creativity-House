<?php

namespace App\Mail;

use App\Models\User;
use App\Services\OtpService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Creativity House verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.otp-verification',
            with: [
                'firstName' => $this->user->first_name,
                'code' => $this->code,
                'expiresInMinutes' => OtpService::EXPIRY_MINUTES,
            ],
        );
    }
}
