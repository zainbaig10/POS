import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: user._id, role: user.role }, secretKey, {
    expiresIn: "1y",
  });
};

export const verifyToken = (token) => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  try {
    return jwt.verify(token, secretKey);
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw new Error("Invalid token");
  }
};
