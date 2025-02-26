import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;

env.config();
const saltRounds = process.env.SALT_ROUNDS;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Prevents resaving unchanged sessions
    saveUninitialized: false, // Only saves session after login
    cookie: { secure: false }, // Set `true` if using HTTPS
  })
);

app.use(bodyParser.urlencoded({ extended: true })); // Parse incoming form data
app.use(express.static("public")); // Serve static files from the "public" folder

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT),
});
db.connect();

// ---------------- ROUTES ----------------
async function getBooks(type, parameter) {
  let result;
  switch (type) {
    case "random":
      result = await db.query(
        "SELECT * FROM user_books ORDER BY random() LIMIT 10"
      );
      return result.rows;
      break;
    case "id":
      result = await db.query("SELECT * FROM user_books WHERE id =$1", [
        parameter,
      ]);
      return result.rows;

      break;
    case "bookName":
      result = await db.query(
        "SELECT * FROM user_books WHERE book_name ILIKE  '%' || $1 || '%' ",
        [parameter]
      );
      return result.rows;

      break;
    default:
      break;
  }
}

// Home route
app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    res.render("home.ejs", {
      username: req.user.username,
      user_books: await getBooks("id", req.user.id),
      random_books: await getBooks("random"),
    });
  } else {
    res.render("home.ejs", {
      random_books: getBooks("random"),
    });
  }
});

// Registration page
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);
// Logout route
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/search", async (req, res) => {
  const bookName = req.body.bookName;
  const result = getBooks("bookName", bookName);
  if (result.length === 0) {
    res.render("search.ejs", {
      booksFound: false,
    });
  } else {
    res.render("search.ejs", {
      booksFound: true,
      books: result,
    });
  }
});

app.get("/newBook", (req, res) => {
  if (req.isAuthenticated()) {
    return res.render("new.ejs", {
      case: "new",
    });
  }
  return res.redirect("/");
});

app.post("/newBook", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  let img = "";
  try {
    img = await fetchImage(
      `https://covers.openlibrary.org/b/${req.body.key}/${req.body.value}-M.jpg`
    );
  } catch (error) {
    console.log(error);
  }

  try {
    await db.query(
      "INSERT INTO user_books (id,book_name, rating, review, img, author) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        req.user.id,
        req.body.book_name,
        req.body.rating,
        req.body.review,
        img,
        req.body.author,
      ]
    );
  } catch (error) {
    console.log(error);
  }
  res.redirect("/");
});

app.get("/edit/:bookId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  const bookId = req.params.bookId;
  try {
    const result = await db.query(
      "SELECT * FROM user_books  WHERE bookid=$1 AND id=$2",
      [bookId, req.user.id]
    );
    if (result.rows.length === 0) {
      res.redirect("/");
    } else {
      res.render("new.ejs", {
        case: "edit",
        book: result.rows[0],
      });
    }
  } catch (error) {
    console.log(error);
  }
});
app.post("/edit/", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }

  let img = "";
  try {
    img = await fetchImage(
      `https://covers.openlibrary.org/b/${req.body.key}/${req.body.value}-M.jpg`
    );
  } catch (error) {
    console.log(error);
  }

  try {
    await db.query(
      "UPDATE user_books SET  book_name=$1, rating=$2, review=$3, img=$4, author =$5 WHERE bookId=$6 AND id=$7",
      [
        req.body.book_name,
        req.body.rating,
        req.body.review,
        img,
        req.body.author,
        req.body.bookId,
        req.user.id,
      ]
    );
  } catch (error) {
    console.log(error);
  }
  res.redirect("/");
});

app.get("/delete/:bookId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  } else {
    userId = req.user.id;
    bookId = req.params.bookId;
    try {
      await db.query("DELETE FROM user_books WHERE id=$1 AND bookid=$2", [
        userId,
        bookId,
      ]);
    } catch (error) {
      console.log(error);
    }
    res.redirect("/");
  }
});
//Register
app.post("/register", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  try {
    // Check if the user already exists
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      return res.redirect("/login"); // Redirect to login if user exists
    }

    // Hash the password before storing it
    let hash;
    try {
      hash = bcrypt.hash(password, parseInt(saltRounds));
    } catch (error) {
      console.error("Error hashing password:", error);
      return res.status(500).send("Internal Server Error");
    }

    // Insert new user into the database
    const result = await db.query(
      "INSERT INTO users (username,email, hash) VALUES ($1, $2) RETURNING *",
      [username, email, hash]
    );

    const user = result.rows[0];

    // Log in the new user automatically after registration
    req.login(user, (err) => {
      if (err) {
        console.error("Error logging in after registration:", err);
        return res.redirect("/login");
      }
      console.log("Registration successful, user logged in.");
      res.redirect("/");
    });
  } catch (err) {
    console.log("Error during registration:", err);
    res.status(500).send("Internal Server Error");
  }
});

//Passport Strategy
passport.use(
  "local",
  new Strategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email=$1", [
          email,
        ]);
        if (result.rows.length === 0) {
          return cb(null, false, { message: "User Not Found" });
        } else {
          const user = result.rows[0];
          let valid;
          if (user.hash == "google") {
            return cb(null, false, { message: "Try Logging In via Google" });
          }
          try {
            valid = await bcrypt.compare(password, user.hash);
          } catch (error) {
            console.error("Error comparing passwords:", error);
            return cb(error);
          }
          if (valid) {
            return cb(null, user);
          } else {
            return cb(null, false);
          }
        }
      } catch (error) {
        console.log("Error in Local Strategy:", error);
        return cb(error);
      }
    }
  )
);
//Google Strategy
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/books",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        // console.log(profile);
        // Check if user already exists
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);

        if (result.rows.length === 0) {
          // If new user, insert into database
          const newUser = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2,$3) RETURNING *",
            [profile.displayName, profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});
passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query(
      "SELECT id,username FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return cb(null, false);
    }

    return cb(null, result.rows[0]); // Attach user data to request object
  } catch (err) {
    return cb(err);
  }
});
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
