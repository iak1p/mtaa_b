const { Client } = require("pg");
const express = require("express");
const jwt = require("jsonwebtoken");

const PORT = 4001;
const SECRET_TOKEN = "HELLMANNS";

const app = express();
app.use(express.json());

const db = new Client({
  user: "postgres",
  host: "database-1.ciroug00mfvt.us-east-1.rds.amazonaws.com",
  database: "postgres",
  password: "mypassword",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const token = jwt.sign({ username: username, password: password }, "REG");
  //   db.query("SELECT * FROM public.users", (err, result) => {
  //     if (err) throw err;
  //     console.log(result);

  //     res.json(result.rows);
  //   });
  res.json(token);
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;

  const token = jwt.sign(
    { username: username, password: password },
    SECRET_TOKEN,
    { noTimestamp: true }
  );

  db.query(
    `SELECT * FROM public.users WHERE username = '${username}'`,
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Ошибка при проверке пользователя" });
      }

      if (result.rows.length > 0) {
        return res.status(400).json({ message: "Пользователь уже существует" });
      } else {
        db.query(
          `INSERT INTO public.users (username, token, password) values ('${username}', '${token}', ${password})`,
          (err, result) => {
            if (err) {
              res.json({ message: "huyna" }).status(500);
              throw err;
            }
            res
              .json({ message: "Registration successful", token: token })
              .status(200);
          }
        );
      }
    }
  );
});

app.get("/", (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  jwt.verify(token, "REG", (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Недействительный токен" });
    }

    db.query("SELECT * FROM public.users", (err, result) => {
      if (err) throw err;
      console.log(result);
      res.json(result.rows);
    });
  });
});

async function connectDB() {
  try {
    await db.connect();
    console.log("Успешное подключение к PostgreSQL");
    app.listen(PORT);
  } catch (error) {
    console.error("Ошибка подключения:", error);
  }
}

connectDB();
