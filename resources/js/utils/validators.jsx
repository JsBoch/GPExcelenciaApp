// utils/validators.js
export const validateNIT = (value) => {
  const onlyNumbers = /^\d+$/;
  const alphanumeric = /^[A-Za-z0-9]+$/;

  if (!alphanumeric.test(value)) {
    return 'Solo se permiten letras y números.';
  }

  if (value.length < 6 || value.length > 20) {
    return 'Debe tener entre 6 y 20 caracteres.';
  }

  // Opción 1: solo números
  if (onlyNumbers.test(value)) {
    return true;
  }

  // Opción 2: debe contener exactamente una letra mayúscula
  const uppercaseMatches = value.match(/[A-Z]/g) || [];
  if (uppercaseMatches.length !== 1) {
    return 'Debe contener exactamente una letra mayúscula o ser solo numérico.';
  }

  return true;
};

export const validateOnlyNumbers = (
    value,
    minLength = null,
    maxLength = null
) => {
    if (!/^\d+$/.test(value)) return "Solo se permiten números.";
    if (minLength && value.length < minLength)
        return `Debe tener al menos ${minLength} dígitos.`;
    if (maxLength && value.length > maxLength)
        return `Debe tener máximo ${maxLength} dígitos.`;
    return true;
};

export const validateDecimalAmount = (
    value,
    maxInteger = 10,
    maxDecimals = 2
) => {
    const regex = new RegExp(
        `^\\d{1,${maxInteger}}(\\.\\d{0,${maxDecimals}})?$`
    );
    if (!regex.test(value)) {
        return `Debe tener hasta ${maxInteger} enteros y ${maxDecimals} decimales.`;
    }
    return true;
};
