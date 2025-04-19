export function guessNameFromEmail(email: string): { firstName?: string; lastName?: string } {
  const localPart = email.split("@")[0];

  const cleaned = localPart.replace(/[^a-zA-Z.]/g, "");
  const parts = cleaned.split(".");

  if (parts.length >= 2) {
    return {
      firstName: capitalize(parts[0]),
      lastName: capitalize(parts[1]),
    };
  } else if (parts.length === 1) {
    return {
      firstName: capitalize(parts[0]),
    };
  }

  return {};
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
