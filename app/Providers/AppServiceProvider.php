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

        Gate::define('fel-preparar-notas', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'fel-preparar-notas');
                })
                ->exists();
        });


        /*
|--------------------------------------------------------------------------
| AJUSTES DE VENTAS
|--------------------------------------------------------------------------
*/

        Gate::define('ajustes-ventas.consultar', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'ajustes-ventas.consultar');
                })
                ->exists();
        });

        Gate::define('ajustes-ventas.registrar', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'ajustes-ventas.registrar');
                })
                ->exists();
        });

        Gate::define('ajustes-ventas.aprobar', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'ajustes-ventas.aprobar');
                })
                ->exists();
        });

        Gate::define('ajustes-ventas.reportes', function (User $user) {
            return $user->perfiles()
                ->whereHas('opciones', function ($query) {
                    $query->where('ruta', 'ajustes-ventas.reportes');
                })
                ->exists();
        });
    }
}
