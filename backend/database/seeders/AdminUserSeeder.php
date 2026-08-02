<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the initial super-admin user for Filament panel access.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@creativity-house.com'],
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'name' => 'Super Admin',
                'password' => 'admin1234',
                'email_verified_at' => now(),
                'is_active' => true,
                'verification_code' => null,
                'code_expires_at' => null,
            ]
        );

        $this->command->info('Super admin user created: admin@creativity-house.com');
    }
}
