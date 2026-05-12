const { ContactMessage } = require("../models");

const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const savedMessage = await ContactMessage.create({
      name,
      email,
      phone,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        id: savedMessage.id,
        createdAt: savedMessage.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.findAll({ order: [["createdAt", "DESC"]] });
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
};
