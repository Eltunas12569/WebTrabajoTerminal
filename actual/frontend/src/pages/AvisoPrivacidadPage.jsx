import { useNavigate } from 'react-router-dom';
import './css/AvisoPrivacidad.css';

const AvisoPrivacidadPage = () => {
    const navigate = useNavigate();

    const cerrarAviso = () => {
        window.close();
        if (!window.closed) navigate('/register');
    };

    return (
        <main className="privacy-page">
            <article className="privacy-document">
                <header className="privacy-header">
                    <div>
                        <p className="privacy-eyebrow">Sistema de Clubes ESCOM IPN</p>
                        <h1>Aviso de Privacidad</h1>
                        <p className="privacy-version">Versión 1.0</p>
                    </div>
                    <button type="button" className="privacy-close" onClick={cerrarAviso}>
                        Volver al registro
                    </button>
                </header>

                <p>
                    En cumplimiento de la normativa aplicable en materia de protección de datos personales,
                    el Sistema de Clubes ESCOM IPN informa cómo se recopilan, utilizan y protegen los datos
                    proporcionados durante el registro y uso de la plataforma.
                </p>

                <section>
                    <h2>Datos que recopilamos</h2>
                    <p>
                        Podemos solicitar nombres, apellidos, correo institucional, NSS, boleta, carrera,
                        número de empleado, información médica y datos de contactos de emergencia.
                    </p>
                </section>

                <section>
                    <h2>Finalidad del tratamiento</h2>
                    <p>
                        Los datos se utilizan para crear y verificar la cuenta, gestionar la participación en
                        clubes, facilitar comunicaciones institucionales, atender emergencias y mantener la
                        seguridad de la plataforma.
                    </p>
                </section>

                <section>
                    <h2>Protección de la información</h2>
                    <p>
                        La información se almacena en sistemas con controles de acceso y se utiliza únicamente
                        para las finalidades descritas. Las contraseñas se almacenan de forma protegida y no
                        deben compartirse con terceros.
                    </p>
                </section>

                <section>
                    <h2>Derechos de la persona titular</h2>
                    <p>
                        La persona titular puede solicitar información sobre sus datos, así como su rectificación,
                        actualización o eliminación conforme a los procedimientos institucionales aplicables.
                    </p>
                </section>

                <section>
                    <h2>Aceptación</h2>
                    <p>
                        Al marcar la casilla de aceptación durante el registro, la persona confirma que leyó este
                        aviso y autoriza el tratamiento de sus datos para las finalidades indicadas. La plataforma
                        registra la versión del aviso y la fecha de aceptación.
                    </p>
                </section>

                <footer className="privacy-footer">
                    <span>Última actualización: 6 de septiembre de 2026</span>
                </footer>
            </article>
        </main>
    );
};

export default AvisoPrivacidadPage;
