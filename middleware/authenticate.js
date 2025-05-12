const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const secretKey = process.env.SECRET_KEY;

module.exports = (req, res, next) => {
  // const authHeader = req.headers.authorization;
  // if (!authHeader?.startsWith("Bearer ")) {
  //   return next(new AppError("Unauthorized", 401));
  // }

  // const token = authHeader.split(" ")[1];
  // try {
  //   const decoded = jwt.verify(token, process.env.SECRET_KEY);
  //   req.user = decoded;
  //   next();
  // } catch (err) {
  //   return next(new AppError("Invalid or expired token", 403));
  // }
};
