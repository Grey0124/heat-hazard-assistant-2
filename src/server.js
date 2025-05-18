// server.js - Updated with chatbot routes
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const chatbotRoutes = require('./server/chatbotRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Make sure to set this in your .env file
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// OpenAI recommendations endpoint
app.post('/api/openai/recommendations', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.weather || !data.route) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const { user, route, weather, heatIndex } = data;

    // Construct a prompt for OpenAI based on the data
    const prompt = constructPrompt(user, route, weather, heatIndex);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or another appropriate model
      messages: [
        { 
          role: "system", 
          content: "You are an expert in heat safety and public health. Provide personalized, specific recommendations for people walking outdoors in hot weather conditions. Focus on practical advice that can help prevent heat-related illnesses." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    // Process the response
    const recommendations = processOpenAIResponse(completion.choices[0].message.content);
    
    res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

// Use chatbot routes
app.use('/api/openai', chatbotRoutes);

// Helper function to construct the prompt for OpenAI
function constructPrompt(user, route, weather, heatIndex) {
  let userContext = '';
  if (user) {
    userContext = `The person is ${user.age || 'an adult'} years old`;
    if (user.healthConditions && user.healthConditions.length > 0) {
      userContext += ` and has the following health conditions: ${user.healthConditions.join(', ')}.`;
    } else {
      userContext += '.';
    }
  }

  const routeInfo = `
    They plan to walk a route that is ${route.distance} with an estimated duration of ${route.duration}.
    The route has approximately ${route.shadeCoverage}% shade coverage.
  `;

  const weatherInfo = `
    Current weather conditions:
    - Temperature: ${weather.main.temp}°F
    - Feels like: ${weather.main.feels_like}°F
    - Humidity: ${weather.main.humidity}%
    - Weather conditions: ${weather.weather[0].description}
    - Heat index: ${heatIndex}°F
  `;

  return `
    ${userContext}
    ${routeInfo}
    ${weatherInfo}
    
    Please provide 5-7 personalized heat safety recommendations for this specific situation.
    Focus on practical advice that will help them avoid heat-related illnesses during their journey.
    Include any warning signs they should watch for and actions they should take if they start feeling unwell.
    Format each recommendation as a bullet point.
  `;
}

// Helper function to process OpenAI response
function processOpenAIResponse(responseText) {
  // Basic processing - split by line breaks and filter for bullet points
  // You might need more sophisticated processing depending on the model's output format
  const lines = responseText.split('\n');
  const recommendations = lines
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.replace(/^[-•]\s*/, '').trim());
  
  // If no bullet points were found, return the whole text split by newlines
  if (recommendations.length === 0) {
    return responseText.split('\n').filter(line => line.trim() !== '');
  }
  
  return recommendations;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
