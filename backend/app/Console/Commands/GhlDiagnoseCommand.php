<?php

namespace App\Console\Commands;

use App\Services\GoHighLevel\GoHighLevelClient;
use Illuminate\Console\Command;
use Throwable;

class GhlDiagnoseCommand extends Command
{
    protected $signature = 'ghl:diagnose
        {--test-contact= : Upsert a test contact with this email (tagged api-test)}
        {--list-fields : Print every custom field returned by GHL (name | fieldKey | id | endpoint)}';

    protected $description = 'Diagnose GoHighLevel Private Integration setup (prints no secrets)';

    private int $failures = 0;

    public function handle(GoHighLevelClient $client): int
    {
        // Always bust the 1-hour custom-field cache so diagnose reflects live GHL data.
        $client->clearCustomFieldsCache();

        $this->section('1. Environment');
        $this->checkEnv('GHL_ENABLED', (string) config('services.gohighlevel.enabled') ? 'true' : 'false', false);
        $this->checkEnv('GHL_PRIVATE_TOKEN', $this->maskSecret((string) config('services.gohighlevel.private_token')), true);
        $this->checkEnv('GHL_LOCATION_ID', (string) config('services.gohighlevel.location_id'), true);
        $this->checkEnv('GHL_API_BASE', (string) config('services.gohighlevel.api_base'), false);
        $this->checkEnv('GHL_API_VERSION', (string) config('services.gohighlevel.api_version'), false);
        $this->checkEnv('GHL_PIPELINE_ID', (string) config('services.gohighlevel.pipeline_id'), false);
        $this->checkEnv('GHL_STAGE_LEAD_ID', (string) config('services.gohighlevel.stages.lead'), false);
        $this->checkEnv('GHL_STAGE_INQUIRY_ID', (string) config('services.gohighlevel.stages.inquiry'), false);
        $this->checkEnv('GHL_STAGE_CHECKOUT_ID', (string) config('services.gohighlevel.stages.checkout'), false);
        $this->checkEnv('GHL_STAGE_WON_ID', (string) config('services.gohighlevel.stages.won'), false);
        $this->checkEnv('GHL_WEBHOOK_SECRET', $this->maskSecret((string) config('services.gohighlevel.webhook_secret')), false);
        $this->checkEnv(
            'GHL_INBOUND_ENROLL_ENABLED',
            config('services.gohighlevel.inbound_enroll_enabled') ? 'true' : 'false',
            false
        );

        if (! $client->isEnabled()) {
            $this->bad('Client is disabled (set GHL_ENABLED=true and provide token + location).');

            return $this->finish();
        }

        $this->section('2. Location (token + scope check)');
        try {
            $location = $client->getLocation();
            if ($location === null || ! $location->successful()) {
                $this->bad('GET /locations/{id} failed'.($location ? ' (HTTP '.$location->status().')' : ''));
            } else {
                $name = $location->json('location.name') ?? $location->json('name') ?? 'ok';
                $this->ok('Location reachable: '.$name);
            }
        } catch (Throwable $e) {
            $this->bad('Location request error: '.$e->getMessage());
        }

        $this->section('3. Custom fields (Website folder keys)');
        $ids = $client->getCustomFieldIds();
        foreach (GoHighLevelClient::CUSTOM_FIELD_KEYS as $key) {
            if (isset($ids[$key])) {
                $this->ok($key.' → '.$ids[$key]);
            } else {
                $this->bad($key.' → MISSING');
            }
        }

        $this->newLine();
        $this->line('Contact Us + For Organizations workflow keys:');
        foreach (GoHighLevelClient::WORKFLOW_CUSTOM_FIELD_KEYS as $key) {
            if (isset($ids[$key])) {
                $this->ok($key.' → '.$ids[$key]);
            } else {
                $this->bad($key.' → MISSING');
            }
        }

        if ($this->option('list-fields')) {
            $this->section('3b. All custom fields from GHL');
            $listed = $client->listCustomFields();
            if ($listed === []) {
                $this->line('(no custom fields returned from either endpoint)');
            } else {
                $this->table(
                    ['name', 'fieldKey', 'id', 'endpoint'],
                    array_map(
                        static fn (array $row): array => [
                            $row['name'],
                            $row['fieldKey'],
                            $row['id'],
                            $row['endpoint'],
                        ],
                        $listed
                    )
                );
                $this->line('Total: '.count($listed));
            }
        }

        $this->section('4. Pipelines & stages');
        $pipelines = $client->getPipelines();
        if ($pipelines === []) {
            $this->bad('No pipelines returned (check opportunities scope).');
        } else {
            foreach ($pipelines as $pipeline) {
                if (! is_array($pipeline)) {
                    continue;
                }
                $pid = (string) ($pipeline['id'] ?? '');
                $pname = (string) ($pipeline['name'] ?? 'unnamed');
                $this->line("Pipeline: {$pname}  id={$pid}");
                $stages = $pipeline['stages'] ?? $pipeline['pipelineStages'] ?? [];
                if (is_array($stages)) {
                    foreach ($stages as $stage) {
                        if (! is_array($stage)) {
                            continue;
                        }
                        $this->line(sprintf(
                            '  - %s  id=%s',
                            (string) ($stage['name'] ?? 'unnamed'),
                            (string) ($stage['id'] ?? '')
                        ));
                    }
                }
            }
        }

        $configuredPipeline = (string) config('services.gohighlevel.pipeline_id');
        if ($configuredPipeline !== '') {
            $found = collect($pipelines)->contains(fn ($p) => is_array($p) && ($p['id'] ?? '') === $configuredPipeline);
            $found ? $this->ok('Configured GHL_PIPELINE_ID found') : $this->bad('Configured GHL_PIPELINE_ID not in list');
        }

        foreach (['lead', 'inquiry', 'checkout', 'won'] as $key) {
            $stageId = (string) (config("services.gohighlevel.stages.{$key}") ?? '');
            if ($stageId === '') {
                $this->line("Stage {$key}: (empty — opportunity steps for this stage skipped)");

                continue;
            }
            $foundStage = false;
            foreach ($pipelines as $pipeline) {
                if (! is_array($pipeline)) {
                    continue;
                }
                $stages = $pipeline['stages'] ?? $pipeline['pipelineStages'] ?? [];
                if (! is_array($stages)) {
                    continue;
                }
                foreach ($stages as $stage) {
                    if (is_array($stage) && ($stage['id'] ?? '') === $stageId) {
                        $foundStage = true;
                        break 2;
                    }
                }
            }
            $foundStage
                ? $this->ok("Stage {$key} id found")
                : $this->bad("Stage {$key} id not found in pipelines");
        }

        if ($email = $this->option('test-contact')) {
            $this->section('5. Test contact upsert');
            $id = $client->upsertContact([
                'email' => (string) $email,
                'firstName' => 'API',
                'lastName' => 'Test',
                'source' => 'Website',
                'tags' => ['api-test'],
            ]);
            if ($id) {
                $this->ok('Upserted test contact id='.$id);
            } else {
                $this->bad('Test contact upsert failed');
            }
        }

        return $this->finish();
    }

    private function section(string $title): void
    {
        $this->newLine();
        $this->info('── '.$title.' ──');
    }

    private function checkEnv(string $name, string $display, bool $required): void
    {
        if ($display === '') {
            if ($required) {
                $this->bad("{$name} is empty");
            } else {
                $this->line("{$name}: (empty)");
            }

            return;
        }

        $this->ok("{$name} = {$display}");
    }

    private function ok(string $message): void
    {
        $this->line('<fg=green>OK</>  '.$message);
    }

    private function bad(string $message): void
    {
        $this->failures++;
        $this->line('<fg=red>FAIL</>  '.$message);
    }

    private function maskSecret(string $value): string
    {
        if ($value === '') {
            return '';
        }
        if (strlen($value) <= 8) {
            return str_repeat('*', strlen($value));
        }

        return substr($value, 0, 4).'…'.substr($value, -4);
    }

    private function finish(): int
    {
        $this->newLine();
        if ($this->failures > 0) {
            $this->error("Finished with {$this->failures} failure(s).");

            return self::FAILURE;
        }
        $this->info('Finished: all checks passed.');

        return self::SUCCESS;
    }
}
