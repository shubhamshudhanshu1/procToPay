const validateRegister = (req, res, next) => {
  const { email, password, name } = req.body;
  const errors = [];

  // Email validation
  if (!email) {
    errors.push("Email is required");
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.push("Email is invalid");
  }

  // Password validation
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  // Name validation (optional)
  if (name && name.trim().length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
