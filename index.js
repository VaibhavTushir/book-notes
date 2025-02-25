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
  port: process.env.PG_PORT,
});
db.connect();

// ---------------- ROUTES ----------------
//To be modified

// Home route
app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// Registration page
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Logout route
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
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
      hash = await bcrypt.hash(password, saltRounds);
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
      usernameField: "identifier",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, identifier, password, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE username=$1 OR email=$1",
          [identifier]
        );
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
        console.log(profile);

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
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return cb(null, false);
    }

    return cb(null, result.rows[0]); // Attach user data to request object
  } catch (err) {
    return cb(err);
  }
});
