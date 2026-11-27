<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cabecera del ajuste
        Schema::create('adm_ajustes_venta', function (Blueprint $table) {
            $table->bigIncrements('idajuste');

            $table->unsignedBigInteger('idcotizacion');
            $table->unsignedBigInteger('idpedidoproduccion')->nullable();
            $table->unsignedBigInteger('idcliente');

            $table->string('tipo_ajuste', 40);
            $table->string('motivo', 500);
            $table->text('observaciones')->nullable();

            $table->dateTime('fecha_solicitud');
            $table->dateTime('fecha_aprobacion')->nullable();
            $table->date('fecha_efectiva')->nullable();

            $table->string('estado', 30)->default('BORRADOR');

            $table->string('estado_produccion', 30)
                ->default('NO_EVALUADO');

            $table->string('estado_fel', 30)
                ->default('NO_EVALUADO');

            $table->string('estado_cxc', 30)
                ->default('NO_EVALUADO');

            $table->decimal('monto_original', 16, 2)->default(0);
            $table->decimal('monto_anterior', 16, 2)->default(0);
            $table->decimal('monto_nuevo', 16, 2)->default(0);
            $table->decimal('diferencia', 16, 2)->default(0);

            $table->unsignedBigInteger('idusuario_solicita');
            $table->unsignedBigInteger('idusuario_aprueba')->nullable();

            $table->text('observacion_aprobacion')->nullable();

            $table->string('uuid_operacion', 36)->unique();

            $table->timestamps();

            $table->index(['idcotizacion', 'estado']);
            $table->index('idpedidoproduccion');
            $table->index(['fecha_efectiva', 'estado']);
            $table->index('idcliente');
        });

        // 2. Detalle de las modificaciones
        Schema::create('adm_ajustes_venta_detalle', function (Blueprint $table) {
            $table->bigIncrements('iddetalleajuste');

            $table->unsignedBigInteger('idajuste');

            $table->unsignedBigInteger('iddetallecotizacion')
                ->nullable();

            $table->unsignedBigInteger('iddetallepedidoproduccion')
                ->nullable();

            $table->string('tipo_cambio', 40);
            $table->text('descripcion')->nullable();

            $table->decimal('cantidad_anterior', 16, 3)
                ->nullable();

            $table->decimal('cantidad_nueva', 16, 3)
                ->nullable();

            $table->decimal('precio_anterior', 16, 2)
                ->nullable();

            $table->decimal('precio_nuevo', 16, 2)
                ->nullable();

            $table->decimal('total_anterior', 16, 2)
                ->default(0);

            $table->decimal('total_nuevo', 16, 2)
                ->default(0);

            $table->decimal('diferencia', 16, 2)
                ->default(0);

            // Evidencia de las especificaciones originales y nuevas
            $table->json('datos_anteriores')->nullable();
            $table->json('datos_nuevos')->nullable();

            $table->timestamps();

            $table->foreign('idajuste')
                ->references('idajuste')
                ->on('adm_ajustes_venta')
                ->restrictOnDelete();

            $table->index('iddetallecotizacion');
            $table->index('iddetallepedidoproduccion');
        });

        // 3. Auditoría de movimientos
        Schema::create('adm_ajustes_venta_eventos', function (Blueprint $table) {
            $table->bigIncrements('idevento');

            $table->unsignedBigInteger('idajuste');
            $table->unsignedBigInteger('idusuario');

            $table->string('accion', 60);
            $table->string('estado_anterior', 30)->nullable();
            $table->string('estado_nuevo', 30)->nullable();

            $table->text('descripcion')->nullable();
            $table->json('datos_evento')->nullable();

            $table->dateTime('fecha_evento');

            $table->foreign('idajuste')
                ->references('idajuste')
                ->on('adm_ajustes_venta')
                ->restrictOnDelete();

            $table->index(['idajuste', 'fecha_evento']);
        });

        // 4. Seguimiento operativo
        Schema::create('adm_ajustes_venta_produccion', function (Blueprint $table) {
            $table->bigIncrements('idajusteproduccion');

            $table->unsignedBigInteger('idajuste');
            $table->unsignedBigInteger('idpedidoproduccion');
            $table->unsignedBigInteger('idarea')->nullable();

            $table->string('accion_requerida', 50);
            $table->string('estado', 30)->default('PENDIENTE');

            $table->text('instrucciones')->nullable();

            $table->unsignedBigInteger('idusuario_responsable')
                ->nullable();

            $table->dateTime('fecha_aplicacion')->nullable();

            $table->timestamps();

            $table->foreign('idajuste')
                ->references('idajuste')
                ->on('adm_ajustes_venta')
                ->restrictOnDelete();

            $table->index(['idpedidoproduccion', 'estado']);
        });

        // 5. Documentos y movimientos relacionados
        Schema::create('adm_ajustes_venta_documentos', function (Blueprint $table) {
            $table->bigIncrements('idajustedocumento');

            $table->unsignedBigInteger('idajuste');

            $table->string('tipo_documento', 40);

            $table->string('tabla_origen', 100)->nullable();
            $table->string('idregistro_origen', 100)->nullable();

            $table->string('uuid_fel', 100)->nullable();
            $table->string('numero_documento', 100)->nullable();

            $table->decimal('monto', 16, 2)->nullable();

            $table->string('estado', 30)->default('PENDIENTE');

            $table->text('observaciones')->nullable();

            $table->timestamps();

            $table->foreign('idajuste')
                ->references('idajuste')
                ->on('adm_ajustes_venta')
                ->restrictOnDelete();

            $table->index(['tipo_documento', 'estado']);
            $table->index('uuid_fel');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adm_ajustes_venta_documentos');
        Schema::dropIfExists('adm_ajustes_venta_produccion');
        Schema::dropIfExists('adm_ajustes_venta_eventos');
        Schema::dropIfExists('adm_ajustes_venta_detalle');
        Schema::dropIfExists('adm_ajustes_venta');
    }
};
