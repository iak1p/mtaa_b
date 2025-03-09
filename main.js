const { Client } = require("pg");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const PORT = 4001;
const SECRET_TOKEN = "HELLMANNS";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const db = new Client({
  user: "postgres",
  host: "database-1.ciroug00mfvt.us-east-1.rds.amazonaws.com",
  database: "postgres",
  password: "mypassword",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `SELECT * FROM public.users WHERE username = '${username}'`,
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.rows.length == 0) {
        return res.status(404).json({ message: "User does not exist" });
      }

      if (result.rows[0].password != password) {
        return res.status(401).json({ message: "Password is incorrect" });
      }

      return res.status(201).json({
        token: result.rows[0].token,
        message: "Authorization successful",
      });
    }
  );
});

app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `SELECT * FROM public.users WHERE username = '${username}'`,
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.rows.length > 0) {
        return res.status(409).json({ message: "User already exists" });
      } else {
        db.query(
          `INSERT INTO public.users (username, password) values ('${username}', '${password}') RETURNING id`,
          (err, result) => {
            if (err) {
              return res.json({ message: "Internal Server Error" }).status(500);
            }

            const token = jwt.sign(
              { id: result.rows[0].id, username: username },
              SECRET_TOKEN,
              {
                noTimestamp: true,
              }
            );

            db.query(
              `UPDATE public.users SET token = '${token}' WHERE id = ${result.rows[0].id}`,
              (err) => {
                if (err) {
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                }

                return res
                  .json({ message: "Registration successful", token: token })
                  .status(201);
              }
            );
          }
        );
      }
    }
  );
});

app.get("/users/:id", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      db.query(
        `SELECT username FROM public.users WHERE id = ${id}`,
        (err, result) => {
          if (err) {
            return res.json("Internal Server Error").status(500);
          }

          if (result.rows.length == 0) {
            return res.status(404).json({ message: "User does not exist" });
          }

          return res.json(result.rows[0]).status(200);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.patch("/users/change/:id", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;
  const { username } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      if (decoded.id != id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      db.query(
        `UPDATE public.users SET username = '${username}' WHERE id = ${id}`,
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Internal Server Error" });
          }

          return res.json({ message: "Changes successful" }).status(201);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
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
