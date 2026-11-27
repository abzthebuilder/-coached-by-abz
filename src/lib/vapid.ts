import crypto from "node:crypto";

// Checks for the keys and contact that sign phone notifications. Apple refuses a notification
// ("BadJwtToken") if the contact isn't a clean URL or mailto: address, or if the signing keys don't
// belong together, so both are checked here before anything is sent.

/** The contact put in every notification's signature: VAPID_SUBJECT if it's clean, else mailto:<fallback email>. */
export function vapidSubject(configured: string | undefined, fallbackEmail: string) {
  const s = (configured ?? "").trim();
  if (/^mailto:[^\s<>@:]+@[^\s<>@]+\.[a-z]{2,}$/i.test(s)) return s;
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(s) && !/localhost/i.test(s)) return s;
  return `mailto:${fallbackEmail.trim()}`;
}

/** True when the private key really produces the public key (base64url P-256 keys, as web-push makes them). */
export function vapidPairMatches(keys: { publicKey: string; privateKey: string }) {
  try {
    const priv = Buffer.from(keys.privateKey.trim(), "base64url");
    const pub = Buffer.from(keys.publicKey.trim(), "base64url");
    if (priv.length !== 32 || pub.length !== 65) return false;
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    return ecdh.getPublicKey().equals(pub);
  } catch {
    return false;
  }
}
