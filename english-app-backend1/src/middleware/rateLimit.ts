import rateLimit from "express-rate-limit";

export const conversationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10, // tối đa 10 request mỗi phút
  message: "Too many requests, please slow down.",
});
