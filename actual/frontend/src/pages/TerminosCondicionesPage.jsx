import { useNavigate } from 'react-router-dom';
import './css/AvisoPrivacidad.css';

const TerminosCondicionesPage = () => {
    const navigate = useNavigate();

    const volverAtras = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <main className="privacy-page">
            <article className="privacy-document">
                <header className="privacy-header">
                    <div>
                        <p className="privacy-eyebrow">Sistema de Clubes ESCOM IPN</p>
                        <h1>Términos y Condiciones de Uso</h1>
                        <p className="privacy-version">Versión 1.0 · Vigencia a partir de septiembre de 2026</p>
                    </div>
                    <button type="button" className="privacy-close" onClick={volverAtras}>
                        ← Volver
                    </button>
                </header>

                <div className="privacy-intro">
                    <p>
                        Los presentes Términos y Condiciones regulan el acceso, navegación y utilización de la
                        plataforma digital del <strong>Sistema de Gestión de Clubes Deportivos y Culturales</strong> de la
                        Escuela Superior de Cómputo (ESCOM) del Instituto Politécnico Nacional (IPN).
                    </p>
                    <p>
                        Al registrarse, iniciar sesión o hacer uso de cualquier módulo del sistema, la persona usuaria
                        manifiesta su conformidad y aceptación plena de las presentes disposiciones y de los reglamentos
                        institucionales aplicables en el IPN.
                    </p>
                </div>

                <section>
                    <h2>1. Objeto de la Plataforma</h2>
                    <p>
                        El sistema tiene como objetivo primordial facilitar la difusión, inscripción, calendarización,
                        control de asistencia, administración y comunicación integral de los clubes deportivos,
                        culturales y extracurriculares reconocidos por la ESCOM IPN, promoviendo la formación integral,
                        la sana convivencia y la actividad física de la comunidad politécnica.
                    </p>
                </section>

                <section>
                    <h2>2. Requisitos de Acceso y Cuentas de Usuario</h2>
                    <p>
                        El acceso al sistema está reservado a estudiantes regulares, personal docente, coordinadores y
                        autoridades autorizadas de la ESCOM IPN.
                    </p>
                    <ul>
                        <li>
                            <strong>Registro institucional:</strong> Toda cuenta debe crearse con una dirección de correo
                            electrónico institucional oficial (<code>@ipn.mx</code> o <code>@alumno.ipn.mx</code>).
                        </li>
                        <li>
                            <strong>Verificación obligatoria:</strong> La activación de la cuenta requiere la comprobación
                            de identidad mediante el código de verificación único (OTP) enviado al correo registrado.
                        </li>
                        <li>
                            <strong>Confidencialidad de credenciales:</strong> Las contraseñas y accesos son estrictamente
                            personales e intransferibles. Cada usuario es legal y administrativamente responsable de todas
                            las actividades realizadas bajo su sesión.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>3. Roles y Responsabilidades de la Comunidad</h2>
                    <p>
                        El sistema opera bajo un modelo de control de acceso basado en roles (RBAC):
                    </p>
                    <ul>
                        <li>
                            <strong>Estudiantes / Atletas:</strong> Tienen derecho a consultar la oferta de clubes,
                            solicitar inscripción, registrar asistencia a sesiones y eventos, y participar activamente en
                            las actividades programadas cumpliendo los lineamientos del club.
                        </li>
                        <li>
                            <strong>Alumnos Representantes y Encargados:</strong> Responsables de gestionar las convocatorias,
                            publicar avisos internos del club, dar seguimiento a las listas de integrantes y coordinarse
                            estrechamente con los profesores asesores.
                        </li>
                        <li>
                            <strong>Profesores y Asesores:</strong> Responsables de supervisar los planes de trabajo,
                            avalar la seguridad en prácticas y entrenamientos, y verificar el cumplimiento de metas formativas.
                        </li>
                        <li>
                            <strong>Administración Institucional:</strong> Encargada de supervisar el correcto uso de la
                            infraestructura, habilitar o suspender clubes y velar por el cumplimiento de las normativas del IPN.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>4. Código de Conducta y Uso Aceptable</h2>
                    <p>
                        Las personas usuarias se comprometen a interactuar bajo principios de respeto, inclusión,
                        disciplina y ética politécnica:
                    </p>
                    <ul>
                        <li>
                            Queda terminantemente prohibido publicar o transmitir contenido difamatorio, obsceno,
                            discriminatorio, violento, de acoso o que atente contra la dignidad de cualquier miembro de
                            la comunidad en los chats, tableros de avisos o foros del sistema.
                        </li>
                        <li>
                            No se tolerará la alteración, falsificación o manipulación de registros de asistencia,
                            fichas médicas, autorizaciones o credenciales deportivas.
                        </li>
                        <li>
                            Los recursos, áreas de entrenamiento e instalaciones de la ESCOM solicitadas mediante la
                            plataforma deberán emplearse con el debido cuidado, salvaguardando en todo momento el patrimonio público.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>5. Ficha Médica y Responsabilidad en Actividades Físicas</h2>
                    <p>
                        Para participar en clubes deportivos de alto rendimiento o esfuerzo físico representativo, los
                        atletas deberán proporcionar información veraz sobre su estado de salud, Número de Seguridad Social (NSS)
                        vigente y datos de contacto en caso de emergencia.
                    </p>
                    <p>
                        La institución proporciona acompañamiento preventivo, pero cada integrante asume la responsabilidad
                        de seguir las indicaciones de los instructores y las medidas de protección civil establecidas en la ESCOM.
                    </p>
                </section>

                <section>
                    <h2>6. Medidas de Seguridad y Suspensión de Cuentas</h2>
                    <p>
                        Con el fin de garantizar la seguridad informática y la disponibilidad de los servicios en la nube:
                    </p>
                    <ul>
                        <li>
                            El sistema implementa mecanismos automatizados de bloqueo temporal o permanente ante múltiples
                            intentos fallidos de inicio de sesión o actividad sospechosa.
                        </li>
                        <li>
                            La administración se reserva el derecho de suspender o revocar el acceso a cualquier cuenta que
                            incurra en violaciones a estos Términos y Condiciones o al Reglamento Interno del IPN.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>7. Propiedad Intelectual</h2>
                    <p>
                        Los logotipos, marcas, código fuente, interfaces, bases de datos y materiales multimedia que
                        integran el sistema son propiedad del Instituto Politécnico Nacional y de los desarrolladores del
                        proyecto terminal. Queda prohibida su reproducción, extracción o explotación comercial no autorizada.
                    </p>
                </section>

                <section>
                    <h2>8. Privacidad y Datos Personales</h2>
                    <p>
                        El tratamiento de todos los datos recopilados se rige por lo dispuesto en nuestro{' '}
                        <a href="/aviso-privacidad" style={{ color: '#003366', fontWeight: 'bold' }}>
                            Aviso de Privacidad
                        </a>
                        , en apego a la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.
                    </p>
                </section>

                <section>
                    <h2>9. Modificaciones a los Términos</h2>
                    <p>
                        Los presentes términos podrán actualizarse para reflejar mejoras operativas, técnicas o
                        modificaciones en la legislación institucional. Las versiones actualizadas se publicarán en este
                        mismo apartado y se notificarán oportunamente a través de los tableros de avisos del sistema.
                    </p>
                </section>

                <section>
                    <p className="privacy-eyebrow">Atención Institucional</p>
                    <h2>10. Contacto y Consultas</h2>
                    <p>
                        Para dudas, aclaraciones o reportes relacionados con estos Términos y Condiciones de Uso:
                    </p>
                    <address className="privacy-contact">
                        <span><strong>Institución:</strong> Escuela Superior de Cómputo (ESCOM - IPN)</span>
                        <span><strong>Referencia de Proyecto:</strong> ESCOM/TTB051</span>
                        <span><strong>Correo de Contacto:</strong> mgardunos1700@alumno.ipn.mx</span>
                    </address>
                </section>

                <footer className="privacy-footer">
                    <span>Versión 1.0 · Sistema de Clubes ESCOM IPN</span>
                    <span>Instituto Politécnico Nacional</span>
                </footer>
            </article>
        </main>
    );
};

export default TerminosCondicionesPage;

