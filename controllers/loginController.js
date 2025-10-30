// controllers/loginController.js

/**
 * Render login page
 * @route GET /login
 */
const loginView = (req, res) => {
  try {
    res.render("login", {
      title: "Login",
    });
  } catch (err) {
    console.error("❌ Error rendering login page:", err.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  loginView,
};
