// resources/js/components/SlideMenu.jsx
import React from 'react';
import { slide as Menu } from 'react-burger-menu';
import { Link } from 'react-router-dom';

function SlideMenu({ logout, links, ...props }) { // Recibe la prop links
    return (
        <Menu {...props}>
            {links.map(link => ( // Renderiza los enlaces dinámicamente
                <Link key={link.to} to={link.to} className="menu-item">{link.text}</Link>
            ))}
            <button onClick={logout} className="menu-item logout-button">Cerrar Sesión</button>
        </Menu>
    );
}

export default SlideMenu;