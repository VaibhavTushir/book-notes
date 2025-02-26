# 📚 Book Notes

A full-stack web application that allows users to **save, rate, review, and manage their book collection**. Users can **sign up, log in (via email/password or Google OAuth), search for books, and edit/delete their entries**. Built using **Node.js, Express, PostgreSQL, Passport.js, and EJS for templating**.

---

## 🚀 Features

- 🔐 **User Authentication** (Local & Google OAuth)
- 📖 **Add, Edit, Delete Books**
- ⭐ **Rate & Review Your Books**
- 🔍 **Search Books by Name**
- 🎲 **Discover Random Books**
- 📜 **Persistent Data Storage with PostgreSQL**

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, PostgreSQL
- **Authentication:** Passport.js (Local & Google OAuth)
- **Frontend:** EJS, CSS (You can enhance it with Bootstrap/Tailwind)
- **Session Management:** express-session
- **Security:** bcrypt for password hashing

---

## 🎯 Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/VaibhavTushir/book-notes.git
cd book-notes
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Set up environment variables
Create a `.env` file in the root folder and add:
```ini
PORT=3000
PG_USER=your_db_username
PG_PASSWORD=your_db_password
PG_HOST=your_db_host
PG_DATABASE=your_db_name
PG_PORT=your_db_port
SESSION_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SALT_ROUNDS=10
```

### 4️⃣ Start the application
```bash
npm start
```
Your server will run at: **http://localhost:3000**

---


## 🔥 Future Enhancements
- 🌟 **Improve UI** with Tailwind/Bootstrap
- 🖼️ **Book Cover Previews**
- 📚 **Book Recommendations**
- 🎭 **Dark Mode**

---

## 🤝 Contributing
Feel free to fork this repo, make improvements, and submit a pull request! 😃

---

## 📝 License
This project is open-source and available under the **MIT License**.

---

## 💡 Author
👨‍💻 **Vaibhav Tushir**  
📧 [Your Email]  
🔗 [Your LinkedIn/GitHub Profile]

