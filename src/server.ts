import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
const { PORT } = process.env;
import { router } from "./routes/router";
import { connectDB } from "./utils/connectDB";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authRouter } from "./routes/authRoutes";
import { initializeSocket } from "./utils/socket";
import { companyRouter } from "./routes/employer/routes.employer";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://sequentialjobs.com"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());
app.use(helmet());

const server = app.listen(PORT, async () => {
  await connectDB();
  console.log(`server started on http://localhost:${PORT}`);
});

initializeSocket(server);

// routes
app.use("/api", router);
app.use("/api/auth", authRouter);
app.use("/api/jobs", companyRouter);

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint does not exist!",
    explorableSolutions: {
      solution1: 'ensure the "METHOD" used to call the endpoint is correct!',
      solution2: "ensure the relative paths to the server url is defined correctly",
    },
  });
});
