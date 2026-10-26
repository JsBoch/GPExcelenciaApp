<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\User;
use Illuminate\Support\Facades\Gate;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {

        Gate::define('fel-consultar-intentos', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'fel-consultar-intentos');
                })
                ->exists();
        });

        Gate::define('fel-conciliar-intentos', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'fel-conciliar-intentos');
                })
                ->exists();
        });

        Gate::define('fel-regularizar-cxc', function (User $user) {
            return $user->perfiles()->whereHas('opciones', function ($q) {
                $q->where('ruta', 'fel-regularizar-cxc');
            })->exists();
        });

        Gate::define(
            'fel-transmitir-notas',
            function (User $user) {
                return $user->perfiles()
                    ->whereHas('opciones', function ($query) {
                        $query->where('ruta', 'fel-transmitir-notas');
                    })
                    ->exists();
            }
        );
    }
}
