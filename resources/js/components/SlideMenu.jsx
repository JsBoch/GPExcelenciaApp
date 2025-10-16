import React, { useState } from 'react';
import { slide as Menu } from 'react-burger-menu';
import { Link } from 'react-router-dom';
import '../../css/SlideMenu.css';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { FiLogOut } from 'react-icons/fi';

function SlideMenu({ logout, links, ...props }) {
    const [openMenus, setOpenMenus] = useState({});

    const toggleSubmenu = (index) => {
        setOpenMenus(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };
//test
    return (
        <Menu {...props}>
            <div className="menu-scroll">
                {links.map((item, index) => (
                    item.submenus ? (
                        <div key={`menu-item-${index}`} className="menu-item-group">
                            <div className="menu-item-parent" onClick={() => toggleSubmenu(index)}>
                                <span className="menu-item-content">
                                    {item.icon && <span className="menu-icon">{item.icon}</span>}
                                    <span>{item.text}</span>
                                </span>
                                <span className="submenu-toggle-icon">
                                    {openMenus[index] ? <FiChevronDown /> : <FiChevronRight />}
                                </span>
                            </div>
                            <div className={`submenu ${openMenus[index] ? 'open' : ''}`}>
                                {item.submenus.map((sublink) => (
                                    <Link key={sublink.to} to={sublink.to} className="menu-item submenu-item">
                                        {sublink.icon && <span className="menu-icon">{sublink.icon}</span>}
                                        <span>{sublink.text}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Link key={item.to} to={item.to} className="menu-item">
                            <span className="menu-item-content">
                                {item.icon && <span className="menu-icon">{item.icon}</span>}
                                <span>{item.text}</span>
                            </span>
                        </Link>
                    )
                ))}
                <button onClick={logout} className="menu-item logout-button">
                <FiLogOut style={{ marginRight: '8px' }} />
                    Cerrar Sesión
                    </button>
            </div>
        </Menu>
    );
}

export default SlideMenu;