import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null); // Estado para manejar errores
    const navigate = useNavigate(); // Obtiene la función navigate

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            //const response = await axios.post('/api/login', { email, password });
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/login`, { email, password });
            //console.log(response.data); // Imprime la respuesta del servidor en la consola
            localStorage.setItem('token', response.data.token);
            navigate('/home'); // Redirige a /home en caso de éxito
        } catch (error) {
            console.error(error);
            setError('Credenciales inválidas'); // Establece el mensaje de error
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p style={{ color: 'red' }}>{error}</p>} {/* Muestra el mensaje de error */}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit">Login</button>
        </form>
    );
}

export default Login;