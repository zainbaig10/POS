import { Buffer } from "buffer";

export const generateZatcaTLV = (
  sellerName,
  trn,
  timestamp,
  totalAmount,
  vatAmount
) => {
  const createTLV = (tag, value) => {
    const valBytes = Buffer.from(value.toString(), "utf-8");
    return Buffer.concat([
      Buffer.from([tag]),
      Buffer.from([valBytes.length]),
      valBytes,
    ]);
  };

  const tlvBuffer = Buffer.concat([
    createTLV(1, sellerName),
    createTLV(2, trn),
    createTLV(3, timestamp),
    createTLV(4, totalAmount.toFixed(2)),
    createTLV(5, vatAmount.toFixed(2)),
  ]);

  return tlvBuffer.toString("base64");
};
