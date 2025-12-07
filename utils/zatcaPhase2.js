import crypto from "crypto";
import fs from "fs";
import { privateKeyPath, publicKeyPath } from "./zatcaKeys.js";

// Generate SHA-256 hash of invoice JSON
export const generateInvoiceHash = (invoiceObj) => {
  const jsonStr = JSON.stringify(invoiceObj);
  return crypto.createHash("sha256").update(jsonStr).digest("hex");
};

// Sign hash with ECC private key
export const signInvoiceHash = (hash) => {
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const sign = crypto.createSign("SHA256");
  sign.update(hash);
  sign.end();
  const signature = sign.sign(privateKey, "base64");
  return signature;
};

// Read public key
export const getPublicKey = () => fs.readFileSync(publicKeyPath, "utf8");
