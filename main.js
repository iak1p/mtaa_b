const { Client } = require("pg");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const fs = require("fs");
const WebSocket = require("ws");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const upload = multer({ dest: "uploads/" });
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const PORT = 4001;
const SECRET_TOKEN = "HELLMANNS";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const wss = new WebSocket.Server({ port: 8080 });

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

// AUTH

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `SELECT * FROM public.users WHERE username = '${username}'`,
    (err, result) => {
      if (err) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred while processing your request",
          statusCode: 500,
        });
      }

      if (result.rows.length == 0) {
        return res.status(404).json({
          error: "Not Found",
          message: "User does not exist",
          statusCode: 404,
        });
      }

      if (result.rows[0].password != password) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Password is incorrect",
          statusCode: 401,
        });
      }

      return res.status(201).json({
        message: "Authorization successful",
        token: result.rows[0].token,
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
        return res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred while processing your request",
          statusCode: 500,
        });
      }

      if (result.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: "User already exist",
          statusCode: 409,
        });
      } else {
        db.query(
          `INSERT INTO public.users (username, password) values ('${username}', '${password}') RETURNING id`,
          (err, result) => {
            if (err) {
              return res.status(500).json({
                error: "Internal Server Error",
                message:
                  "An unexpected error occurred while processing your request",
                statusCode: 500,
              });
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
              (err, user) => {
                if (err) {
                  return res.status(500).json({
                    error: "Internal Server Error",
                    message:
                      "An unexpected error occurred while processing your request",
                    statusCode: 500,
                  });
                }

                return res
                  .status(201)
                  .json({ message: "Registration successful", token: token });
              }
            );
          }
        );
      }
    }
  );
});

// USER

// ??
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
// ??
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

app.get("/users/budgets/all", (req, res) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  try {
    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Invalid token",
          statusCode: 403,
        });
      }

      db.query(
        `SELECT * FROM user_budgets ub JOIN budgets b ON ub.budget_id = b.id WHERE ub.user_id = ${decoded.id} order by current_money desc`,
        (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              error: "Internal Server Error",
              message:
                "An unexpected error occurred while processing your request",
              statusCode: 500,
            });
          }
          if (result.rows.length == 0) {
            return res.status(200).json({ pooly: [] });
          }
          return res.status(200).json({ pooly: result.rows });
        }
      );
    });
  } catch (err) {
    console.log(err);
  }
});

// app.patch("/users/change/image", (req, res) => {
//   const token = req.headers["authorization"];
//   const { url } = req.body;

//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
//       if (err) {
//         return res.status(403).json({ error: "Invalid token" });
//       }

//       db.query(
//         `UPDATE public.users SET img_uri = '${url}' WHERE id = ${decoded.id}`,
//         (err) => {
//           if (err) {
//             return res.status(500).json({ message: "Internal Server Error" });
//           }

//           return res.status(201).json({ message: "Changes successful" });
//         }
//       );
//     });
//   } catch (err) {
//     console.log(err);
//   }
// });

app.patch("/users/change/image", upload.single("file"), async (req, res) => {
  const token = req.headers["authorization"];
  const file = req.file;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  if (!file) {
    return res.status(400).json({
      error: "Bad Request",
      message: "No file uploaded",
      statusCode: 400,
    });
  }

  jwt.verify(token, SECRET_TOKEN, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid token",
        statusCode: 403,
      });
    }

    const fileBuffer = fs.readFileSync(file.path);
    const fileName = `${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from("img")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
      });

    if (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request",
        statusCode: 500,
      });
    }

    const { data: urlData } = supabase.storage
      .from("img")
      .getPublicUrl(fileName);

    db.query(
      `UPDATE public.users SET img_uri = '${urlData.publicUrl}' WHERE id = ${decoded.id}`,
      (err) => {
        if (err) {
          return res.status(500).json({
            error: "Internal Server Error",
            message:
              "An unexpected error occurred while processing your request",
            statusCode: 500,
          });
        }

        fs.unlink(file.path, (err) => {
          if (err) {
            console.error("Error while deleting file:", err);
          } else {
            console.log("File deleted successfully:", file.path);
          }
        });

        return res
          .status(200)
          .json({ message: "Changes successful", url: urlData.publicUrl });
      }
    );
  });
});

// BUDGET

app.post("/budgets/create", (req, res) => {
  const token = req.headers["authorization"];
  const { name, amount } = req.body;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid token",
        statusCode: 403,
      });
    }

    db.query(
      `insert into budgets(name, max_money, current_money) values($1, $2, $2) returning *`,
      [name, amount],
      (err, resultBudget) => {
        if (err) {
          return res.status(500).json({
            error: "Internal Server Error",
            message:
              "An unexpected error occurred while processing your request",
            statusCode: 500,
          });
        }

        db.query(
          `insert into user_budgets(user_id, budget_id) values($1, $2)`,
          [decoded.id, resultBudget.rows[0].id],
          (err, result) => {
            if (err) {
              if (err.code === "23505") {
                return res.status(409).json({
                  error: "Conflict",
                  message: "User already linked to this Pooly",
                  statusCode: 409,
                });
              }

              return res.status(500).json({
                error: "Internal Server Error",
                message:
                  "An unexpected error occurred while processing your request",
                statusCode: 500,
              });
            }

            return res.status(200).json({
              message: "Pooly created succfully",
              body: resultBudget.rows[0],
            });
          }
        );
      }
    );
  });
});

// transactions

app.get("/budgets/:id/transactions", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid token",
        statusCode: 403,
      });
    }

    db.query(
      `select amount, img_uri, t.id, username, date, type, category from transactions t join users u on u.id = t.user_id where t.budget_id = $1 order by date desc`,
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: "Internal Server Error",
            message:
              "An unexpected error occurred while processing your request",
            statusCode: 500,
          });
        }

        if (result.rows.length == 0) {
          return res.status(200).json({ transaction: [] });
        }

        return res.status(200).json({ transaction: result.rows });
      }
    );
  });
});

app.get("/budgets/:id/transactions/:limit", (req, res) => {
  const token = req.headers["authorization"];
  const { id, limit } = req.params;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid token",
        statusCode: 403,
      });
    }

    db.query(
      `select amount, img_uri, t.id, username, date, type, category from transactions t join users u on u.id = t.user_id where t.budget_id = $1 order by date desc limit $2`,
      [id, limit],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: "Internal Server Error",
            message:
              "An unexpected error occurred while processing your request",
            statusCode: 500,
          });
        }

        if (result.rows.length == 0) {
          return res.status(200).json({ transaction: [] });
        }

        return res.status(200).json({ transaction: result.rows });
      }
    );
  });
});

app.post("/budgets/:id/transactions", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;
  const { amount, date, type, category } = req.body;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing",
      statusCode: 401,
    });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid token",
        statusCode: 403,
      });
    }

    db.query("begin", (err) => {
      if (err) {
        return res.status(500).json({
          error: "Internal Server Error",
          message: "An unexpected error occurred while processing your request",
          statusCode: 500,
        });
      }

      db.query(`select * from budgets where id = $1`, [id], (err, result) => {
        if (err) {
          db.query("rollback", () => {
            return res.status(500).json({
              error: "Internal Server Error",
              message:
                "An unexpected error occurred while processing your request",
              statusCode: 500,
            });
          });
        }

        if (result.rows.length == 0) {
          db.query("rollback", () => {
            return res.status(404).json({
              error: "Not Found",
              message: "There is no such Pooly",
              statusCode: 404,
            });
          });
        }

        const currentBalance = result.rows[0].current_money;
        if (currentBalance - amount < 0) {
          db.query("rollback", () => {
            return res.status(422).json({
              error: "Unprocessable Content",
              message: "Insufficient balance",
              statusCode: 422,
            });
          });
        } else {
          db.query(
            `insert into transactions(budget_id, user_id, amount, date, type, category) values ($1, $2, $3, $4, $5, $6) returning *`,
            [id, decoded.id, amount, date, type, category],
            (err, resultTransactions) => {
              if (err) {
                db.query("rollback", () => {
                  return res.status(500).json({
                    error: "Internal Server Error",
                    message:
                      "An unexpected error occurred while processing your request",
                    statusCode: 500,
                  });
                });
              } else {
                db.query(
                  `update budgets set current_money = current_money - $1 where id = $2`,
                  [amount, id],
                  (err, result) => {
                    if (err) {
                      db.query("rollback", () => {
                        return res.status(500).json({
                          error: "Internal Server Error",
                          message:
                            "An unexpected error occurred while processing your request",
                          statusCode: 500,
                        });
                      });
                    } else {
                      db.query("commit", (err) => {
                        if (err) {
                          return res.status(500).json({
                            error: "Internal Server Error",
                            message:
                              "An unexpected error occurred while processing your request",
                            statusCode: 500,
                          });
                        }
                        return res.status(200).json({
                          message: "Transaction added and balance updated",
                          body: resultTransactions.rows[0],
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

// users

app.get("/budgets/:id/users", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    db.query(
      `select ub.id, username, img_uri from user_budgets ub join users u on u.id = ub.user_id where budget_id = $1`,
      [id],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        if (result.rows.length == 0) {
          return res.status(404).json({ message: "No users in Pooly" });
        }
        return res.status(200).json(result.rows);
      }
    );
  });
});

app.post("/budgets/:id/users", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;
  const { username } = req.body;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
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
                  `insert into user_budgets(user_id, budget_id) values ($1, $2) returning *`,
                  [userId, id],
                  (err, result) => {
                    if (err) {
                      return res
                        .status(500)
                        .json({ message: "Internal Server Error" });
                    }

                    return res.status(200).json({
                      message: "User succesfully added",
                      body: result.rows[0],
                    });
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
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    db.query(
      `delete from user_budgets WHERE user_id = $1 and budget_id = $2`,
      [decoded.id, id],
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        return res
          .json({ message: "You succesfully droped Pooly" })
          .status(200);
      }
    );
  });
});

// CHAT

app.get("/chats/:id/messages", (req, res) => {
  const token = req.headers["authorization"];
  const id = req.params.id;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    db.query(
      `select m.id, m.user_id, m.content, m.created_at, m.budget_id, username, img_uri  from messages m join users u on u.id = m.user_id where budget_id = ${id} order by m.created_at`,
      (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).json("Internal Server Error");
        }

        return res.json(result.rows).status(200);
      }
    );
  });
});

// wss.on("connection", (ws) => {
//   console.log("Client connected");

//   ws.on("message", (message) => {
//     const data = JSON.parse(message);
//     console.log(data);

//     if (data.action === "send_message") {
//       console.log(`Новое сообщение: ${data.content}`);
//       const token = data.user_token;

//       if (!token) {
//         ws.send(JSON.stringify({ error: "Unauthorized" }));
//       }

//       jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
//         if (err) {
//           ws.send(JSON.stringify({ error: "Invalid token" }));
//         }
//         console.log(decoded);

//         db.query(
//           `INSERT INTO messages(user_id, content, created_at, budget_id) VALUES ($1, $2, $3, $4) RETURNING *`,
//           [
//             decoded.id,
//             data.content,
//             new Date().toISOString(),
//             parseInt(data.budget_id),
//           ],
//           (err, result) => {
//             if (err) {
//               ws.send(JSON.stringify({ error: "Internal Server Error" }));
//             }

//             console.log("Inserted message:", result.rows[0]);

//             wss.clients.forEach((client) => {
//               if (client.readyState === WebSocket.OPEN) {
//                 client.send(JSON.stringify(result.rows[0]));
//               }
//             });
//           }
//         );
//       });
//     }
//   });

//   ws.on("close", () => {
//     console.log("Client disconnected");
//   });
// });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received message:", data);

      if (data.action === "send_message") {
        console.log(`Новое сообщение: ${data.content}`);

        const token = data.user_token;
        if (!token) {
          return ws.send(JSON.stringify({ error: "Unauthorized" }));
        }

        jwt.verify(token, SECRET_TOKEN, async (err, decoded) => {
          if (err) {
            return ws.send(JSON.stringify({ error: "Invalid token" }));
          }

          console.log("Decoded token:", decoded);

          try {
            const result = await db.query(
              `INSERT INTO messages(user_id, content, created_at, budget_id) 
               VALUES ($1, $2, $3, $4) RETURNING *`,
              [
                decoded.id,
                data.content,
                new Date().toISOString(),
                parseInt(data.budget_id),
              ]
            );

            if (!result.rows.length) {
              return ws.send(
                JSON.stringify({ error: "Failed to insert message" })
              );
            }

            const newMessage = result.rows[0];
            console.log("Inserted message:", newMessage);

            wss.clients.forEach((client) => {
              if (
                client.readyState === WebSocket.OPEN &&
                client.budget_id === data.budget_id
              ) {
                client.send(JSON.stringify(result.rows[0]));
              }
            });
          } catch (dbError) {
            console.error("Database error:", dbError);
            return ws.send(JSON.stringify({ error: "Internal Server Error" }));
          }
        });
      }
    } catch (parseError) {
      console.error("Invalid JSON received:", parseError);
      ws.send(JSON.stringify({ error: "Invalid JSON format" }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === "join_chat" && data.budget_id) {
        ws.budget_id = data.budget_id;
        console.log(`Client joined budget_id: ${ws.budget_id}`);
      }
    } catch (error) {
      console.error("Error parsing join_chat message:", error);
    }
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
