const { Client } = require("pg");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const fs = require("fs");

const PORT = 4001;
const SECRET_TOKEN = "HELLMANNS";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// const db = new Client({
//   user: "postgres",
//   host: "database-1.ciroug00mfvt.us-east-1.rds.amazonaws.com",
//   database: "postgres",
//   password: "mypassword",
//   port: 5432,
//   ssl: { rejectUnauthorized: false },
// });

const db = new Client({
  user: "avnadmin",
  password: process.env.PASSWORD,
  host: "mtaa-mtaa.j.aivencloud.com",
  port: 15005,
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.CA, "utf-8"),
  },
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

app.get("/users/info/all", (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      db.query(
        `SELECT * FROM users WHERE id = ${decoded.id}`,
        (err, result) => {
          if (err) {
            return res.status(500).json("Internal Server Error");
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

// app.get("/users/budgets/:id", (req, res) => {
//   const token = req.headers["authorization"];
//   const id = req.params.id;

//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
//       if (err) {
//         return res.status(403).json({ error: "Invalid token" });
//       }

//       db.query(
//         `SELECT * FROM "user_budget" ub JOIN budgets b ON ub.budget_id = b.budget_id WHERE ub.user_id = ${id}`,
//         (err, result) => {
//           if (err) {
//             return res.json("Internal Server Error").status(500);
//           }
//           if (result.rows.length == 0) {
//             return res
//               .status(200)
//               .json({ message: "User doesn't have any budgets." });
//           }
//           return res.json(result.rows).status(200);
//         }
//       );
//     });
//   } catch (err) {
//     console.log(err);
//   }
// });

app.get("/users/budgets/all", (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      db.query(
        `SELECT * FROM user_budgets ub JOIN budgets b ON ub.budget_id = b.id WHERE ub.user_id = ${decoded.id} order by current_money desc`,
        (err, result) => {
          if (err) {
            console.log(err);
            return res.json("Internal Server Error").status(500);
          }
          if (result.rows.length == 0) {
            return res
              .status(200)
              .json({ message: "User doesn't have any budgets." });
          }
          return res.json(result.rows).status(200);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.patch("/users/change/image", (req, res) => {
  const token = req.headers["authorization"];
  const { url } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      db.query(
        `UPDATE public.users SET img_uri = '${url}' WHERE id = ${decoded.id}`,
        (err) => {
          if (err) {
            return res.status(500).json({ message: "Internal Server Error" });
          }

          return res.status(201).json({ message: "Changes successful" });
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/budgets/:id/transactions", (req, res) => {
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
        `SELECT amount, img_uri, t.id, username, date FROM transactions t join users u on u.id = t.user_id WHERE t.budget_id = ${id} order by date desc`,
        (err, result) => {
          if (err) {
            console.log(err);
            return res.json("Internal Server Error").status(500);
          }
          if (result.rows.length == 0) {
            return res.status(200).json({ message: "No transactions yet." });
          }
          return res.json(result.rows).status(200);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/budgets/:id/users", (req, res) => {
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
        `select * from user_budgets ub join users u on u.id = ub.user_id where budget_id = ${id}`,
        (err, result) => {
          if (err) {
            console.log(err);
            return res.json("Internal Server Error").status(500);
          }
          if (result.rows.length == 0) {
            return res.status(200).json({ message: "No user" });
          }
          return res.json(result.rows).status(200);
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/budgets/:id/users", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;
  const { username } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    db.query(
      `select * from users where username = $1`,
      [username],
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (result.rows.length == 0) {
          return res.status(404).json({ message: "User not found" });
        } else {
          const userId = result.rows[0].id;

          db.query(
            `select * from users u join user_budgets b on b.user_id = u.id where u.id = $1 and budget_id = $2`,
            [userId, id],
            (err, result_user) => {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }

              if (result_user.rows.length > 0) {
                return res
                  .status(409)
                  .json({ message: "User already in Pooly" });
              } else {
                db.query(
                  `insert into user_budgets(user_id, budget_id) values ($1, $2)`,
                  [userId, id],
                  (err) => {
                    if (err) {
                      return res
                        .status(500)
                        .json({ message: "Internal Server Error" });
                    }

                    return res
                      .json({
                        message: "User succesfully added",
                      })
                      .status(200);
                  }
                );
              }
            }
          );
        }
      }
    );
  });
});

app.delete("/budgets/:id/users/drop", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    db.query(
      `delete from user_budgets WHERE user_id = $1 and budget_id = $2`,
      [decoded.id, id],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.json("Internal Server Error").status(500);
        }
        return res
          .json({ message: "You succesfully droped Pooly" })
          .status(200);
      }
    );
  });
});

app.post("/budgets/:id/transactions", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;
  const { amount, date } = req.body;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    db.query("begin", (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      db.query(`select * from budgets where id = $1`, [id], (err, result) => {
        if (err) {
          db.query("rollback", () => {
            console.log(err);
            return res.status(500).json({ message: "Internal Server Error" });
          });
        }

        if (result.rows.length == 0) {
          db.query("rollback", () => {
            return res.status(400).json({ message: "There is no such Pooly" });
          });
        }

        const currentBalance = result.rows[0].current_money;
        if (currentBalance - amount < 0) {
          db.query("rollback", () => {
            return res.status(400).json({ message: "Insufficient balance" });
          });
        } else {
          db.query(
            `insert into transactions(budget_id, user_id, amount, date) values ($1, $2, $3, $4)`,
            [id, decoded.id, amount, date],
            (err, result) => {
              if (err) {
                db.query("rollback", () => {
                  console.log(err);
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                });
              } else {
                db.query(
                  `update budgets set current_money = current_money - $1 where id = $2`,
                  [amount, id],
                  (err, result) => {
                    if (err) {
                      db.query("rollback", () => {
                        console.log(err);
                        return res
                          .status(500)
                          .json({ message: "Internal Server Error" });
                      });
                    } else {
                      db.query("commit", (err) => {
                        if (err) {
                          console.log(err);
                          return res
                            .status(500)
                            .json({ message: "Internal Server Error" });
                        }
                        return res.status(200).json({
                          message: "Transaction added and balance updated",
                        });
                      });
                    }
                  }
                );
              }
            }
          );
        }
      });
    });
  });
});

app.post("/budgets/create", (req, res) => {});

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
