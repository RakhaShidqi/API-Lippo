const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,                  // maksimal 100 request per window
  standardHeaders: true,      // mengirim info rate limit di header
  legacyHeaders: false,       // nonaktifkan header X-RateLimit-*
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  },
});

module.exports = apiLimiter;
