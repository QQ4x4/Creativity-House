<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Creates a ready-to-use administrator without going through the public
 * sign-up + OTP flow.
 *
 * Two flags on the new row matter and are easy to miss:
 *
 *  - `email_verified_at` is stamped, because AuthController::login refuses an
 *    unverified account and mails an OTP instead of returning a session.
 *  - `is_active` is true, because User::isAdmin() requires it, so an inactive
 *    admin is still blocked by the `admin` middleware.
 *
 * Promoting an account that already exists is MakeUserAdminCommand's job.
 */
class CreateAdminUserCommand extends Command
{
    protected $signature = 'admin:create
                            {email : Email address for the new administrator}
                            {password? : Password (omit to be prompted without echoing)}
                            {--name= : Full name, e.g. "Super Admin"}
                            {--force : Skip the password strength policy (local use only)}';

    protected $description = 'Create a new user and grant them admin access immediately';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        // Passing a password as an argument leaves it in shell history, so
        // prompt for it when the caller leaves it off.
        $password = (string) ($this->argument('password') ?? '');
        if ($password === '') {
            $password = (string) $this->secret('Password');
        }

        [$firstName, $lastName] = $this->splitName((string) ($this->option('name') ?? ''), $email);

        $validator = Validator::make(
            [
                'email' => $email,
                'password' => $password,
                'first_name' => $firstName,
                'last_name' => $lastName,
            ],
            $this->rules()
        );

        if ($validator->fails()) {
            $this->error('Could not create the administrator:');

            foreach ($validator->errors()->all() as $message) {
                $this->line('  • '.$message);
            }

            if ($validator->errors()->has('email') && User::query()->where('email', $email)->exists()) {
                $this->newLine();
                $this->comment("That account already exists — promote it with:\n  php artisan user:make-admin {$email}");
            }

            return self::FAILURE;
        }

        $user = User::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            // Legacy denormalized column still read in a few places.
            'name' => trim("{$firstName} {$lastName}"),
            'email' => $email,
            // The `hashed` cast on User::casts() hashes this on assignment.
            'password' => $password,
            'is_active' => true,
            'is_admin' => true,
            // Bypasses the OTP gate so the account can sign in right away.
            'email_verified_at' => now(),
        ]);

        $this->newLine();
        $this->info('Administrator account is ready to use.');
        $this->table(
            ['Field', 'Value'],
            [
                ['ID', $user->id],
                ['Name', $user->full_name],
                ['Email', $user->email],
                ['Admin', $user->is_admin ? 'yes' : 'no'],
                ['Email verified', 'yes'],
            ]
        );
        $this->line('Sign in at /en/login, then open /en/admin/courses.');

        if ($this->option('force')) {
            $this->warn('Password strength checks were skipped — do not use this account in production.');
        }

        return self::SUCCESS;
    }

    /**
     * Mirrors RegisterRequest so a CLI-created admin can never be weaker than a
     * self-registered student. `email` is capped at 50 by the column itself.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $password = $this->option('force')
            ? ['required', 'string', 'min:8', 'max:50']
            : [
                'required',
                'string',
                'max:50',
                Password::min(8)->max(50)->mixedCase()->numbers()->symbols(),
            ];

        return [
            'email' => ['required', 'string', 'email:filter', 'max:50', 'unique:users,email'],
            'password' => $password,
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
        ];
    }

    /**
     * `first_name` and `last_name` are both NOT NULL, so a single-word or
     * missing name still has to yield two parts.
     *
     * @return array{string, string}
     */
    private function splitName(string $name, string $email): array
    {
        $name = trim($name);

        if ($name === '') {
            // "ops.lead@example.com" → "Ops.lead"
            $local = (string) str($email)->before('@');
            $name = ucfirst($local !== '' ? $local : 'Admin');
        }

        $parts = preg_split('/\s+/', $name, 2) ?: [];

        return [
            mb_substr($parts[0] ?? 'Admin', 0, 50),
            mb_substr(trim($parts[1] ?? '') !== '' ? $parts[1] : 'Admin', 0, 50),
        ];
    }
}
