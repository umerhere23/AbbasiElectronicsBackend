const { User } = require("../models");

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({ name, email });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
};
