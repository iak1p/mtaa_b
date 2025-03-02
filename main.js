const { Client } = require("pg");
const express = require("express");
const jwt = require("jsonwebtoken");

const PORT = 4001;

const app = express();
app.use(express.json());

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "mtaa",
  password: "1234",
  port: 5432,
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
