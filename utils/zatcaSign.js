import crypto from "crypto";
import fs from "fs";
import { privateKeyPath, publicKeyPath, csrPath } from "./zatcaKeys.js"; // ECC private key

// Function to hash invoice data
export const generateInvoiceHash = (invoice) => {
  const hash = crypto.createHash("sha256");
  const dataString = JSON.stringify({
    invoiceNumber: invoice.invoiceNumber,
    totalNetAmount: invoice.totalNetAmount,
    totalVatAmount: invoice.totalVatAmount,
    totalAmount: invoice.totalAmount,
    customerName: invoice.customerName,
    createdAt: invoice.createdAt,
  });
  hash.update(dataString);
  return hash.digest("hex");
};

// Function to sign the hash
export const signInvoiceHash = (hash) => {
  const privateKey = getPrivateKey();
  const sign = crypto.createSign("SHA256");
  sign.update(hash);
  sign.end();
  const signature = sign.sign(privateKey, "base64");
  return signature;
};

export const getPrivateKey = () => {
  if (!fs.existsSync(privateKeyPath))
    throw new Error("Private key not found: " + privateKeyPath);
  return fs.readFileSync(privateKeyPath, "utf8");
};

export const getPublicKey = () => {
  if (!fs.existsSync(publicKeyPath))
    throw new Error("Public key not found: " + publicKeyPath);
  return fs.readFileSync(publicKeyPath, "utf8");
};

export const signHashBase64 = (hexHash) => {
  const privateKey = getPrivateKey();
  // hexHash is hex string (sha256 digest)
  // we sign the raw bytes of the hex digest (or the digest buffer)
  const hashBuffer = Buffer.from(hexHash, "hex");

  // ECDSA signature with SHA256 over the digest buffer
  const sign = crypto.createSign("SHA256");
  sign.update(hashBuffer);
  sign.end();

  const signatureBase64 = sign.sign(privateKey, "base64");
  return signatureBase64;
};
