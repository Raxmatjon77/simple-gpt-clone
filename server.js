const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;
const OpenAI = require("openai");
const sqlite3 = require("sqlite3").verbose();
const { config } = require("dotenv");
config();
const db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_message TEXT NOT NULL,
            gpt_response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});
app.use(express.static("public"));
app.use(express.json());
const openai = new OpenAI({
  apiKey: process.env.api_key,
});
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });

    const response = completion.choices[0].message.content;

    db.run(
      "INSERT INTO chat_history (user_message, gpt_response) VALUES (?, ?)",
      [userMessage, response],
      function (err) {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        res.json({ response: response });
      },
    );

    console.log(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/history", (req, res) => {
  db.all(
    "SELECT * FROM chat_history ORDER p BY timestamDESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ history: rows });
    },
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
