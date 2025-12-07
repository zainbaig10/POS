import fs from "fs";
import forge from "node-forge";

export const signXml = (xml) => {
  const privateKeyPem = fs.readFileSync(process.env.PRIVATE_KEY_PATH, "utf8");
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const md = forge.md.sha256.create();
  md.update(xml, "utf8");

  const signature = forge.util.encode64(privateKey.sign(md));

  // Add signature as a comment at the end (or proper XMLDSIG if needed)
  const signedXml = xml.replace(
    "</Invoice>",
    `<Signature>${signature}</Signature></Invoice>`
  );

  return signedXml;
};
