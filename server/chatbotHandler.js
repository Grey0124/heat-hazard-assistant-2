// server/chatbotHandler.js
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Make sure to set this in your .env file
});

/**
 * Handle chatbot requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleChatbotRequest = async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    // Make sure first message has system role for context
    const messagesWithSystem = messages.some(msg => msg.role === 'system') 
      ? messages 
      : [
          { 
            role: 'system', 
            content: 'You are a helpful assistant focused on heat safety. Provide concise, accurate information about heat-related dangers, safety tips, and recommendations. Your primary goal is to help people stay safe during extreme heat conditions. Keep responses under 200 words unless the user specifically asks for detailed information.' 
          },
          ...messages
        ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or another appropriate model
      messages: messagesWithSystem,
      temperature: 0.7,
      max_tokens: 500
    });

    // Return the response
    res.status(200).json({ content: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in chatbot request:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      message: error.message
    });
  }
};

module.exports = {
  handleChatbotRequest
};