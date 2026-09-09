<?php

namespace App\Mail;

use App\Models\Inquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInquiryAlertMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Inquiry $inquiry,
    ) {}

    public function envelope(): Envelope
    {
        $kind = $this->inquiry->type === Inquiry::TYPE_ORGANIZATION
            ? 'Organization'
            : 'Student';

        return new Envelope(
            subject: "New {$kind} inquiry — {$this->inquiry->full_name}",
        );
    }

    public function content(): Content
    {
        $typeLabel = $this->inquiry->type === Inquiry::TYPE_ORGANIZATION
            ? 'Organization'
            : 'Student';

        $preview = mb_strlen($this->inquiry->message) > 280
            ? mb_substr($this->inquiry->message, 0, 280).'…'
            : $this->inquiry->message;

        return new Content(
            html: 'emails.admin-inquiry-alert',
            with: [
                'typeLabel' => $typeLabel,
                'fullName' => $this->inquiry->full_name,
                'companyName' => $this->inquiry->company_name,
                'email' => $this->inquiry->email,
                'phoneNumber' => $this->inquiry->phone_number,
                'targetCourse' => $this->inquiry->target_course,
                'messagePreview' => $preview,
                'inquiryId' => $this->inquiry->id,
            ],
        );
    }
}
