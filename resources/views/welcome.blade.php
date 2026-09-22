<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <meta
        name="theme-color"
        content="#0f172a"
    >

    <meta
        name="description"
        content="GP Excelencia - Sistema integral de operaciones"
    >

    <title>GP Excelencia | Sistema de Operaciones</title>

    <link
        rel="icon"
        type="image/png"
        sizes="512x512"
        href="{{ asset('favicon.png') }}?v=2"
    >

    <link
        rel="shortcut icon"
        type="image/png"
        href="{{ asset('favicon.png') }}?v=2"
    >

    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>

<body>

    <div id="root"></div>

    <div id="modal-root"></div>

</body>

</html>