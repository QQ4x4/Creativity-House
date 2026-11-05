<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Jobs\SyncGhlPaymentSucceeded;
use App\Jobs\SyncGhlRegistration;
use App\Models\Order;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GhlSyncCommand extends Command
{
    protected $signature = 'ghl:sync
        {--users : Sync existing users as contacts}
        {--orders : Sync paid orders as Won opportunities}
        {--since= : Only rows created on/after YYYY-MM-DD}
        {--dry-run : Print what would be sent (masked); send nothing}
        {--limit=0 : Max rows per entity type (0 = no limit)}
        {--force : Re-sync rows that already have ghl_contact_id}';

    protected $description = 'Backfill users / paid orders into GoHighLevel (chunked + rate-limited)';

    public function handle(): int
    {
        $doUsers = (bool) $this->option('users');
        $doOrders = (bool) $this->option('orders');

        if (! $doUsers && ! $doOrders) {
            $this->error('Pass --users and/or --orders.');

            return self::FAILURE;
        }

        $since = $this->option('since')
            ? Carbon::parse((string) $this->option('since'))->startOfDay()
            : null;
        $limit = max(0, (int) $this->option('limit'));
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        if ($doUsers) {
            $this->syncUsers($since, $limit, $dryRun, $force);
        }
        if ($doOrders) {
            $this->syncOrders($since, $limit, $dryRun, $force);
        }

        return self::SUCCESS;
    }

    private function syncUsers(?Carbon $since, int $limit, bool $dryRun, bool $force): void
    {
        $query = User::query()->orderBy('id');
        if ($since) {
            $query->where('created_at', '>=', $since);
        }
        if (! $force) {
            $query->whereNull('ghl_contact_id');
        }
        if ($limit > 0) {
            $query->limit($limit);
        }

        $count = 0;
        $windowStart = microtime(true);
        $windowCount = 0;

        $query->chunkById(100, function ($users) use (&$count, &$windowStart, &$windowCount, $dryRun, $force): void {
            foreach ($users as $user) {
                $this->rateLimit($windowStart, $windowCount);
                $count++;
                $masked = $this->maskEmail((string) $user->email);

                if ($dryRun) {
                    $this->line("[dry-run] user #{$user->id} email={$masked} tags=website-signup");

                    continue;
                }

                SyncGhlRegistration::dispatchSync([
                    'user_id' => $user->id,
                    'lang' => 'en',
                    'force' => $force,
                ]);
                $this->line("Synced user #{$user->id} ({$masked})");
            }
        });

        $this->info("Users processed: {$count}".($dryRun ? ' (dry-run)' : ''));
    }

    private function syncOrders(?Carbon $since, int $limit, bool $dryRun, bool $force): void
    {
        $query = Order::query()
            ->where('payment_status', PaymentStatus::Paid->value)
            ->orderBy('id');
        if ($since) {
            $query->where('created_at', '>=', $since);
        }
        if (! $force) {
            $query->whereNull('ghl_opportunity_id');
        }
        if ($limit > 0) {
            $query->limit($limit);
        }

        $count = 0;
        $windowStart = microtime(true);
        $windowCount = 0;

        $query->chunkById(100, function ($orders) use (&$count, &$windowStart, &$windowCount, $dryRun, $force): void {
            foreach ($orders as $order) {
                $this->rateLimit($windowStart, $windowCount);
                $count++;
                $email = $this->maskEmail((string) ($order->billing_email ?? ''));

                if ($dryRun) {
                    $this->line("[dry-run] order #{$order->id} email={$email} amount={$order->amount} → Won");

                    continue;
                }

                SyncGhlPaymentSucceeded::dispatchSync([
                    'order_id' => $order->id,
                    'lang' => 'en',
                    'force' => $force,
                ]);
                $this->line("Synced order #{$order->id} ({$email})");
            }
        });

        $this->info("Orders processed: {$count}".($dryRun ? ' (dry-run)' : ''));
    }

    private function rateLimit(float &$windowStart, int &$windowCount): void
    {
        $windowCount++;
        if ($windowCount < 80) {
            return;
        }

        $elapsed = microtime(true) - $windowStart;
        if ($elapsed < 10) {
            usleep((int) ((10 - $elapsed) * 1_000_000));
        }
        $windowStart = microtime(true);
        $windowCount = 0;
    }

    private function maskEmail(string $email): string
    {
        if ($email === '' || ! str_contains($email, '@')) {
            return '(none)';
        }
        [$local, $domain] = explode('@', $email, 2);

        return substr($local, 0, 1).'***@'.$domain;
    }
}
