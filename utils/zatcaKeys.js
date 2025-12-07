import { generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";

const keysDir = path.join(process.cwd(), "keys");

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Paths
const privateKeyPath = path.join(keysDir, "ecc_private.pem");
const publicKeyPath = path.join(keysDir, "ecc_public.pem");
const csrPath = path.join(keysDir, "invoice_csr.pem");

// Generate ECC keys if not exist
if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log("ECC Key Pair generated successfully!");
}

// Optional: Generate CSR (simplified)
const csrExists = fs.existsSync(csrPath);
if (!csrExists) {
  // For full Phase-2, you may use openssl command line or node-forge for proper CSR
  fs.writeFileSync(
    csrPath,
    "CSR placeholder - generate via openssl or node-forge"
  );
  console.log("CSR file created. Replace with actual CSR generation logic.");
}

export { privateKeyPath, publicKeyPath, csrPath };
