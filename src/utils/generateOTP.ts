import crypto from "crypto";

export const generateOTP = function () {
  return crypto.randomInt(100000, 999999).toString();
};
