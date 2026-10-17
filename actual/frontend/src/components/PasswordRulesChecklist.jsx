import React from 'react';
import './PasswordRulesChecklist.css';

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rule-icon check" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rule-icon pending" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
    </svg>
);

export const checkPasswordRules = (password = '', confirmPassword = null, currentPassword = null) => {
    const rules = [
        {
            id: 'length',
            label: 'Mínimo 8 caracteres',
            met: password.length >= 8
        },
        {
            id: 'uppercase',
            label: 'Al menos una letra mayúscula (A-Z)',
            met: /[A-Z]/.test(password)
        },
        {
            id: 'lowercase',
            label: 'Al menos una letra minúscula (a-z)',
            met: /[a-z]/.test(password)
        },
        {
            id: 'number',
            label: 'Al menos un número (0-9)',
            met: /\d/.test(password)
        },
        {
            id: 'special',
            label: 'Al menos un carácter especial (!@#$%^&*...)',
            met: /[^A-Za-z0-9]/.test(password)
        }
    ];

    if (currentPassword !== null && currentPassword !== undefined) {
        rules.push({
            id: 'different',
            label: 'Distinta a la contraseña actual',
            met: password.length > 0 && currentPassword.length > 0 && password !== currentPassword
        });
    }

    if (confirmPassword !== null && confirmPassword !== undefined) {
        rules.push({
            id: 'match',
            label: 'Las contraseñas coinciden',
            met: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
        });
    }

    const baseRules = rules.slice(0, 5);
    const metCount = baseRules.filter(r => r.met).length;
    let strength = 'none';
    let strengthLabel = 'Sin ingresar';
    let strengthColor = '#94a3b8';

    if (password.length > 0) {
        if (metCount <= 2) {
            strength = 'weak';
            strengthLabel = 'Débil';
            strengthColor = '#ef4444';
        } else if (metCount <= 4) {
            strength = 'medium';
            strengthLabel = 'Media';
            strengthColor = '#f59e0b';
        } else {
            strength = 'strong';
            strengthLabel = 'Segura';
            strengthColor = '#10b981';
        }
    }

    const allBaseMet = baseRules.every(r => r.met);
    const allMet = rules.every(r => r.met);

    return {
        rules,
        baseRules,
        metCount,
        strength,
        strengthLabel,
        strengthColor,
        allBaseMet,
        allMet
    };
};

const PasswordRulesChecklist = ({
    password = '',
    confirmPassword = null,
    currentPassword = null,
    showStrengthBar = true,
    title = 'Requisitos de la contraseña'
}) => {
    const { rules, metCount, strength, strengthLabel, strengthColor } = checkPasswordRules(password, confirmPassword, currentPassword);

    return (
        <div className="password-rules-box" aria-live="polite">
            <div className="password-rules-top">
                {title && <span className="password-rules-title">{title}</span>}
                {showStrengthBar && password.length > 0 && (
                    <span className="strength-badge" style={{ color: strengthColor, backgroundColor: `${strengthColor}18` }}>
                        Seguridad: <strong>{strengthLabel}</strong>
                    </span>
                )}
            </div>

            {showStrengthBar && password.length > 0 && (
                <div className="strength-track">
                    <div
                        className="strength-progress"
                        style={{
                            width: `${Math.max(10, (metCount / 5) * 100)}%`,
                            backgroundColor: strengthColor
                        }}
                    />
                </div>
            )}

            <ul className="password-rules-grid">
                {rules.map((rule) => (
                    <li
                        key={rule.id}
                        className={`rule-item ${rule.met ? 'rule-met' : 'rule-pending'}`}
                    >
                        {rule.met ? <CheckIcon /> : <CircleIcon />}
                        <span>{rule.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PasswordRulesChecklist;

