import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './css/AvisoPrivacidad.css';

const AvisoPrivacidadPage = () => {
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
        : '7 de septiembre de 2026';

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
                        <h1>Aviso de Privacidad Integral</h1>
                        <p className="privacy-version">
                            Versión {versionActiva} · Fecha de publicación y vigencia: {fechaPublicacion}
                        </p>
                    </div>
                    <button type="button" className="privacy-close" onClick={volverAtras}>
                        ← Volver
                    </button>
                </header>

                <div className="privacy-intro">
                    <p>
                        En estricto cumplimiento a lo dispuesto por los artículos 1, 2, 3 fracción I, 6, 8, 9, 12, 14, 15,
                        16, 17, 18, 22, 28, 36 y 37 de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los
                        Particulares (LFPDPPP)</strong>, los artículos 14, 23, 24, 26, 30, 40, 41, 42 y demás relativos y aplicables
                        de su <strong>Reglamento (RLFPDPPP)</strong>, así como los <strong>Lineamientos del Aviso de Privacidad</strong> publicados
                        en el Diario Oficial de la Federación, se pone a disposición de toda persona usuaria (en lo sucesivo,
                        el <strong>&ldquo;Titular&rdquo;</strong>) el presente <strong>Aviso de Privacidad Integral</strong> que rige la obtención,
                        uso, divulgación, almacenamiento, acceso, manejo, aprovechamiento, transferencia y disposición de datos
                        personales dentro de la plataforma tecnológica denominada <strong>&ldquo;Sistema Gestor de Clubs&rdquo;</strong>.
                    </p>
                    <p>
                        Se exhorta al Titular a leer detenidamente e íntegramente el presente instrumento jurídico previo al
                        registro de su cuenta de usuario, suministro de información personal o utilización de cualquiera de los
                        módulos que integran la plataforma.
                    </p>
                </div>

                <section>
                    <h2>1. Identidad y Domicilio del Responsable del Tratamiento</h2>
                    <p>
                        El Responsable del tratamiento, resguardo y protección de los datos personales recabados a través de la
                        plataforma digital denominada <strong>&ldquo;Sistema Gestor de Clubs&rdquo;</strong> es el equipo titular y
                        administrador del proyecto identificado bajo el registro institucional <strong>TT-B051</strong> (en lo sucesivo,
                        el <strong>&ldquo;Responsable&rdquo;</strong>), desarrollado en el marco académico y tecnológico de la
                        <strong> Escuela Superior de Cómputo (ESCOM) del Instituto Politécnico Nacional (IPN)</strong>, con domicilio
                        convencional para oír y recibir toda clase de notificaciones vinculadas con la materia de protección de
                        datos personales en la Unidad Profesional &ldquo;Adolfo López Mateos&rdquo;, Av. Juan de Dios Bátiz s/n,
                        esquina Av. Miguel Othón de Mendizábal, Colonia Lindavista, Demarcación Territorial Gustavo A. Madero,
                        Código Postal 07738, en la Ciudad de México, México.
                    </p>
                    <p>
                        Para cualquier asunto relacionado con el presente Aviso de Privacidad, el ejercicio de Derechos ARCO,
                        revocación del consentimiento o limitación del tratamiento de información personal, el Responsable ha
                        habilitado como canal oficial de atención jurídica y de privacidad la dirección de correo electrónico:{' '}
                        <strong>mgardunos1700@alumno.ipn.mx</strong>.
                    </p>
                </section>

                <section>
                    <h2>2. Datos Personales Sometidos a Tratamiento y Categorización</h2>
                    <p>
                        Para el cumplimiento de las finalidades previstas en el presente Aviso de Privacidad, el Responsable
                        recabará datos personales del Titular de manera directa cuando éste los ingresa voluntariamente a través
                        de los formularios electrónicos de registro, configuración de perfil, inscripción a clubes, confirmación
                        de asistencia a eventos o canales de comunicación interna de la plataforma, así como de manera automática
                        mediante los registros técnicos de sesión. Las categorías de datos personales sujetas a tratamiento son
                        las siguientes:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>a) Datos de Identificación y Contacto:</strong> Nombre(s), apellido paterno, apellido materno y
                            dirección de correo electrónico institucional (dominios autorizados <code>@alumno.ipn.mx</code> y{' '}
                            <code>@ipn.mx</code>).
                        </li>
                        <li>
                            <strong>b) Datos Académicos, Institucionales y Administrativos:</strong> Número de boleta estudiantil
                            (para alumnos), programa académico o carrera cursada, número de empleado institucional (para personal
                            docente o asesores), rol asignado dentro de la plataforma (Administrador, Profesor, Alumno Encargado /
                            Representante o Alumno miembro), historial de afiliación a clubes deportivos o culturales, estatus de
                            inscripción y bitácoras de confirmación de asistencia a eventos.
                        </li>
                        <li>
                            <strong>c) Datos de Afiliación a Seguridad Social y Prevención de Accidentes:</strong> Número de
                            Seguridad Social (NSS) vigente y datos de terceros designados como contactos de emergencia (nombre
                            completo del contacto de emergencia, relación o parentesco con el Titular y teléfono de localización
                            inmediata). Al proporcionar datos de terceros para fines de contacto de emergencia, el Titular declara
                            bajo protesta de decir verdad que cuenta con la autorización previa de dichas personas para suministrar
                            sus datos de localización exclusivamente para casos de contingencia o urgencia médica.
                        </li>
                        <li>
                            <strong>d) Datos Técnicos, de Autenticación y Trazabilidad Electrónica:</strong> Contraseña de acceso
                            (almacenada exclusivamente mediante funciones criptográficas irreversibles de <em>hashing</em>),
                            códigos temporales de verificación de un solo uso (OTP) con vigencia determinada, dirección IP de
                            conexión, identificadores de sesión mediante JSON Web Tokens (JWT), fecha y hora de aceptación del
                            Aviso de Privacidad y de los Términos y Condiciones, versión aceptada y mensajes transmitidos en las
                            salas de chat institucionales de los clubes.
                        </li>
                    </ul>
                    <p>
                        <strong>Declaración sobre Datos Patrimoniales o Financieros:</strong> El Responsable hace constar
                        expresamente que el <strong>Sistema Gestor de Clubs NO recaba, almacena ni procesa datos personales
                        patrimoniales ni financieros</strong> tales como números de cuentas bancarias, tarjetas de crédito o débito,
                        CLABE interbancaria, códigos CVV ni información fiscal o tributaria sensible.
                    </p>
                    <p>
                        <strong>Tratamiento de Datos Personales Sensibles (Datos de Salud):</strong> En términos de los artículos
                        3 fracción VI y 9 de la LFPDPPP, se informa expresamente al Titular que la plataforma <strong>SÍ recaba y
                        trata datos personales sensibles relativos al estado de salud presente y pasado</strong>, consistentes
                        específicamente en: <strong>(i) Tipo de sangre (grupo sanguíneo y factor Rh)</strong> y <strong>(ii) Condiciones
                        médicas preexistentes, alergias, lesiones previas, padecimientos crónicos o restricciones médicas</strong>{' '}
                        que el Titular registre en su ficha médica de perfil. El tratamiento de estos datos sensibles se realiza
                        bajo estrictas medidas de seguridad y confidencialidad, con el único propósito de salvaguardar la vida,
                        integridad física y salud del Titular durante el desarrollo de entrenamientos, competencias, prácticas y
                        eventos deportivos o culturales, facilitando su consulta inmediata al personal encargado del club y a los
                        servicios médicos o de emergencia en caso de presentarse un incidente, lesión o urgencia médica.
                    </p>
                </section>

                <section>
                    <h2>3. Finalidades del Tratamiento de los Datos Personales</h2>
                    <p>
                        Los datos personales recabados por el Responsable serán utilizados estrictamente para las siguientes
                        finalidades, divididas conforme a la legislación aplicable en finalidades primarias y secundarias:
                    </p>
                    <p>
                        <strong>I. Finalidades Primarias (Necesarias para la existencia, mantenimiento y cumplimiento de la relación
                        jurídica y operativa entre el Responsable y el Titular):</strong>
                    </p>
                    <ul className="privacy-list">
                        <li>
                            Verificar y autenticar la identidad del Titular y su pertenencia vigente a la comunidad estudiantil o
                            docente mediante el envío de códigos criptográficos de verificación (OTP) a su correo electrónico
                            institucional.
                        </li>
                        <li>
                            Crear, administrar, actualizar y resguardar el expediente digital y perfil de usuario dentro del
                            <strong> Sistema Gestor de Clubs</strong>, asignando los privilegios de control de acceso basados en
                            roles (RBAC).
                        </li>
                        <li>
                            Gestionar las solicitudes de creación de clubes, validación de las 20 firmas mínimas requeridas,
                            inscripción mediante código de unión, permanencia, baja o asignación de cargos de representación
                            dentro de los clubes deportivos y culturales registrados en la plataforma.
                        </li>
                        <li>
                            Integrar y mantener disponible el Directorio de Emergencias y Ficha Médica de cada club para que los
                            Profesores Encargados, Alumnos Representantes y Administradores puedan actuar de inmediato ante
                            accidentes, lesiones o urgencias médicas durante entrenamientos, torneos o actividades presenciales,
                            así como localizar a los contactos de emergencia designados por el Titular.
                        </li>
                        <li>
                            Administrar el calendario institucional y particular de eventos, entrenamientos y convocatorias, así
                            como llevar el registro nominal de confirmación y lista de asistentes a los eventos.
                        </li>
                        <li>
                            Habilitar la comunicación interna mediante la publicación de avisos oficiales (globales y por club) y
                            la operación de canales de mensajería en tiempo real (WebSockets / salas de chat de clubes, encargados
                            y directivos).
                        </li>
                        <li>
                            Preservar la seguridad informática de la plataforma, prevenir accesos no autorizados, aplicar bloqueos
                            preventivos por intentos fallidos de autenticación y conservar la trazabilidad probatoria sobre la
                            aceptación vigente del Aviso de Privacidad y Términos y Condiciones.
                        </li>
                    </ul>
                    <p>
                        <strong>II. Finalidades Secundarias (No necesarias para la relación jurídica principal, pero que permiten
                        mejorar la calidad operativa del sistema):</strong>
                    </p>
                    <ul className="privacy-list">
                        <li>
                            Elaborar reportes estadísticos, métricas de participación estudiantil e indicadores agregados o
                            disociados sobre el desempeño e impacto de las actividades deportivas y culturales.
                        </li>
                        <li>
                            Realizar evaluaciones técnicas de usabilidad, rendimiento de la arquitectura de software y mejora
                            continua de las funcionalidades del proyecto <strong>TT-B051</strong>.
                        </li>
                        <li>
                            Enviar boletines informativos o invitaciones generales sobre nuevas actividades extracurriculares,
                            talleres o eventos comunitarios no obligatorios.
                        </li>
                    </ul>
                    <p>
                        <strong>Mecanismo para manifestar la negativa al tratamiento para Finalidades Secundarias:</strong> En caso
                        de que el Titular no desee que sus datos personales sean tratados para alguna o todas las Finalidades
                        Secundarias antes señaladas, podrá manifestar su negativa desde el momento de su registro o en cualquier
                        tiempo posterior enviando un correo electrónico a <strong>mgardunos1700@alumno.ipn.mx</strong> con el asunto{' '}
                        <em>&ldquo;Negativa a Finalidades Secundarias - Sistema Gestor de Clubs&rdquo;</em>, indicando su nombre
                        completo y correo institucional registrado. La negativa para el uso de sus datos personales para estas
                        finalidades secundarias no podrá ser un motivo para que se le niegue el acceso, registro o uso de las
                        funciones principales de la plataforma.
                    </p>
                </section>

                <section>
                    <h2>4. Transferencia de Datos Personales y Encargados del Tratamiento</h2>
                    <p>
                        El Responsable informa al Titular que sus datos personales <strong>no serán vendidos, alquilados, cedidos
                        ni comercializados</strong> a terceros ajenos a las finalidades establecidas en el presente instrumento.
                        Sin embargo, para la correcta operación tecnológica del <strong>Sistema Gestor de Clubs</strong>, el
                        Responsable se apoya en proveedores de infraestructura de cómputo en la nube, alojamiento de bases de datos
                        relacionales (incluyendo servicios de nube como Microsoft Azure o servidores designados por el proyecto) y
                        servicios de transporte de correo electrónico transaccional (protocolos SMTP para el despacho de códigos OTP
                        y alertas de seguridad), quienes actúan en calidad de <strong>Encargados del tratamiento</strong> por cuenta
                        y orden del Responsable conforme a los artículos 49, 50 y 51 del Reglamento de la LFPDPPP, encontrándose
                        sujetos a obligaciones estrictas de confidencialidad y seguridad técnica.
                    </p>
                    <p>
                        Asimismo, el Responsable podrá realizar transferencias nacionales de datos personales sin requerir el
                        consentimiento del Titular únicamente en los supuestos de excepción expresamente previstos en el
                        <strong> artículo 37 de la LFPDPPP</strong>, los cuales comprenden de manera enunciativa:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            Cuando la transferencia esté prevista en una Ley o Tratado en los que México sea parte.
                        </li>
                        <li>
                            Cuando la transferencia sea necesaria para la prevención o el diagnóstico médico, la prestación de
                            asistencia sanitaria, tratamiento médico o la gestión de servicios sanitarios y de urgencias médicas
                            en favor del Titular durante el desarrollo de actividades deportivas o culturales.
                        </li>
                        <li>
                            Cuando la transferencia sea legalmente exigida para la salvaguarda de un interés público, o para la
                            procuración o administración de justicia por requerimiento fundado y motivado de autoridad competente.
                        </li>
                        <li>
                            Cuando la transferencia sea precisa para el reconocimiento, ejercicio o defensa de un derecho en un
                            proceso judicial o administrativo, o para el mantenimiento o cumplimiento de la relación jurídica entre
                            el Responsable y el Titular.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>5. Medios y Procedimiento para Ejercer los Derechos ARCO y Revocación del Consentimiento</h2>
                    <p>
                        El Titular, por sí mismo o a través de su representante legal debidamente acreditado, tiene derecho en todo
                        momento a ejercer sus <strong>Derechos ARCO</strong>: <strong>Acceder</strong> a sus datos personales que obren
                        en posesión del Responsable y conocer los detalles de su tratamiento; <strong>Rectificarlos</strong> en caso de
                        ser inexactos, incompletos o estar desactualizados; <strong>Cancelarlos</strong> cuando considere que no se
                        requieren para alguna de las finalidades señaladas en el presente Aviso de Privacidad o haya finalizado la
                        relación con la plataforma; y <strong>Oponerse</strong> al tratamiento de los mismos para fines específicos,
                        así como a <strong>revocar el consentimiento</strong> que haya otorgado para su tratamiento, conforme a lo
                        previsto en los artículos 21, 22, 28, 29, 30, 32 y 34 de la LFPDPPP.
                    </p>
                    <p>
                        Adicionalmente a las herramientas de edición directa y eliminación de cuenta disponibles en el módulo de
                        <em> Configuración de Perfil</em> de la plataforma, el procedimiento formal para el ejercicio de los Derechos
                        ARCO o la revocación del consentimiento se sujetará a las siguientes reglas:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>1. Presentación de la Solicitud:</strong> El Titular deberá enviar una solicitud por escrito en
                            formato libre al correo electrónico oficial <strong>mgardunos1700@alumno.ipn.mx</strong>.
                        </li>
                        <li>
                            <strong>2. Requisitos Legales de la Solicitud (Art. 29 LFPDPPP):</strong> La comunicación deberá contener
                            y acompañar obligatoriamente: (i) El nombre completo del Titular y su correo electrónico institucional u
                            otro medio para comunicarle la respuesta; (ii) Copia digitalizada de un documento oficial que acredite la
                            identidad del Titular (credencial institucional vigente, INE o pasaporte) o, en su caso, instrumento que
                            acredite la personalidad y facultades de su representante legal; (iii) La descripción clara y precisa de
                            los datos personales respecto de los que se busca ejercer alguno de los Derechos ARCO o la revocación del
                            consentimiento; (iv) Cualquier otro elemento o documento que facilite la localización de los datos
                            personales (como número de boleta o número de empleado); y (v) En el caso de solicitudes de
                            <em> Rectificación</em>, el Titular deberá indicar las modificaciones a realizarse y aportar la
                            documentación que sustente su petición.
                        </li>
                        <li>
                            <strong>3. Plazos Legales de Respuesta y Ejecución (Art. 32 LFPDPPP):</strong> Una vez recibida la
                            solicitud completa, el Responsable acusará recibo y contará con un plazo máximo de <strong>veinte (20)
                            días hábiles</strong>, contados desde la fecha en que se recibió la solicitud, para comunicar al Titular la
                            determinación adoptada. Si la solicitud resulta procedente, se hará efectiva la determinación dentro de
                            los <strong>quince (15) días hábiles</strong> siguientes a la fecha en que se comunique la respuesta. En
                            caso de que la información proporcionada en la solicitud sea insuficiente o errónea, el Responsable podrá
                            requerir al Titular, por una sola vez y dentro de los cinco (5) días hábiles siguientes a la recepción,
                            que aporte los elementos necesarios para dar trámite a la misma, contando el Titular con diez (10) días
                            hábiles para desahogar el requerimiento.
                        </li>
                    </ul>
                    <p>
                        El Titular reconoce que la revocación del consentimiento o la cancelación de los datos personales que
                        resulten indispensables para las Finalidades Primarias implicará la imposibilidad técnica y jurídica de
                        continuar prestando el servicio y conlleva la baja de su cuenta en la plataforma, sin efectos retroactivos
                        respecto de tratamientos lícitos previos.
                    </p>
                </section>

                <section>
                    <h2>6. Opciones y Medios para Limitar el Uso o Divulgación de los Datos Personales</h2>
                    <p>
                        Con el objeto de que el Titular pueda limitar el uso y divulgación de su información personal adicionalmente
                        al ejercicio de los Derechos ARCO, el Responsable pone a su disposición los siguientes mecanismos:
                    </p>
                    <ul className="privacy-list">
                        <li>
                            <strong>Inscripción en el Listado de Exclusión Interno:</strong> El Titular podrá solicitar su registro
                            en el listado interno de exclusión de comunicaciones no esenciales del <strong>Sistema Gestor de Clubs</strong>{' '}
                            enviando un mensaje al correo <strong>mgardunos1700@alumno.ipn.mx</strong>, con lo cual sus datos dejarán
                            de emplearse para cualquier finalidad informativa secundaria.
                        </li>
                        <li>
                            <strong>Autogestión desde el Panel de Perfil:</strong> El Titular puede actualizar en cualquier momento
                            sus datos de contacto de emergencia y su ficha médica, o bien ejecutar el protocolo de supresión de
                            cuenta cuando no mantenga obligaciones administrativas pendientes como encargado de club.
                        </li>
                        <li>
                            <strong>Registros Públicos de Consumidores (REPEP):</strong> No obstante que el <strong>Sistema Gestor de
                            Clubs</strong> no realiza actividades de mercadotecnia comercial ni telemarketing, se informa al Titular
                            que existe el Registro Público para Evitar Publicidad (REPEP) administrado por la Procuraduría Federal del
                            Consumidor (PROFECO), cuyo portal electrónico es consultable en <code>https://repep.profeco.gob.mx/</code>.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2>7. Uso de Tecnologías de Rastreo, Almacenamiento Local y Sesiones Electrónicas</h2>
                    <p>
                        Se informa al Titular que la aplicación web del <strong>Sistema Gestor de Clubs</strong> utiliza tecnologías
                        de almacenamiento local en el navegador (<code>localStorage</code> y <code>sessionStorage</code>), cabeceras
                        de autenticación portadoras de <strong>JSON Web Tokens (JWT)</strong> y conexiones bidireccionales persistentes
                        mediante <strong>WebSockets (Socket.IO)</strong> con el propósito exclusivo de mantener activa la sesión
                        autenticada del usuario, validar sus permisos de rol en cada petición al servidor, sincronizar en tiempo real
                        los mensajes de chat y avisos globales, y verificar que el usuario haya aceptado la versión vigente de las
                        políticas legales.
                    </p>
                    <p>
                        A través de estas tecnologías técnicas se recaban datos de conexión consistentes en el identificador cifrado
                        de sesión, rol de usuario, dirección IP de origen, tipo de navegador y marcas de tiempo de actividad. La
                        plataforma <strong>NO utiliza cookies publicitarias de terceros, Web Beacons de seguimiento comercial ni
                        píxeles de perfilamiento mercadológico</strong>. El Titular puede eliminar o bloquear el almacenamiento local
                        y las cookies directamente desde el menú de configuración de privacidad y seguridad de su navegador web (Google
                        Chrome, Mozilla Firefox, Microsoft Edge, Safari u homólogos); sin embargo, se advierte que deshabilitar el
                        almacenamiento local impedirá el mantenimiento de la sesión autenticada y el funcionamiento de los módulos
                        protegidos del sistema.
                    </p>
                </section>

                <section>
                    <h2>8. Procedimiento de Notificación de Cambios al Aviso de Privacidad</h2>
                    <p>
                        El presente Aviso de Privacidad podrá sufrir modificaciones, cambios o actualizaciones derivadas de nuevos
                        requerimientos legales o regulatorios en los Estados Unidos Mexicanos, mejoras en la arquitectura de seguridad
                        de la plataforma, incorporación de nuevos módulos funcionales o cambios en las necesidades operativas del
                        proyecto <strong>TT-B051</strong>.
                    </p>
                    <p>
                        Cualquier modificación sustancial al presente Aviso de Privacidad será notificada al Titular a través de
                        alguno o varios de los siguientes medios oficiales: (i) Publicación permanente de la versión actualizada en la
                        sección pública <code>/aviso-privacidad</code> de la plataforma, indicando el número de versión y fecha de
                        entrada en vigor; y (ii) Despliegue automático de una ventana modal de notificación y recabo de nueva
                        aceptación obligatoria al momento en que el Titular inicie sesión o interactúe con el sistema, registrándose
                        en la base de datos la trazabilidad de la nueva versión aceptada.
                    </p>
                </section>

                <section className="privacy-contact-section">
                    <p className="privacy-eyebrow">Perfeccionamiento Jurídico</p>
                    <h2>9. Cláusula de Consentimiento Expreso por Medios Electrónicos</h2>
                    <p>
                        De conformidad con lo establecido en los artículos 8 y 9 de la Ley Federal de Protección de Datos Personales
                        en Posesión de los Particulares, en relación con los artículos 1803 y 1834 Bis del Código Civil Federal y los
                        artículos 89 y 89 Bis del Código de Comercio, el Titular manifiesta que, al marcar la casilla electrónica de
                        aceptación durante su registro de cuenta o en el modal de actualización de políticas y continuar utilizando el
                        <strong> Sistema Gestor de Clubs</strong>, <strong>reconoce haber leído íntegramente el presente Aviso de
                        Privacidad Integral y otorga su consentimiento expreso e inequívoco</strong> para que sus datos personales,
                        incluyendo los <strong>datos personales sensibles de salud</strong> descritos en el numeral 2, sean tratados
                        conforme a los términos, condiciones y medidas de seguridad aquí establecidos.
                    </p>
                    <address className="privacy-contact">
                        <span><strong>Titular / Responsable Legal:</strong> Proyecto TT-B051 (ESCOM - IPN)</span>
                        <span><strong>Plataforma:</strong> Sistema Gestor de Clubs</span>
                        <span><strong>Contacto y Derechos ARCO:</strong> mgardunos1700@alumno.ipn.mx</span>
                    </address>
                </section>

                <footer className="privacy-footer">
                    <span>Versión {versionActiva} · Última actualización: {fechaPublicacion}</span>
                    <span>TT-B051 · Sistema Gestor de Clubs</span>
                </footer>
            </article>
        </main>
    );
};

export default AvisoPrivacidadPage;
