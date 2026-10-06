const BRAZIL_COUNTRY_CODE = "55";

function nationalDigits(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length > 11) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

export function formatBrazilianPhone(value: string | null | undefined) {
  const digits = nationalDigits(value);

  if (!digits) return "";
  if (digits.length < 3) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) {
    return `(${areaCode}) ${number}`;
  }

  if (number.length <= 8) {
    return `(${areaCode}) ${number.slice(0, 4)}-${number.slice(4)}`;
  }

  return `(${areaCode}) ${number.slice(0, 5)}-${number.slice(5, 9)}`;
}

export function normalizeBrazilianPhone(value: string | null | undefined) {
  const digits = nationalDigits(value);
  return digits ? `${BRAZIL_COUNTRY_CODE}${digits}` : "";
}

export function isValidBrazilianMobile(value: string | null | undefined) {
  return /^55[1-9]{2}(?:9\d{8}|[6-9]\d{7})$/.test(normalizeBrazilianPhone(value));
}

export function displayBrazilianPhone(value: string | null | undefined) {
  const formatted = formatBrazilianPhone(value);
  return formatted ? `+55 ${formatted}` : "+55";
}
