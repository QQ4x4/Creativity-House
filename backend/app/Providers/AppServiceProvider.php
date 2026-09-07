<?php

namespace App\Providers;

use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Resend\Client;
use Resend\Contracts\Client as ClientContract;
use Resend\Laravel\Exceptions\ApiKeyIsMissing;
use Resend\Transporters\HttpTransporter;
use Resend\ValueObjects\ApiKey;
use Resend\ValueObjects\Transporter\BaseUri;
use Resend\ValueObjects\Transporter\Headers;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Local WAMP often has empty curl.cainfo / openssl.cafile, which causes
        // cURL error 60 against api.resend.com. Rebind the SDK client with TLS
        // verification skipped in local only (same approach as Google Socialite).
        if ($this->app->environment('local')) {
            $this->app->singleton(ClientContract::class, static function (): Client {
                $apiKey = config('resend.api_key') ?? config('services.resend.key');

                if (! is_string($apiKey) || $apiKey === '') {
                    throw ApiKeyIsMissing::create();
                }

                $apiKey = ApiKey::from($apiKey);
                $baseUri = BaseUri::from(getenv('RESEND_BASE_URL') ?: 'api.resend.com');
                $headers = Headers::withAuthorization($apiKey);

                $http = new GuzzleClient([
                    'timeout' => 15,
                    'verify' => false,
                ]);

                return new Client(new HttpTransporter($http, $baseUri, $headers));
            });

            $this->app->alias(ClientContract::class, 'resend');
            $this->app->alias(ClientContract::class, Client::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Named limiters used by `throttle:api` / `throttle:auth` middleware.
     * Keys use the client IP (TrustProxies must be configured for Railway).
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
