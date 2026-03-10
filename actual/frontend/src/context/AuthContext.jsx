import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.clear();
            }
        }
        setLoading(false);
    }, []);

    const loginUser = (responseData) => {
        // Extraemos los datos del usuario y el token de la respuesta
        const userData = responseData.user || responseData;
        const token = responseData.token;

        // Guardamos por separado para mayor orden
        localStorage.setItem('user_data', JSON.stringify(userData));
        if (token) localStorage.setItem('token', token);

        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('user_data');
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, loginUser, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);