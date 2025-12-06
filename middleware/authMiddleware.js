import { verifyToken } from "../utils/jwtUtils.js";

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const user = verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      console.log(error);
      return res.status(403).json({
        msg: "Forbidden status for JWT",
      });
    }
  } else {
    return res.status(401).json({
      msg: "No token provided",
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Role does not match" });
    }
    next();
  };
};
