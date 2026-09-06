// src/services/emailService.js
const nodemailer = require('nodemailer');

// Configuración del transporte. 
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarCodigoVerificacion = async (destinatario, codigo) => {
    const mailOptions = {
        from: `"Sistema TT - Verificación" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Código de Verificación de Cuenta',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #6C1D45; text-align: center;">Verifica tu Cuenta</h2>
                <p>Hola, para completar el registro y verificar que eres miembro de la comunidad, ingresa el siguiente código de un solo uso:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10312B; background-color: #f2f2f2; padding: 10px 20px; border-radius: 5px; border: 1px dashed #6C1D45;">
                        ${codigo}
                    </span>
                </div>
                <p style="color: #666; font-size: 14px;">Este código expirará en 15 minutos. Si tú no realizaste este registro, ignora este correo.</p>
            </div>
        `
    };
    
    return await transporter.sendMail(mailOptions);
};

const enviarCorreoRecuperacion = async (destinatario, codigo) => {
    const mailOptions = {
        from: `"Sistema TT - Soporte" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: 'Recuperación de Contraseña',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #6C1D45; text-align: center;">Recuperación de Contraseña</h2>
                <p>Hola, hemos recibido una solicitud para restablecer tu contraseña. Ingresa el siguiente código en la aplicación:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10312B; background-color: #f2f2f2; padding: 10px 20px; border-radius: 5px; border: 1px dashed #6C1D45;">
                        ${codigo}
                    </span>
                </div>
                <p style="color: #666; font-size: 14px;">Este código expirará en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>
            </div>
        `
    };
    return await transporter.sendMail(mailOptions);
};

module.exports = {
    enviarCodigoVerificacion,
    enviarCorreoRecuperacion
};