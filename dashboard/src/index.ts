import path from "path";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import { env } from "./config/env";
import { webRouter } from "./routes/web";
import { startPollWorker } from "./workers/pollWorker";

const SQLiteStore = connectSqlite3(session);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: path.join(__dirname, "..", "prisma") }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10
    }
  })
);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(webRouter);

app.listen(env.port, () => {
  console.log(`Dashboard running at http://localhost:${env.port}`);
});

startPollWorker();
