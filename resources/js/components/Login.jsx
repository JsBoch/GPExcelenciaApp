import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import '../../css/login.css';

function Login() {
    //const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null); // Estado para manejar errores
    const navigate = useNavigate(); // Obtiene la función navigate

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            //const response = await axios.post('/api/login', { email, password });
            // const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { email, password });
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { name, password });
            //console.log(response.data); // Imprime la respuesta del servidor en la consola
            localStorage.setItem('token', response.data.token);
            //console.log(localStorage);
            navigate('/home'); // Redirige a /home en caso de éxito
        } catch (error) {
            console.error(error);
            setError('Credenciales inválidas'); // Establece el mensaje de error
        }
    };

    return (
        <div className="login-form"> {/* Contenedor principal con la clase login-form */}
        <div className="login-container"> {/* Contenedor del formulario con la clase login-container */}
            <h2 className="login-title">Iniciar Sesión</h2> {/* Título del formulario con la clase login-title */}
        <form onSubmit={handleSubmit}>
            {error && <p className="error-message">{error}</p>} {/* Muestra el mensaje de error */}
            {/* <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /> */}
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" className="login-button">Ingresar</button>
        </form>   
        {/* <div className="login-forgot-password">
                    <a href="#">¿Olvidaste tu contraseña?</a>
                </div>      */}
        </div>
        </div>  
    );
}

export default Login;