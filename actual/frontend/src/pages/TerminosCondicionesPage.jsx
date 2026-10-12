import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/AvisoPrivacidad.css';

const TerminosCondicionesPage = () => {
    const navigate = useNavigate();
    const [politicaActual, setPoliticaActual] = useState(null);

    useEffect(() => {
        let isMounted = true;
        api.get('/politicas/actual')
            .then((res) => {
                if (isMounted && res.data) {
                    setPoliticaActual(res.data);
                }
            })
            .catch((err) => {
                console.error('Error al obtener la versión actual de políticas:', err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const versionActiva = politicaActual?.version || politicaActual?.version_actual || '1.1';
    const fechaPublicacion = politicaActual?.fecha_publicacion
        ? new Date(politicaActual.fecha_publicacion).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
          })
        : 'septiembre de 2026';

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
                        <p className="privacy-eyebrow">Sistema Gestor de Clubs · TT-B051 (ESCOM - IPN)</p>
                        <h1>Términos y Condiciones de Uso y Licencia de Software (EULA / SaaS)</h1>
                        <p className="privacy-version">
                            Versión {versionActiva} · Vigencia a partir de {fechaPublicacion}
                        </p>
                    </div>
                    <button type="button" className="privacy-close" onClick={volverAtras}>
                        ← Volver
                    </button>
                </header>

                <div className="privacy-intro">
                    <p>
                        El presente contrato de adhesión electrónico de <strong>Términos y Condiciones de Uso y Licencia de
                        Software de Usuario Final (EULA / SaaS)</strong> (en lo sucesivo, los <strong>&ldquo;Términos&rdquo;</strong>)
                        regula jurídicamente el acceso, descarga de interfaces, navegación, registro y utilización de la plataforma
                        informática denominada <strong>&ldquo;Sistema Gestor de Clubs&rdquo;</strong> (en lo sucesivo, la{' '}
                        <strong>&ldquo;Plataforma&rdquo;</strong> o el <strong>&ldquo;Software&rdquo;</strong>), cuya titularidad,
                        desarrollo y administración corresponde a <strong>TT-B051</strong> (en lo sucesivo, el{' '}
                        <strong>&ldquo;Titular&rdquo;</strong>), en vinculación con la comunidad de la Escuela Superior de Cómputo
                        (ESCOM) del Instituto Politécnico Nacional (IPN).
                    </p>
                    <p>
                        El presente instrumento se encuentra fundamentado en las disposiciones aplicables del <strong>Código Civil
                        Federal (CCF)</strong>, el <strong>Código de Comercio (CCom)</strong> en materia de contratación por medios
                        electrónicos y mensajes de datos, la <strong>Ley Federal del Derecho de Autor (LFDA)</strong>, la{' '}
                        <strong>Ley Federal de Protección a la Propiedad Industrial (LFPPI)</strong> y el artículo 76 Bis de la{' '}
                        <strong>Ley Federal de Protección al Consumidor (LFPC)</strong>.
                    </p>
                </div>

                <section>
                    <h2>1. Aceptación de los Términos y Capacidad Legal</h2>
                    <p>
                        De conformidad con lo dispuesto por los artículos 1794, 1796, 1803 fracción I y 1834 Bis del Código Civil
                        Federal, así como los artículos 80, 89, 89 Bis, 90 y 90 Bis del Código de Comercio vigentes en los Estados
                        Unidos Mexicanos, el acceso a la Plataforma, la creación de una cuenta de usuario, la validación mediante
                        código criptográfico de un solo uso (OTP) o el clic en la casilla de aceptación electrónica constituyen la
                        manifestación expresa, libre, informada e inequívoca de la voluntad de la persona usuaria (en lo sucesivo,
                        el <strong>&ldquo;Usuario&rdquo;</strong>) de obligarse en todos sus términos conforme al presente contrato,
                        surtir plenos efectos jurídicos y tener la misma validez probatoria que la firma autógrafa estampada en
                        documento físico.
                    </p>
                    <p>
                        El Usuario declara bajo protesta de decir verdad contar con plena capacidad legal de goce y de ejercicio para
                        contratar y obligarse conforme a la legislación mexicana, así como ser miembro activo o autorizado de la
                        comunidad institucional con acceso legítimo a una cuenta de correo electrónico institucional autorizada
                        (<code>@alumno.ipn.mx</code> o <code>@ipn.mx</code>). En caso de que el Usuario sea menor de dieciocho (18)
                        años de edad pero sea estudiante regular debidamente inscrito, manifiesta que el registro y utilización de la
                        Plataforma se realiza con el conocimiento, supervisión y autorización expresa de quienes ejercen sobre él la
                        patria potestad o tutela legal, quienes asumen solidariamente las responsabilidades derivadas de los
                        presentes Términos. Si el Usuario no está de acuerdo de manera total e incondicional con estos Términos,
                        deberá abstenerse inmediatamente de registrarse, acceder o utilizar el Software.
                    </p>
                </section>

                <section>
                    <h2>2. Otorgamiento de Licencia de Uso de Software</h2>
                    <p>
                        Sujeto al cumplimiento estricto e ininterrumpido del presente instrumento, el Titular (<strong>TT-B051</strong>)
                        otorga en este acto al Usuario una <strong>licencia de uso de software en modalidad SaaS (<em>Software as a
                        Service</em>) de carácter estrictamente limitada, personal, revocable, no exclusiva, intransferible y no
                        sublicenciable</strong>, exclusivamente para acceder y utilizar las funcionalidades del{' '}
                        <strong>Sistema Gestor de Clubs</strong> conforme al rol asignado dentro de la Plataforma (Administrador,
                        Profesor Encargado, Alumno Representante o Alumno).
                    </p>
                    <p>
                        En términos de los artículos 101, 102, 103, 104 y 106 de la Ley Federal del Derecho de Autor, queda
                        estricta y expresamente prohibido al Usuario, por sí o por interpósita persona:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>a)</strong> Copiar, reproducir, distribuir, transformar, traducir, adaptar, comunicar
                            públicamente o crear obras derivadas a partir del Software, sus interfaces gráficas (UI/UX), su
                            arquitectura o su documentación técnica.
                        </li>
                        <li>
                            <strong>b)</strong> Realizar actos de ingeniería inversa (<em>reverse engineering</em>), descompilación,
                            desensamblaje, desencriptación o cualquier intento de descubrir o extraer el código fuente, algoritmos,
                            esquemas de base de datos, endpoints de la API REST o protocolos de WebSockets del Software.
                        </li>
                        <li>
                            <strong>c)</strong> Ejecutar herramientas automatizadas de extracción masiva de datos (<em>web scraping</em>,
                            <em> crawling</em>, <em>spiders</em>, bots o scripts no autorizados) sobre los directorios de clubes,
                            listas de asistencia, fichas médicas o directorios de emergencia alojados en la Plataforma.
                        </li>
                        <li>
                            <strong>d)</strong> Arrendar, vender, ceder, sublicenciar, gravar o explotar comercialmente el acceso a
                            la Plataforma o cualquiera de sus módulos en favor de terceros.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>3. Cuentas de Usuario, Autenticación y Seguridad de Credenciales</h2>
                    <p>
                        Para utilizar los servicios del <strong>Sistema Gestor de Clubs</strong>, el Usuario deberá completar el
                        formulario de registro proporcionando información veraz, exacta, vigente y completa, incluyendo su correo
                        electrónico institucional, número de boleta o número de empleado, Número de Seguridad Social (NSS) cuando
                        corresponda a su rol y datos de emergencia, así como verificar su identidad mediante el código temporal de
                        verificación (OTP) remitido a su correo institucional.
                    </p>
                    <p>
                        La contraseña de acceso y los tokens de sesión (JWT) son de uso estrictamente personal, confidencial e
                        intransferible. El Usuario es el <strong>único y absoluto responsable legal y administrativo</strong> de:
                        (i) Mantener la confidencialidad de sus credenciales de autenticación; (ii) Cerrar su sesión al finalizar el
                        uso en equipos compartidos o públicos; (iii) Toda acción, publicación de avisos, creación de eventos,
                        confirmación de asistencia o emisión de mensajes en los canales de chat que se ejecute desde su cuenta
                        autenticada; y (iv) Notificar de inmediato al Titular al correo{' '}
                        <strong>mgardunos1700@alumno.ipn.mx</strong> cualquier vulneración de seguridad, extravío de dispositivos o
                        uso no autorizado de su cuenta. El Titular implementa bloqueos automatizados temporales ante múltiples
                        intentos fallidos de inicio de sesión para proteger la integridad de las cuentas, sin que ello genere
                        responsabilidad alguna frente al Usuario por la interrupción temporal de su acceso.
                    </p>
                </section>

                <section>
                    <h2>4. Condiciones Económicas, Gratuidad del Servicio, Facturación (CFDI) y Reembolsos</h2>
                    <p>
                        <strong>4.1. Modalidad Actual de Gratuidad Institucional:</strong> El acceso y uso de la licencia del
                        <strong> Sistema Gestor de Clubs</strong> bajo la titularidad de <strong>TT-B051</strong> se proporciona
                        actualmente bajo un esquema institucional <strong>sin costo económico directo, suscripción onerosa ni cobro
                        de regalías</strong> para los alumnos, profesores y administradores autorizados, por lo que no se generan
                        cargos recurrentes automatizados, retenciones de Impuesto al Valor Agregado (IVA) ni obligación de expedir
                        Comprobantes Fiscales Digitales por Internet (CFDI) por el mero uso de la Plataforma digital.
                    </p>
                    <p>
                        <strong>4.2. Reglas Aplicables en Caso de Servicios Adicionales, Cuotas Externas o Futuros Módulos de
                        Suscripción (Art. 76 Bis LFPC):</strong> En el supuesto de que algún club deportivo o cultural gestione
                        aportaciones para uniformes, arbitrajes, torneos externos o materiales, el Usuario reconoce que dichas
                        operaciones son ajenas al motor tecnológico de la Plataforma, la cual no procesa pagos en línea. En caso de
                        que el Titular incorpore en el futuro planes o licencias de pago, éstos serán informados de forma previa,
                        clara y desglosada en moneda nacional (Pesos Mexicanos - MXN) incluyendo el Impuesto al Valor Agregado (IVA)
                        correspondiente, otorgando derecho a la emisión del CFDI respectivo conforme al Código Fiscal de la
                        Federación y sujetándose a las políticas de cancelación y no reembolso por periodos devengados que se
                        publiquen antes de la contratación expresa del Usuario.
                    </p>
                </section>

                <section>
                    <h2>5. Obligaciones del Usuario y Conductas Estrictamente Prohibidas</h2>
                    <p>
                        El Usuario se obliga a utilizar el <strong>Sistema Gestor de Clubs</strong> en estricto apego a la ley, a la
                        moral, a las buenas costumbres, al orden público y a la normatividad institucional del Instituto Politécnico
                        Nacional. Queda terminantemente prohibido al Usuario incurrir en cualquiera de las siguientes conductas:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>a)</strong> Registrar datos falsos, apócrifos o inexactos en su perfil académico, Número de
                            Seguridad Social (NSS), ficha médica (tipo de sangre o condiciones preexistentes) o contactos de
                            emergencia, o suplantar la identidad de otro alumno, docente o administrador.
                        </li>
                        <li>
                            <strong>b)</strong> Utilizar las salas de chat en tiempo real (chat del club, canal de encargados o
                            canal de directivos) o el sistema de publicación de avisos y eventos para difundir contenido ilícito,
                            difamatorio, calumnioso, obsceno, pornográfico, discriminatorio, de discurso de odio, acoso
                            (<em>cyberbullying</em>), violencia de género, amenazas, propaganda política o spam comercial.
                        </li>
                        <li>
                            <strong>c)</strong> Introducir, cargar o transmitir virus informáticos, troyanos, gusanos, bombas
                            lógicas, código malicioso (<em>malware</em>, <em>ransomware</em>, <em>spyware</em>), inyecciones SQL
                            (<em>SQL Injection</em>), secuencias de comandos en sitios cruzados (<em>XSS</em>) o cualquier archivo
                            que comprometa la disponibilidad o integridad del servidor y su base de datos.
                        </li>
                        <li>
                            <strong>d)</strong> Ejecutar ataques de denegación de servicio (<em>DoS / DDoS</em>), saturar
                            deliberadamente el límite de peticiones (<em>Rate Limiting</em>) de la API o intentar vulnerar los
                            controles de autorización por roles (RBAC) para acceder a rutas administrativas o expedientes médicos de
                            clubes en los que no tenga facultades de encargado.
                        </li>
                        <li>
                            <strong>e)</strong> Divulgar a terceros ajenos los datos personales o sensibles contenidos en el
                            Directorio de Emergencias de un club cuando el Usuario tenga rol de Profesor Encargado o Alumno
                            Representante, obligándose a guardar absoluto secreto y confidencialidad respecto de dicha información.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>6. Propiedad Intelectual e Industrial</h2>
                    <p>
                        En términos de la <strong>Ley Federal del Derecho de Autor (LFDA)</strong> y la <strong>Ley Federal de
                        Protección a la Propiedad Industrial (LFPPI)</strong>, todos los derechos patrimoniales y morales de propiedad
                        intelectual e industrial sobre el <strong>Sistema Gestor de Clubs</strong>, incluyendo de manera enunciativa
                        más no limitativa: el código fuente (frontend en React y backend en Node.js/Express), código objeto,
                        estructuras y esquemas relacionales de bases de datos SQL, diseño visual, hojas de estilo, interfaces de
                        usuario, arquitectura de comunicación por sockets, documentación, manuales, nombres comerciales, avisos
                        comerciales, logotipos y signos distintivos asociados al proyecto <strong>TT-B051</strong> y a las
                        instituciones académicas participantes, son propiedad exclusiva y reservada de sus respectivos titulares.
                    </p>
                    <p>
                        Ninguna disposición de los presentes Términos deberá interpretarse como una cesión, transmisión de propiedad
                        o concesión de licencia implícita sobre dichos activos intangibles. La infracción a cualquiera de los
                        derechos de propiedad intelectual o industrial dará lugar al ejercicio inmediato de las acciones civiles,
                        administrativas y penales previstas en la legislación federal mexicana.
                    </p>
                </section>

                <section>
                    <h2>7. Disponibilidad del Servicio (SLA) y Exclusión de Garantías</h2>
                    <p>
                        El Usuario reconoce y acepta expresamente que el Software y todos sus módulos se ponen a su disposición bajo
                        la modalidad jurídica <strong>&ldquo;TAL CUAL&rdquo; (<em>&ldquo;AS IS&rdquo;</em>) y &ldquo;SEGÚN
                        DISPONIBILIDAD&rdquo; (<em>&ldquo;AS AVAILABLE&rdquo;</em>)</strong>, sin garantías de ninguna índole, ya
                        sean expresas, implícitas o estatutarias, incluyendo sin limitar garantías de disponibilidad ininterrumpida,
                        ausencia absoluta de errores (<em>bugs</em>), idoneidad para un propósito particular o compatibilidad con
                        todos los dispositivos de hardware o versiones de navegadores del mercado.
                    </p>
                    <p>
                        El Titular (<strong>TT-B051</strong>) no garantiza un Nivel de Acuerdo de Servicio (SLA) del cien por ciento
                        (100%) de tiempo de actividad y quedará plenamente eximido de cualquier responsabilidad derivada de: (i)
                        Ventanas programadas o emergentes de mantenimiento preventivo, correctivo o actualización de versiones de la
                        Plataforma; (ii) Interrupciones, caídas o latencia en servidores de terceros, proveedores de nube (como
                        Microsoft Azure), proveedores de despacho de correo SMTP o redes de telecomunicaciones; y (iii) Fallas en el
                        suministro eléctrico, configuración de firewall o conexión a internet del propio dispositivo del Usuario.
                    </p>
                </section>

                <section>
                    <h2>8. Limitación Estricta de Responsabilidad</h2>
                    <p>
                        Hasta el grado máximo permitido por la legislación aplicable en los Estados Unidos Mexicanos y en términos
                        del artículo 2104 y demás relativos del Código Civil Federal, el Titular (<strong>TT-B051</strong>), sus
                        desarrolladores, colaboradores académicos y asesores <strong>no serán responsables en ningún caso y bajo
                        ninguna teoría legal</strong> (responsabilidad contractual, extracontractual, objetiva o negligencia) frente
                        al Usuario ni frente a terceros por:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>a)</strong> Daños indirectos, incidentales, especiales, punitivos, consecuenciales, lucro
                            cesante, pérdida de oportunidades académicas o deportivas, o pérdida de datos o mensajes derivada del uso
                            o de la imposibilidad de uso de la Plataforma.
                        </li>
                        <li>
                            <strong>b)</strong> Lesiones físicas, accidentes deportivos, percances médicos, extravío de pertenencias
                            o daños personales ocurridos durante entrenamientos, partidos, viajes o eventos presenciales de los
                            clubes registrados en la Plataforma, toda vez que el <strong>Sistema Gestor de Clubs</strong> constituye
                            exclusivamente una herramienta informática de gestión administrativa y difusión, sin que el Titular del
                            Software supervise físicamente la ejecución de las actividades deportivas o culturales.
                        </li>
                        <li>
                            <strong>c)</strong> La inexactitud o falsedad de los datos médicos o de emergencia ingresados por los
                            propios Usuarios en sus perfiles.
                        </li>
                    </ul>
                    <p>
                        <strong>Tope Máximo de Responsabilidad Económica:</strong> En cualquier supuesto en que autoridad judicial
                        competente determinara mediante sentencia firme e inapelable la existencia de responsabilidad económica a
                        cargo del Titular, la responsabilidad total y acumulada de <strong>TT-B051</strong> frente al Usuario
                        reclamante estará estrictamente limitada y topada al monto efectivamente pagado por dicho Usuario al Titular
                        por concepto de licencia de uso del Software durante los <strong>tres (3) meses inmediatos anteriores</strong>{' '}
                        al hecho generador del reclamo (o bien a la cantidad simbólica equivalente a <strong>$100.00 M.N. - Cien
                        Pesos 00/100 Moneda Nacional</strong>, en virtud de la gratuidad del servicio).
                    </p>
                </section>

                <section>
                    <h2>9. Indemnización (Obligación de Sacar en Paz y a Salvo)</h2>
                    <p>
                        El Usuario se obliga expresamente a defender, indemnizar y <strong>sacar en paz y a salvo</strong> al Titular
                        (<strong>TT-B051</strong>), a sus integrantes, desarrolladores, directivos, asesores y a la institución
                        académica respecto de cualquier reclamación, demanda, denuncia, queja administrativa, procedimiento judicial,
                        multa, sanción, daño, perjuicio, pasivo, costo y gasto (incluyendo honorarios razonables de abogados y gastos
                        procesales) promovidos por cualquier tercero o autoridad que deriven directa o indirectamente de: (i) El
                        incumplimiento por parte del Usuario a cualquiera de las estipulaciones de los presentes Términos; (ii) El
                        uso ilícito, negligente o fraudulento de la Plataforma o de su cuenta de usuario; (iii) La publicación o
                        transmisión de mensajes, avisos o contenidos que vulneren derechos de terceros en las salas de chat o
                        tableros de la Plataforma; o (iv) El suministro de datos de terceros (como contactos de emergencia) sin el
                        consentimiento correspondiente.
                    </p>
                </section>

                <section>
                    <h2>10. Suspensión y Rescisión del Servicio</h2>
                    <p>
                        El Titular se reserva la facultad discrecional y el derecho pleno de <strong>suspender temporalmente,
                        restringir privilegios de rol o dar de baja y eliminar de forma definitiva e inmediata</strong> la cuenta de
                        cualquier Usuario, sin necesidad de declaración judicial previa y sin responsabilidad alguna para el Titular,
                        cuando detecte o tenga indicios razonables de que el Usuario: (i) Ha incumplido cualquiera de las cláusulas
                        de estos Términos o del Aviso de Privacidad; (ii) Ha proporcionado información falsa o suplantado identidad;
                        (iii) Ha realizado conductas hostiles, ofensivas o contrarias a la disciplina institucional en los chats o
                        actividades de los clubes; o (iv) Ha dejado de formar parte activa de la comunidad autorizada.
                    </p>
                    <p>
                        Por su parte, el Usuario podrá dar por terminada su relación jurídica en cualquier momento solicitando la
                        eliminación de su cuenta desde el módulo de <em>Configuración de Perfil</em> (siempre que no tenga a su cargo
                        la titularidad activa de un club sin previo relevo administrativo).
                    </p>
                </section>

                <section>
                    <h2>11. Modificaciones al Software y a los Términos y Condiciones</h2>
                    <p>
                        El Titular (<strong>TT-B051</strong>) se reserva el derecho exclusivo de actualizar, modificar, agregar,
                        restringir o descontinuar en cualquier momento módulos, vistas, endpoints o funcionalidades del{' '}
                        <strong>Sistema Gestor de Clubs</strong> con el fin de implementar mejoras tecnológicas, parches de seguridad
                        o adecuaciones normativas.
                    </p>
                    <p>
                        Asimismo, el Titular podrá modificar total o parcialmente los presentes Términos en cualquier tiempo. Cuando
                        se publique una nueva versión de los Términos a través del módulo administrativo de políticas legales, el
                        sistema registrará la nueva versión vigente y desplegará de forma obligatoria un aviso modal interactivo a
                        todos los Usuarios en su siguiente sesión para recabar su aceptación expresa como condición indispensable
                        para continuar utilizando la Plataforma.
                    </p>
                </section>

                <section>
                    <h2>12. Caso Fortuito o Fuerza Mayor</h2>
                    <p>
                        De conformidad con el artículo 2111 del Código Civil Federal, el Titular no será responsable por el retraso,
                        interrupción, pérdida de información o incumplimiento total o parcial de las funciones de la Plataforma
                        cuando ello obedezca a causas de <strong>caso fortuito o fuerza mayor</strong> fuera de su control razonable,
                        incluyendo de manera enunciativa más no limitativa: desastres naturales, sismos, incendios, inundaciones,
                        contingencias sanitarias o epidemias, huelgas, paros de labores o cierres de instalaciones académicas, fallas
                        masivas en las redes públicas de telecomunicaciones o de energía eléctrica, ciberataques globales de día cero
                        (<em>zero-day exploits</em>), actos de autoridad gubernamental o modificaciones legislativas imprevistas.
                    </p>
                </section>

                <section className="privacy-contact-section">
                    <p className="privacy-eyebrow">Cláusula Jurisdiccional y Contacto Oficial</p>
                    <h2>13. Legislación Aplicable y Jurisdicción Competente</h2>
                    <p>
                        Para la interpretación, cumplimiento, validez y ejecución forzosa del presente contrato de Términos y
                        Condiciones de Uso y Licencia de Software, las partes convienen expresamente en someterse a las{' '}
                        <strong>Leyes Federales vigentes en los Estados Unidos Mexicanos</strong> (en particular al Código Civil
                        Federal, Código de Comercio, Ley Federal del Derecho de Autor, Ley Federal de Protección a la Propiedad
                        Industrial y Ley Federal de Protección de Datos Personales en Posesión de los Particulares) y a la
                        jurisdicción y competencia exclusiva de los <strong>Tribunales competentes con residencia en la Ciudad de
                        México (CDMX)</strong>, renunciando expresa e irrevocablemente a cualquier otro fuero o jurisdicción que
                        pudiera corresponderles por razón de sus domicilios presentes o futuros, nacionalidad o por cualquier otra
                        causa.
                    </p>
                    <address className="privacy-contact">
                        <span><strong>Software / Plataforma:</strong> Sistema Gestor de Clubs</span>
                        <span><strong>Titular / Responsable Legal:</strong> TT-B051 (ESCOM - IPN)</span>
                        <span><strong>Correo Jurídico y Derechos ARCO:</strong> mgardunos1700@alumno.ipn.mx</span>
                    </address>
                </section>

                <footer className="privacy-footer">
                    <span>Versión {versionActiva} · Última actualización: {fechaPublicacion} · Sistema Gestor de Clubs</span>
                    <span>TT-B051 · ESCOM IPN</span>
                </footer>
            </article>
        </main>
    );
};

export default TerminosCondicionesPage;
