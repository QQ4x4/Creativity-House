<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * `users.is_admin` has no UI, so this is the only supported way to grant or
 * revoke access to /api/v1/admin/* and the Filament panel.
 */
class MakeUserAdminCommand extends Command
{
    protected $signature = 'user:make-admin
                            {email : Email address of the user}
                            {--revoke : Remove admin access instead of granting it}';

    protected $description = 'Grant or revoke admin access for a user';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $revoke = (bool) $this->option('revoke');

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error("No user found with email {$email}.");

            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => ! $revoke])->save();

        $this->info(sprintf(
            '%s is %s an administrator.',
            $user->email,
            $revoke ? 'no longer' : 'now'
        ));

        if (! $revoke && ! $user->is_active) {
            $this->warn('Heads up: this account is inactive, so admin access stays blocked until it is activated.');
        }

        return self::SUCCESS;
    }
}
