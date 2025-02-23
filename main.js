const { Client } = require("pg");
const express = require("express");

const PORT = 4001;

const app = express();

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "mtaa",
  password: "1234",
  port: 5432,
});

app.get("/", (req, res) => {
  db.query("SELECT * FROM public.users", (err, result) => {
    if (err) throw err;
    console.log(result);

    res.json(result.rows);
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



