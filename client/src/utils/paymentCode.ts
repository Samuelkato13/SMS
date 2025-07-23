export const generatePaymentCode = (
  schoolAbbreviation: string,
  year: number = new Date().getFullYear(),
  counter: number
): string => {
  const formattedCounter = counter.toString().padStart(5, '0');
  return `${schoolAbbreviation.toUpperCase()}-${year}-${formattedCounter}`;
};

export const parsePaymentCode = (paymentCode: string) => {
  const parts = paymentCode.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid payment code format');
  }

  return {
    schoolAbbr: parts[0],
    year: parseInt(parts[1], 10),
    studentNumber: parseInt(parts[2], 10)
  };
};

export const validatePaymentCode = (paymentCode: string): boolean => {
  try {
    const parsed = parsePaymentCode(paymentCode);
    return parsed.year >= 2020 && parsed.year <= 2030 && parsed.studentNumber > 0;
  } catch {
    return false;
  }
};
