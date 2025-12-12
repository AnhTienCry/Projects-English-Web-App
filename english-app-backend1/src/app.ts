
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
// (fs không còn cần nếu không tự stream) — giữ lại nếu nơi khác dùng
// import fs from "fs";

import authRoutes from "./routes/auth";
import lessonsRoutes from "./routes/lessons";
import vocabRoutes from "./routes/vocab";
import protectedRoutes from "./routes/protected";
import rankRoutes from "./routes/rank";
import badgeRoutes from "./routes/badge";
import notificationRoutes from "./routes/notification";
import reportRoutes from "./routes/report";
import towerRoutes from "./routes/tower";
import userRoutes from "./routes/user";
import quizRoutes from "./routes/quiz";
import videoRoutes from "./routes/video";
import translationRoutes from "./routes/translation";
import progressionRoutes from "./routes/progression";
import topicRoutes from "./routes/topic";
import activityRoutes from "./routes/activity";
import lessonResultRoutes from "./routes/lessonResult";
import quizResultRoutes from "./routes/quizResult";
import quizRankRoutes from "./routes/quizRank";
import conversationRoutes from "./routes/conversation";
import uploadRoutes from "./routes/upload";
import storyRoutes from "./routes/story";
import practiceRoutes from "./routes/practice";

const app = express();

/* -------------------------------------------------------------------------- */
/* 🛡️  CORS CONFIGURATION                                                     */
/* - Chỉ cho phép các origin dev của bạn                                      */
/* - Bật credentials, methods, headers                                        */
/* -------------------------------------------------------------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://10.0.2.2:4000",
  "http://172.16.16.56:4000",
  "http://172.16.16.56",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Accept",
      "Range", // 👈 thêm Range để audio streaming
    ],
    exposedHeaders: ["Authorization"],
    optionsSuccessStatus: 204,
  })
);

/* -------------------------------------------------------------------------- */
/* ✅ Preflight (OPTIONS) trả sớm                                              */
/* - Tránh trình duyệt chặn CORS trước khi gọi thật                            */
/* -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Origin, X-Requested-With, Accept, Range"
    );
    return res.sendStatus(204);
  }
  next();
});

/* -------------------------------------------------------------------------- */
/* 🔧 Middleware cơ bản                                                        */
/* -------------------------------------------------------------------------- */
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

/* -------------------------------------------------------------------------- */
/* ✅ Phục vụ file tĩnh trong thư mục /uploads                                 */
/* - CHÌA KHÓA SỬA LỖI audio:                                                 */
/*   1) crossOriginResourcePolicy('cross-origin') để CORP không chặn 206      */
/*   2) Thêm CORS + header Accept-Ranges/Range để trình duyệt stream          */
/*   3) Dùng express.static — nó đã hỗ trợ Range (206) mặc định               */
/* -------------------------------------------------------------------------- */
const UPLOADS_DIR = path.join(__dirname, "../uploads");

app.use(
  "/uploads",

  (req, _res, next) => {
    const [pathname, query = ""] = req.url.split("?");
    // nếu đã có phần mở rộng (có dấu .) thì thôi
    if (path.extname(pathname)) return next();

    // chỉ thêm . nếu URL kết thúc bằng tên đuôi KHÔNG có dấu chấm trước
    const fixed = pathname.replace(
      /(?<!\.)\b(mp3|m4a|wav|aac|ogg|flac|webm)\b$/i,
      ".$1"
    );

    if (fixed !== pathname) {
      req.url = query ? `${fixed}?${query}` : fixed;
    }
    next();
  },

  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Range, Content-Type, Authorization, Origin, X-Requested-With, Accept"
    );
    res.setHeader("Accept-Ranges", "bytes");
    next();
  },
  express.static(UPLOADS_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp3")) res.setHeader("Content-Type", "audio/mpeg");
      else if (filePath.endsWith(".m4a")) res.setHeader("Content-Type", "audio/mp4");
      else if (filePath.endsWith(".wav")) res.setHeader("Content-Type", "audio/wav");
      else if (filePath.endsWith(".ogg")) res.setHeader("Content-Type", "audio/ogg");
    },
    fallthrough: false,
  })
);


/* -------------------------------------------------------------------------- */
/* Health & debug                                                              */
/* -------------------------------------------------------------------------- */
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.post("/api/debug-ping", (req, res) => res.json({ ok: true, body: req.body }));

/* -------------------------------------------------------------------------- */
/* Core routes                                                                 */
/* -------------------------------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/lessons", lessonResultRoutes);
app.use("/api/vocab", vocabRoutes);
app.use("/api/ranks", rankRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tower", towerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/quizzes", quizResultRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/translation", translationRoutes);
app.use("/api/progressions", progressionRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/quiz-rank", quizRankRoutes);
app.use("/api/upload", uploadRoutes);

/* -------------------------------------------------------------------------- */
/* ✅ Practice module                                                          */
/* -------------------------------------------------------------------------- */
app.use("/api/v2/practice", practiceRoutes);

/* -------------------------------------------------------------------------- */
/* 🧱 Global Error Handler                                                     */
/* -------------------------------------------------------------------------- */
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: { message: err.message || "Internal Server Error" } });
  }
);

export default app;
