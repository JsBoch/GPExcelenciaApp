<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // 'infile' => [
    //     'codigo' => env('INFILE_EMISOR_CODIGO'),
    //     'clave'  => env('INFILE_EMISOR_CLAVE'),
    //     'url'    => env('INFILE_URL'),
    // ],


    // 'infile' => [
    //     'url' => env('INFILE_API_URL'),
    //     'usuario_api' => env('INFILE_USUARIO_API'),
    //     'llave_api' => env('INFILE_LLAVE_API'),
    //     'usuario_firma' => env('INFILE_USUARIO_FIRMA'),
    //     'llave_firma' => env('INFILE_LLAVE_FIRMA'),
    //     'envio_intentos_habilitado' => env(
    //         'INFILE_ENVIO_INTENTOS_HABILITADO',
    //         false
    //     ),
    // ],

    'infile' => [
        // Configuración utilizada por el flujo anterior
        'codigo' => env('INFILE_EMISOR_CODIGO'),
        'clave' => env('INFILE_EMISOR_CLAVE'),

        // Configuración de integración FEL
        'url' => env('INFILE_API_URL', env('INFILE_URL')),
        'usuario_api' => env('INFILE_USUARIO_API'),
        'llave_api' => env('INFILE_LLAVE_API'),
        'usuario_firma' => env('INFILE_USUARIO_FIRMA'),
        'llave_firma' => env('INFILE_LLAVE_FIRMA'),

        // Bloqueo de seguridad
        'envio_intentos_habilitado' => env(
            'INFILE_ENVIO_INTENTOS_HABILITADO',
            false
        ),

        'fcam_intentos_habilitado' => env(
            'INFILE_FCAM_INTENTOS_HABILITADO',
            false
        ),

        // Habilitación independiente para certificar NCRE y NDEB.
'notas_envio_habilitado' => env(
    'INFILE_NOTAS_ENVIO_HABILITADO',
    false
),

        'timbre_controlado' => [
            'habilitado' => env('FCAM_TIMBRE_CONTROLADO_HABILITADO', false),
            'cotizacion_id' => env('FCAM_TIMBRE_CONTROLADO_COTIZACION_ID') !== null
                ? (int) env('FCAM_TIMBRE_CONTROLADO_COTIZACION_ID') : null,
            'total_factura' => env('FCAM_TIMBRE_CONTROLADO_TOTAL_FACTURA'),
            'vence_en' => env('FCAM_TIMBRE_CONTROLADO_VENCE_EN'),
        ],

        'consulta_nit_url' => env(
    'INFILE_CONSULTA_NIT_URL',
    'https://consultareceptores.feel.com.gt/rest/action'
),

    ],

];
