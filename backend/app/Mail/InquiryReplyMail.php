<?php

namespace App\Mail;

use App\Models\Inquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InquiryReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Inquiry $inquiry,
        public string $replyBody,
        public ?string $replySubject = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->replySubject
            ?: 'Re: Your inquiry to Creativity House';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.inquiry-reply',
            with: [
                'fullName' => $this->inquiry->full_name,
                'replyBody' => $this->replyBody,
                'originalMessage' => $this->inquiry->message,
            ],
        );
    }
}
