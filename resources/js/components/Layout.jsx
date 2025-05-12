/**
 * Este componente Layout se encarga de renderizar el Header y el Outlet.
 * El Outlet es donde se renderizarán las rutas hijas definidas en el archivo de rutas.
 * El Header se oculta en ciertas rutas como /, /home y /login.
 * Esto se logra utilizando el hook useLocation de react-router-dom para obtener la ruta actual.
 * Si la ruta actual está en el array hideHeaderOnPaths, el Header no se renderiza.
 * Esto se creó para evitar que el Header aparezca en la página de inicio de sesión y en la página de inicio, ero si
 * en las demás páginas.
 */
import React from 'react';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';

function Layout() {
    const location = useLocation();
    const hideHeaderOnPaths = ['/', '/home', '/login']; // Asegúrate de usar la ruta correcta para Login

    const shouldHideHeader = hideHeaderOnPaths.includes(location.pathname);

    return (
        <>
            {!shouldHideHeader && <Header />}
            <Outlet />
        </>
    );
}

export default Layout;