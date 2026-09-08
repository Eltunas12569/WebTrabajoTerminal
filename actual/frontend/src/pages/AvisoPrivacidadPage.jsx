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
                        <p className="privacy-version">Versión 1.1 · 7 de septiembre de 2026</p>
                    </div>
                    <button type="button" className="privacy-close" onClick={cerrarAviso}>
                        Volver al registro
                    </button>
                </header>

                <div className="privacy-intro">
                    <p>
                        El presente aviso informa cómo se recopilan, utilizan, conservan y protegen los datos
                        personales dentro del Sistema de Clubes ESCOM IPN. Su objetivo es que cada persona conozca
                        el tratamiento de su información antes de registrarse o utilizar la plataforma.
                    </p>
                    <p>
                        Al crear una cuenta, la persona usuaria declara que leyó este aviso y, cuando sea necesario,
                        otorga su consentimiento para el tratamiento de sus datos conforme a las finalidades descritas.
                    </p>
                </div>

                <section>
                    <h2>1. Datos personales que se recaban</h2>
                    <p>
                        Para crear y administrar una cuenta podemos solicitar nombres, apellidos, correo electrónico
                        institucional, contraseña, datos de verificación y recuperación de cuenta. Según el rol de la
                        persona usuaria, también podemos solicitar el Número de Seguridad Social y número de boleta
                        para estudiantes, o número de empleado para personal docente, además de la carrera cuando
                        corresponda.
                    </p>
                    <p>
                        Durante el uso del sistema pueden generarse datos relacionados con la participación en clubes,
                        roles, invitaciones, eventos, asistencia, solicitudes de recursos, avisos, mensajes de chat y
                        actividades realizadas dentro de la plataforma. También podemos tratar datos de contactos de
                        emergencia, información de la ficha médica y datos técnicos necesarios para autenticación,
                        seguridad, funcionamiento y auditoría.
                    </p>
                    <p>
                        Las contraseñas se almacenan mediante mecanismos criptográficos y no se muestran al personal
                        administrador. Los códigos de verificación y recuperación tienen una vigencia limitada.
                    </p>
                </section>

                <section>
                    <h2>2. Datos personales sensibles</h2>
                    <p>
                        La información médica y cualquier dato que pueda revelar condiciones de salud se considera
                        información personal sensible. Se solicita únicamente cuando resulta necesaria para atender
                        emergencias, proteger la seguridad durante las actividades o administrar la ficha médica.
                        Su tratamiento se limitará a esas finalidades y estará sujeto a la base legal y al consentimiento
                        que resulten aplicables.
                    </p>
                </section>

                <section>
                    <h2>3. Finalidades del tratamiento</h2>
                    <p>
                        Los datos se utilizan para crear, verificar, autenticar y administrar cuentas; confirmar la
                        pertenencia a la comunidad institucional; gestionar clubes, membresías, invitaciones,
                        responsables y actividades; organizar eventos; registrar asistencia; facilitar comunicaciones
                        relacionadas con el servicio; y atender emergencias mediante los datos proporcionados.
                    </p>
                    <p>
                        También se utilizan para procesar solicitudes de recursos, prevenir accesos no autorizados,
                        fraudes, abusos y usos indebidos, atender reportes y cumplir obligaciones legales o
                        institucionales. De forma secundaria, podrán utilizarse para generar estadísticas internas,
                        mejorar la plataforma y elaborar reportes de operación, procurando que sean agregados o
                        anonimizados cuando sea posible.
                    </p>
                </section>

                <section>
                    <h2>4. Base del tratamiento y deber de proporcionar información</h2>
                    <p>
                        El tratamiento se realiza con base en el consentimiento de la persona titular cuando sea
                        requerido, en la relación institucional y en las obligaciones legales o administrativas
                        aplicables. La información solicitada para las funciones esenciales es necesaria para crear
                        la cuenta y prestar el servicio; si no se proporciona, algunas funciones podrían no estar
                        disponibles.
                    </p>
                    <p>
                        La persona usuaria debe proporcionar información verdadera, completa y actualizada. No debe
                        registrar datos de terceros sin contar con autorización para hacerlo.
                    </p>
                </section>

                <section>
                    <h2>5. Transferencias y proveedores tecnológicos</h2>
                    <p>
                        Para operar el sistema, algunos datos pueden ser tratados por proveedores que prestan servicios
                        de correo electrónico, alojamiento, base de datos, infraestructura, seguridad o mantenimiento.
                        En particular, se utiliza un servicio de correo para enviar códigos de verificación y recuperación
                        de contraseña.
                    </p>
                    <p>
                        Las transferencias nacionales o internacionales se realizarán únicamente cuando sean necesarias
                        para prestar el servicio, estén permitidas por la normativa aplicable y cuenten con medidas
                        contractuales y de seguridad adecuadas. Los datos no se venden ni se utilizan para publicidad
                        ajena al sistema.
                    </p>
                </section>

                <section>
                    <h2>6. Conservación y eliminación</h2>
                    <p>
                        Los datos se conservarán mientras la cuenta esté activa y durante el tiempo necesario para
                        cumplir las finalidades descritas, atender responsabilidades administrativas o legales y
                        resolver controversias. Cuando ya no sean necesarios, se eliminarán, bloquearán o anonimizarán
                        conforme a las políticas institucionales y los plazos aplicables.
                    </p>
                    <p>
                        Los códigos de verificación y recuperación se eliminan después de ser utilizados o cuando
                        expiran, de acuerdo con el funcionamiento de seguridad de la plataforma.
                    </p>
                </section>

                <section>
                    <h2>7. Medidas de seguridad</h2>
                    <p>
                        Se aplican controles de acceso, autenticación, hash de contraseñas, validación de sesiones,
                        expiración de códigos y medidas técnicas y administrativas razonables para reducir riesgos de
                        pérdida, alteración, acceso, uso o divulgación no autorizados. Ningún sistema conectado a
                        internet puede garantizar seguridad absoluta, por lo que también es responsabilidad de la
                        persona usuaria proteger sus credenciales y no compartirlas.
                    </p>
                </section>

                <section>
                    <h2>8. Derechos de la persona titular</h2>
                    <p>
                        La persona titular puede solicitar el acceso, rectificación, cancelación u oposición al
                        tratamiento de sus datos, así como la revocación del consentimiento o la limitación del uso,
                        cuando sean derechos aplicables al caso.
                    </p>
                    <p>
                        Para presentar una solicitud, deberá indicar claramente qué desea solicitar, proporcionar los
                        datos que permitan localizar su información, señalar un medio para recibir respuesta y entregar
                        los documentos que acrediten su identidad o representación cuando sean necesarios. La solicitud
                        se atenderá dentro de los plazos y mediante el procedimiento previstos por la normativa
                        institucional aplicable.
                    </p>
                    <p>
                        La revocación o cancelación puede impedir el acceso a funciones que requieran esos datos y no
                        tendrá efectos retroactivos sobre tratamientos realizados antes de recibir la solicitud.
                    </p>
                </section>

                <section>
                    <h2>9. Personas menores de edad</h2>
                    <p>
                        El sistema está dirigido a la comunidad institucional. Si una persona menor de edad utiliza la
                        plataforma, el registro y tratamiento de sus datos deberán contar con la intervención y
                        autorización de quien ejerza la patria potestad, tutela o representación legal, cuando así lo
                        exija la normativa aplicable. No deben proporcionarse datos médicos o de terceros sin la
                        autorización correspondiente.
                    </p>
                </section>

                <section>
                    <h2>10. Actualizaciones y aceptación</h2>
                    <p>
                        Este aviso puede modificarse por cambios legales, institucionales, técnicos o en las finalidades
                        del sistema. La versión vigente estará disponible en esta página y, cuando un cambio requiera
                        una nueva aceptación, se solicitará antes de continuar utilizando la función correspondiente.
                    </p>
                    <p>
                        Al marcar la casilla de aceptación durante el registro, la persona confirma que leyó este aviso
                        y acepta el tratamiento de sus datos para las finalidades necesarias descritas. La plataforma
                        registra la versión del aviso y la fecha de aceptación para fines de trazabilidad.
                    </p>
                </section>

                <section className="privacy-contact-section">
                    <p className="privacy-eyebrow">Atención y solicitudes</p>
                    <h2>11. Responsable y medios de contacto</h2>
                    <p>
                        El responsable del tratamiento es el Sistema de Clubes ESCOM IPN, identificado internamente
                        con la referencia institucional <strong>ESCOM/TTB051</strong>. Para dudas, solicitudes de
                        privacidad o ejercicio de derechos, pueden utilizarse los siguientes medios:
                    </p>
                    <address className="privacy-contact">
                        <span><strong>Correo:</strong> mgardunos1700@alumno.ipn.mx</span>
                        <span><strong>Teléfono:</strong> 5536638701</span>
                    </address>
                    <p className="privacy-notice">
                        Los datos de contacto anteriores deben sustituirse por los medios oficiales de la unidad
                        responsable o de la Unidad de Transparencia antes de publicar este aviso como documento legal
                        definitivo.
                    </p>
                </section>

                <footer className="privacy-footer">
                    <span>Versión 1.1 · Última actualización: 7 de septiembre de 2026</span>
                    <span>ESCOM IPN</span>
                </footer>
            </article>
        </main>
    );
};

export default AvisoPrivacidadPage;
