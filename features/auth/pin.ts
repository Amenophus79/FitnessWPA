export async function hashPin(pin: string, salt: string) {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error("PIN must contain 4 to 8 digits.");
  }

  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, salt: string, expectedHash: string) {
  return (await hashPin(pin, salt)) === expectedHash;
}
