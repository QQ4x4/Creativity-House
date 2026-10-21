<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Step-by-step check of the Google Ads Data Manager API setup.
 * It NEVER prints the private key or the access token.
 *
 * Put this file at: app/Console/Commands/GoogleAdsDiagnose.php
 *
 *   php artisan google-ads:diagnose                       check the Railway variables + a validate-only call
 *   php artisan google-ads:diagnose --file=key.json       test a downloaded key file instead of the variable
 *   php artisan google-ads:diagnose --login=1234567890    only if the service account was added at manager (MCC) level
 *   php artisan google-ads:diagnose --status=REQUEST_ID   result of a LIVE upload (requestId from the logs)
 *   php artisan google-ads:diagnose --offline             only check the variables, do not call Google
 */
class GoogleAdsDiagnose extends Command
{
    protected $signature = 'google-ads:diagnose
        {--file= : Path to a downloaded service-account key file to test instead of the variable}
        {--login= : Manager (MCC) account ID, only if the service account was added at manager level}
        {--status= : requestId of a live upload to look up}
        {--offline : Only check the variables; do not call Google}';

    protected $description = 'Check the Google Ads Data Manager API setup step by step (prints no secrets)';

    private const SCOPE = 'https://www.googleapis.com/auth/datamanager';
    private const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';
    private const STATUS_URL = 'https://datamanager.googleapis.com/v1/requestStatus:retrieve';

    private int $failures = 0;

    public function handle(): int
    {
        $this->section('1. Reading the service-account key');
        $raw = $this->readKeySource();
        if ($raw === null) {
            return $this->finish();
        }

        $this->section('2. Parsing the JSON');
        $creds = $this->parseJson($raw);
        if ($creds === null) {
            return $this->finish();
        }

        $this->section('3. Checking the key contents');
        $privateKey = $this->checkKeyFields($creds);

        $this->section('4. Checking the other variables');
        [$customerId, $actionId] = $this->checkOtherVariables();

        if ($privateKey === null || $this->option('offline')) {
            return $this->finish();
        }

        $this->section('5. Getting an access token from Google');
        $token = $this->fetchToken($creds, $privateKey);
        if ($token === null) {
            return $this->finish();
        }

        if ($requestId = $this->option('status')) {
            $this->section('6. Looking up live upload '.$requestId);
            $this->lookupStatus($token, $requestId);
        } elseif ($customerId && $actionId) {
            $this->section('6. Sending a VALIDATE-ONLY test request (Google records nothing)');
            $this->validateOnlyRequest($token, $customerId, $actionId);
        } else {
            $this->bad('Skipped the API test: the customer ID or conversion action ID is not valid (see step 4).');
        }

        return $this->finish();
    }

    // ---------------------------------------------------------------- step 1

    private function readKeySource(): ?string
    {
        if ($file = $this->option('file')) {
            if (! is_readable($file)) {
                $this->bad("Cannot read the file: {$file}");
                return null;
            }
            $this->good("Testing the file {$file} (not the Railway variable).");
            return (string) file_get_contents($file);
        }

        $name = 'GOOGLE_ADS_SERVICE_ACCOUNT_JSON';
        $found = [];
        foreach ($this->sources($name) as $label => $value) {
            $this->line(sprintf(
                '   %-9s %s',
                $label,
                $this->isBlank($value) ? 'not set / empty' : 'set, '.strlen((string) $value).' characters'
            ));
            if (! $this->isBlank($value)) {
                $found[] = (string) $value;
            }
        }
        $this->line('   config cache: '.(app()->configurationIsCached() ? 'ON' : 'off'));

        if ($found === []) {
            $this->bad("{$name} is empty. Add it in Railway (service > Variables) and redeploy.");
            return null;
        }
        if (count(array_unique(array_map('strlen', $found))) > 1) {
            $this->caution('The value has different lengths in different places. Usually this means quotes around it, or an old value in a .env file.');
        }

        return $found[0];
    }

    // ---------------------------------------------------------------- step 2

    private function parseJson(string $raw): ?array
    {
        $value = trim(preg_replace('/^\xEF\xBB\xBF/', '', $raw));

        $this->line('   length: '.strlen($value).' characters');
        $this->line('   starts with: '.substr($value, 0, 10).'    ends with: '.substr($value, -3));

        if (preg_match('/\A([\'"])(.*)\1\z/s', $value, $m)) {
            $this->caution('The value is wrapped in quotes. Remove the quotes in Railway. (Testing without them.)');
            $value = trim($m[2]);
        }

        if ($value !== '' && $value[0] !== '{') {
            $decoded = base64_decode($value, true);
            if ($decoded !== false && str_starts_with(ltrim($decoded), '{')) {
                $this->caution('The value is base64-encoded. That only works if the app code decodes it. (Testing the decoded value.)');
                $value = trim($decoded);
            } else {
                $this->bad('The value does not start with "{" so it is not JSON. Paste the whole content of the .json key file.');
                return null;
            }
        }

        if (! str_ends_with($value, '}')) {
            $this->bad('The value does not end with "}" so it was cut off while copying. Copy the whole file again.');
        }

        $json = json_decode($value, true);
        if (! is_array($json)) {
            $error = json_last_error_msg();
            $this->bad("Not valid JSON: {$error}");
            if (stripos($error, 'control character') !== false) {
                $this->line('   -> The \n inside private_key became real line breaks while pasting.');
                $this->line('      Paste the file content again as one line (Cursor: Join Lines), without editing it.');
            }
            return null;
        }

        $this->good('Valid JSON.');
        return $json;
    }

    // ---------------------------------------------------------------- step 3

    private function checkKeyFields(array $c): ?\OpenSSLAsymmetricKey
    {
        $type = $c['type'] ?? null;
        if ($type !== 'service_account') {
            $this->bad('"type" is '.json_encode($type).', not "service_account". This is the wrong kind of file.');
            if (isset($c['installed']) || isset($c['web'])) {
                $this->line('   -> This is an OAuth client file. You need a SERVICE ACCOUNT key:');
                $this->line('      Google Cloud > IAM & Admin > Service Accounts > your account > Keys > Add key > JSON.');
            }
            return null;
        }
        $this->good('type = service_account');

        $this->line('   project_id:     '.($c['project_id'] ?? '(missing)'));
        $this->line('   client_email:   '.($c['client_email'] ?? '(missing)'));
        $this->line('   private_key_id: '.(isset($c['private_key_id']) ? substr($c['private_key_id'], 0, 8).'...' : '(missing)'));

        if (empty($c['client_email'])) {
            $this->bad('client_email is missing.');
            return null;
        }

        $key = (string) ($c['private_key'] ?? '');
        if ($key === '') {
            $this->bad('private_key is missing.');
            return null;
        }
        if (! str_contains($key, "\n") && str_contains($key, '\n')) {
            $this->caution('private_key contains the text \n instead of line breaks (escaped twice). The app code would need to fix that. (Testing with it fixed.)');
            $key = str_replace('\n', "\n", $key);
        }
        if (! str_contains($key, '-----BEGIN PRIVATE KEY-----') || ! str_contains($key, '-----END PRIVATE KEY-----')) {
            $this->bad('private_key is missing its BEGIN/END lines, so it is damaged or cut off.');
            return null;
        }

        $pkey = openssl_pkey_get_private($key);
        if ($pkey === false) {
            $this->bad('OpenSSL cannot read private_key, so it is damaged.');
            return null;
        }

        $this->good('private_key is a readable key.');
        $this->line('   -> This client_email must be a user in Google Ads > Admin > Access and security (Standard access).');
        $this->line('   -> private_key_id should match the newest key under the service account\'s Keys tab in Google Cloud.');

        return $pkey;
    }

    // ---------------------------------------------------------------- step 4

    private function checkOtherVariables(): array
    {
        $customerId = null;
        $actionId = null;

        $customer = trim((string) $this->firstValue('GOOGLE_ADS_CUSTOMER_ID'), " \t\n\r\"'");
        if ($customer === '') {
            $this->bad('GOOGLE_ADS_CUSTOMER_ID is empty.');
        } elseif (preg_match('/^\d{10}$/', $customer)) {
            $this->good("GOOGLE_ADS_CUSTOMER_ID = {$customer}");
            $customerId = $customer;
        } elseif (preg_match('/^\d{3}-\d{3}-\d{4}$/', $customer)) {
            $customerId = str_replace('-', '', $customer);
            $this->bad("GOOGLE_ADS_CUSTOMER_ID has hyphens ({$customer}). Change it to {$customerId}");
        } else {
            $this->bad("GOOGLE_ADS_CUSTOMER_ID ({$customer}) must be the 10-digit account number, no hyphens.");
        }

        $action = trim((string) $this->firstValue('GOOGLE_ADS_LEAD_ACTION_ID'), " \t\n\r\"'");
        if ($action === '') {
            $this->bad('GOOGLE_ADS_LEAD_ACTION_ID is empty.');
        } elseif (ctype_digit($action)) {
            $this->good("GOOGLE_ADS_LEAD_ACTION_ID = {$action}");
            $actionId = $action;
        } elseif (str_starts_with(strtoupper($action), 'AW-') || str_contains($action, '/')) {
            $this->bad("GOOGLE_ADS_LEAD_ACTION_ID ({$action}) is the website tag ID/label, not a conversion action ID.");
            $this->line('   -> Use the numeric ID of a conversion action whose source is "Website (import from clicks)".');
        } else {
            $this->bad("GOOGLE_ADS_LEAD_ACTION_ID ({$action}) must contain numbers only.");
        }

        $validate = $this->firstValue('GOOGLE_ADS_VALIDATE_ONLY');
        if ($this->isBlank($validate)) {
            $this->caution('GOOGLE_ADS_VALIDATE_ONLY is empty. Check what the app does by default.');
        } else {
            $raw = trim((string) $validate);
            if (preg_match('/^[\'"].*[\'"]$/', $raw)) {
                $this->caution("GOOGLE_ADS_VALIDATE_ONLY is saved with quotes ({$raw}). Type true or false without quotes.");
            }
            $bool = filter_var(trim($raw, '\'"'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $mode = $bool === null ? 'NOT a valid true/false value' : ($bool ? 'TEST mode (Google records nothing)' : 'LIVE mode');
            $this->line("   GOOGLE_ADS_VALIDATE_ONLY = {$raw}  ->  {$mode}");
        }

        return [$customerId, $actionId];
    }

    // ---------------------------------------------------------------- step 5

    private function fetchToken(array $c, \OpenSSLAsymmetricKey $pkey): ?string
    {
        $now = time();
        $tokenUrl = $c['token_uri'] ?? 'https://oauth2.googleapis.com/token';

        $segments = [
            $this->b64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->b64url(json_encode([
                'iss' => $c['client_email'],
                'scope' => self::SCOPE,
                'aud' => $tokenUrl,
                'iat' => $now,
                'exp' => $now + 3600,
            ])),
        ];

        if (! openssl_sign(implode('.', $segments), $signature, $pkey, OPENSSL_ALGO_SHA256)) {
            $this->bad('Could not sign with the private key.');
            return null;
        }
        $segments[] = $this->b64url($signature);

        $res = $this->callGoogle(fn () => Http::asForm()->timeout(20)->post($tokenUrl, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => implode('.', $segments),
        ]));
        if ($res === null) {
            return null;
        }

        if (! $res->successful() || ! $res->json('access_token')) {
            $this->bad('Google refused the key: HTTP '.$res->status().' '.$res->json('error', '').' - '.$res->json('error_description', $res->body()));
            $this->line('   -> "Invalid JWT Signature": this key was deleted or disabled in Google Cloud. Create a new key.');
            $this->line('   -> "account not found": the service account was deleted or the email is wrong.');
            $this->line('   -> "short-lived token" / iat / exp: the server clock is wrong.');
            return null;
        }

        $this->good('Google accepted the key and returned an access token (not printed).');
        return $res->json('access_token');
    }

    // ---------------------------------------------------------------- step 6

    private function validateOnlyRequest(string $token, string $customerId, string $actionId): void
    {
        $destination = [
            'operatingAccount' => ['accountType' => 'GOOGLE_ADS', 'accountId' => $customerId],
            'productDestinationId' => $actionId,
        ];
        if ($login = $this->option('login')) {
            $destination['loginAccount'] = ['accountType' => 'GOOGLE_ADS', 'accountId' => preg_replace('/\D/', '', $login)];
        }

        $body = [
            'destinations' => [$destination],
            'encoding' => 'HEX',
            'events' => [[
                'eventTimestamp' => gmdate('Y-m-d\TH:i:s\Z'),
                'transactionId' => 'diagnose-'.time(),
                'eventSource' => 'WEB',
                'userData' => ['userIdentifiers' => [
                    ['emailAddress' => hash('sha256', 'diagnostic-test@example.com')],
                ]],
            ]],
            'validateOnly' => true,
        ];

        $res = $this->callGoogle(fn () => Http::withToken($token)->acceptJson()->timeout(20)->post(self::INGEST_URL, $body));
        if ($res === null) {
            return;
        }

        if ($res->successful()) {
            $this->good('Google accepted the validate-only request: the key, the scope and the request format are OK, and no access error was reported.');
            if ($warnings = $res->json('fieldWarnings')) {
                $this->caution('Google returned field warnings:');
                $this->line($this->pretty($warnings));
            }
            return;
        }

        $this->bad('Google returned HTTP '.$res->status().':');
        $this->line($this->pretty($res->json() ?? $res->body()));
        $this->explainError($res);
    }

    private function lookupStatus(string $token, string $requestId): void
    {
        $res = $this->callGoogle(fn () => Http::withToken($token)->acceptJson()->timeout(20)
            ->get(self::STATUS_URL, ['requestId' => $requestId]));
        if ($res === null) {
            return;
        }

        if (! $res->successful()) {
            $this->bad('Google returned HTTP '.$res->status().':');
            $this->line($this->pretty($res->json() ?? $res->body()));
            $this->explainError($res);
            return;
        }

        $this->line($this->pretty($res->json()));

        $hints = [
            'PROCESSING_ERROR_REASON_INVALID_GCLID' => 'The gclid is not a real Google click ID. Expected if you used a test value like TEST-123.',
            'PROCESSING_ERROR_REASON_CLICK_NOT_FOUND' => 'Google cannot find that ad click. Test again with a real click on your ad.',
            'PROCESSING_ERROR_REASON_INVALID_CLICK' => 'The click did not come from a Google Ads campaign.',
            'PROCESSING_ERROR_REASON_DESTINATION_TOO_RECENTLY_CREATED' => 'The conversion action is new. Wait a few hours, then test again.',
            'PROCESSING_ERROR_REASON_CONVERSION_PRECEDES_CLICK' => 'eventTimestamp is earlier than the click. Usually a timezone bug in the code.',
            'PROCESSING_ERROR_REASON_TOO_RECENT_CLICK' => 'The click happened too recently. Wait, then retry.',
            'PROCESSING_ERROR_REASON_INVALID_OPERATING_ACCOUNT_FOR_CLICK' => 'The click belongs to a different Google Ads account than GOOGLE_ADS_CUSTOMER_ID.',
            'PROCESSING_ERROR_OPERATING_ACCOUNT_MISMATCH_FOR_AD_IDENTIFIER' => 'The click belongs to a different Google Ads account than GOOGLE_ADS_CUSTOMER_ID.',
            'PROCESSING_ERROR_REASON_DUPLICATE_TRANSACTION_ID' => 'Already uploaded with this transactionId. Fine if this was a retry.',
            'PROCESSING_ERROR_REASON_DUPLICATE_GCLID' => 'A conversion with this gclid and time already exists. Fine if this was a retry.',
            'PROCESSING_ERROR_REASON_DENIED_CONSENT' => 'Consent was denied (by the user or the account default settings).',
            'PROCESSING_ERROR_REASON_NO_CONSENT' => 'Consent is missing. Check the consent fields and the account settings.',
            'PROCESSING_ERROR_REASON_UNKNOWN_CONSENT' => 'Consent could not be determined. Check the consent fields and the account settings.',
            'PROCESSING_ERROR_REASON_DESTINATION_ACCOUNT_ENHANCED_CONVERSIONS_TERMS_NOT_SIGNED' => 'Accept the enhanced conversions / customer data terms in Google Ads.',
            'PROCESSING_ERROR_REASON_EXPIRED_CLICK' => 'The click is older than the conversion window.',
            'PROCESSING_ERROR_REASON_EVENT_TOO_OLD' => 'The conversion is too old to upload.',
        ];

        foreach ((array) $res->json('requestStatusPerDestination', []) as $dest) {
            $status = $dest['requestStatus'] ?? 'REQUEST_STATUS_UNKNOWN';
            if ($status === 'SUCCESS') {
                $this->good('SUCCESS: Google processed the event. It can take hours to show in Google Ads > Goals > Conversions.');
            } elseif ($status === 'PROCESSING') {
                $this->caution('Still PROCESSING. Run this again in a few minutes.');
            } else {
                $this->bad("Status: {$status}");
                foreach ((array) ($dest['errorInfo']['errorCounts'] ?? []) as $count) {
                    $reason = $count['reason'] ?? 'UNKNOWN';
                    $this->line("   {$reason}: ".($hints[$reason] ?? 'see the Data Manager API requestStatus reference.'));
                }
            }
        }
    }

    private function explainError(Response $res): void
    {
        $text = strtolower($res->body());

        if (str_contains($text, 'has not been used in project') || str_contains($text, 'service_disabled') || str_contains($text, 'it is disabled')) {
            $this->line('   -> Enable "Data Manager API" in the Google Cloud project shown as project_id above, wait a few minutes, run again.');
        } elseif ($res->status() === 403) {
            $this->line('   -> The service account cannot access this Google Ads account.');
            $this->line('      Add the client_email above in Google Ads > Admin > Access and security (Standard access),');
            $this->line('      and check GOOGLE_ADS_CUSTOMER_ID is the account that owns the conversion action.');
            $this->line('      If you added it to a manager (MCC) account instead, run again with --login=<manager account ID>.');
        } elseif ($res->status() === 401) {
            $this->line('   -> The access token was rejected. Run again; if it repeats, create a new key.');
        } elseif ($res->status() === 400) {
            $this->line('   -> Google names the field it rejects above (fieldViolations).');
            $this->line('      If it is about the destination, check GOOGLE_ADS_LEAD_ACTION_ID is a conversion action');
            $this->line('      whose source is "Website (import from clicks)".');
        }
    }

    // ---------------------------------------------------------------- helpers

    private function sources(string $name): array
    {
        $getenv = getenv($name);
        $fromEnv = env($name);

        return [
            'getenv()' => $getenv === false ? null : $getenv,
            '$_SERVER' => $_SERVER[$name] ?? null,
            '$_ENV' => $_ENV[$name] ?? null,
            'env()' => is_string($fromEnv) ? $fromEnv : (is_bool($fromEnv) ? ($fromEnv ? 'true' : 'false') : null),
        ];
    }

    private function firstValue(string $name): ?string
    {
        foreach ($this->sources($name) as $value) {
            if (! $this->isBlank($value)) {
                return (string) $value;
            }
        }
        return null;
    }

    private function callGoogle(callable $send): ?Response
    {
        try {
            return $send();
        } catch (Throwable $e) {
            $this->bad('Could not reach Google: '.$e->getMessage());
            return null;
        }
    }

    private function isBlank(mixed $value): bool
    {
        return $value === null || trim((string) $value) === '';
    }

    private function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function pretty(mixed $data): string
    {
        return is_string($data) ? $data : (string) json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    private function section(string $title): void
    {
        $this->line('');
        $this->line("<options=bold>{$title}</>");
    }

    private function good(string $message): void
    {
        $this->line("   <fg=green>[OK]</> {$message}");
    }

    private function bad(string $message): void
    {
        $this->failures++;
        $this->line("   <fg=red>[FAIL]</> {$message}");
    }

    private function caution(string $message): void
    {
        $this->line("   <fg=yellow>[WARN]</> {$message}");
    }

    private function finish(): int
    {
        $this->line('');
        if ($this->failures === 0) {
            $this->info('No problems found in the checks that ran.');
            return self::SUCCESS;
        }
        $this->error("{$this->failures} problem(s) found. Fix the first [FAIL] and run again.");
        return self::FAILURE;
    }
}
