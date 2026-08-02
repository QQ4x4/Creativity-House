<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'first_name' => mb_substr($firstName, 0, 50),
            'last_name' => mb_substr($lastName, 0, 50),
            'name' => mb_substr("{$firstName} {$lastName}", 0, 100),
            'email' => mb_substr(fake()->unique()->safeEmail(), 0, 50),
            'phone_number' => null,
            'google_id' => null,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('Password1!'),
            'verification_code' => null,
            'code_expires_at' => null,
            'is_active' => true,
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
