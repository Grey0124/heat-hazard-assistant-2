// server/chatbotRoutes.js
const express = require('express');
const { handleChatbotRequest } = require('./chatbotHandler');

const router = express.Router();

// POST endpoint for chatbot
router.post('/chat', handleChatbotRequest);

module.exports = router;