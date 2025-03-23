// resources/js/components/SlideMenu.js
import React from 'react';
import { slide as Menu } from 'react-burger-menu';
import { Link } from 'react-router-dom';

function SlideMenu(props) {
    // return (
    //     <Menu {...props}>
    //         <Link to="/empleados/crear" className="menu-item">Crear Empleado</Link>
    //         <Link to="/empleados/lista" className="menu-item">Consultar Empleados</Link>
    //         <button onClick={logout} className="menu-item logout-button">Cerrar Sesión</button>
    //         {/* Agrega aquí más enlaces a tus formularios */}
    //     </Menu>
    // );
    const { logout, ...rest } = props;
    //console.log("Props to Menu:", rest); // Agrega esta línea para depurar

    return (
        <Menu {...rest}>
            <Link to="/empleados/crear" className="menu-item">Crear Empleado</Link>
            <Link to="/empleados/lista" className="menu-item">Consultar Empleados</Link>
            <button onClick={logout} className="menu-item logout-button">Cerrar Sesión</button>
        </Menu>
    );
}

export default SlideMenu;