import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
//const PORT = 3000;

// View engine + static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // body parser za forme

// Sessions (za "one-time" sticky)
app.use(
  session({
    secret: "dev-only-change-me", // u produkciji koristi env varijablu
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 }, // 30 min
  })
);

// ------------ IN-MEMORY "DB" ------------
let posts = [];   // { id, title, content, createdAt }
let nextId = 1;
// ----------------------------------------

// HOME — lista + top3 za sticky notes (samo JEDNOM nakon objave)
app.get("/", (req, res) => {
  const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);

  const showSticky = req.session?.showSticky === true;
  req.session.showSticky = false;

  const top = showSticky ? sorted.slice(0, 5) : []; // do 5 postova za sticky
  res.render("index", { pageTitle: "Blog App", posts: sorted, top });
});


// NEW — forma
app.get("/posts/new", (req, res) => {
  res.render("new", {
    pageTitle: "New Post",
    errors: [],
    values: { title: "", content: "" },
  });
});

// CREATE — obrada forme
app.post("/posts", (req, res) => {
  const { title, content } = req.body;
  const errors = [];
  if (!title?.trim()) errors.push("Title is required.");
  if (!content?.trim()) errors.push("Content is required.");

  if (errors.length) {
    return res.status(400).render("new", {
      pageTitle: "New Post",
      errors,
      values: { title, content },
    });
  }

  posts.push({
    id: nextId++,
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date(),
  });

  // signal početnoj da prikaže sticky-ije SAMO jednom
  req.session.showSticky = true;

  res.redirect("/");
});

// SHOW — pojedinačan post
app.get("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).send("Post not found.");
  res.render("show", { pageTitle: post.title, post });
});

// 404 fallback (opciono)
app.use((req, res) => res.status(404).send("Not found."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
