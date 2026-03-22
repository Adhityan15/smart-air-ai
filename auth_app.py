from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

# DB INIT
def init_db():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()


# 🔐 REGISTER
@app.route("/register", methods=["POST"])
def register():
    data = request.json

    username = data["username"]
    password = data["password"]

    try:
        conn = sqlite3.connect("users.db")
        c = conn.cursor()

        c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        conn.close()

        return jsonify({"status": "success"})

    except:
        return jsonify({"status": "error", "message": "User exists"})


# 🔐 LOGIN
@app.route("/login", methods=["POST"])
def login():
    data = request.json

    username = data["username"]
    password = data["password"]

    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
    user = c.fetchone()

    conn.close()

    if user:
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "fail"})


if __name__ == "__main__":
    app.run(debug=True)