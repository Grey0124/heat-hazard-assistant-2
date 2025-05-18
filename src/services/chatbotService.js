// src/services/chatbotService.js
import axios from 'axios';

// In a production environment, you would configure this properly with environment variables
const BACKEND_API_URL = 'https://your-backend-api.com';

/**
 * Process messages and get a response from OpenAI
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<Object>} OpenAI API response
 */
export const getChatbotResponse = async (messages) => {
  try {
    // In a production app, you would send this request to your backend
    // which would then make the actual OpenAI API call with your API key
    const response = await axios.post(`${BACKEND_API_URL}/api/openai/chat`, {
      messages
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating chatbot response:', error);
    throw error;
  }
};

/**
 * Generates fallback responses when API is unavailable
 * @param {string} message - User's message
 * @returns {string} Fallback response
 */
export const getFallbackResponse = (message) => {
  const lowerCaseMessage = message.toLowerCase();
  
  // Heat-related health issues
  if (lowerCaseMessage.includes('heat stroke') || lowerCaseMessage.includes('heatstroke')) {
    return "Heat stroke is a severe condition when your body temperature rises to 104°F (40°C) or higher. Symptoms include hot, red skin, rapid and strong pulse, dizziness, confusion, and potentially unconsciousness. It's a medical emergency - call emergency services immediately if you suspect heat stroke.";
  }
  
  if (lowerCaseMessage.includes('heat exhaustion')) {
    return "Heat exhaustion symptoms include heavy sweating, cold/pale/clammy skin, fast/weak pulse, nausea, muscle cramps, tiredness, dizziness, headache, and fainting. Move to a cool place, loosen clothing, apply cool wet cloths to the body, and sip water. Seek medical attention if symptoms worsen or last longer than 1 hour.";
  }
  
  if (lowerCaseMessage.includes('heat cramps')) {
    return "Heat cramps are painful muscle contractions, often in the abdomen, arms, or legs, caused by dehydration and loss of electrolytes from heavy sweating. To treat heat cramps, stop activity, move to a cool place, drink water or a sports drink, and rest. Seek medical help if cramps last longer than an hour.";
  }
  
  // Prevention and safety
  if (lowerCaseMessage.includes('stay safe') || lowerCaseMessage.includes('extreme heat') || lowerCaseMessage.includes('protect')) {
    return "To stay safe in extreme heat: 1) Stay hydrated by drinking plenty of water, 2) Wear lightweight, light-colored, loose-fitting clothing, 3) Limit outdoor activities during peak sun hours (10am-4pm), 4) Use sunscreen with SPF 30+, 5) Seek air-conditioned environments, 6) Take cool showers when possible, 7) Check on vulnerable people around you.";
  }
  
  if (lowerCaseMessage.includes('hydrate') || lowerCaseMessage.includes('water') || lowerCaseMessage.includes('drink')) {
    return "Staying hydrated is crucial during hot weather. Drink water regularly, even if you don't feel thirsty. Aim for 8-10 glasses of water daily during hot weather. Sports drinks with electrolytes can be beneficial if you're sweating heavily. Avoid alcohol and caffeine as they can contribute to dehydration.";
  }
  
  if (lowerCaseMessage.includes('clothing') || lowerCaseMessage.includes('wear')) {
    return "During hot weather, wear lightweight, light-colored, loose-fitting clothing. Light colors reflect heat and sunlight. Natural fabrics like cotton are more breathable than synthetic materials. Wear a wide-brimmed hat and sunglasses to protect your face and eyes from direct sun exposure.";
  }
  
  // App features
  if (lowerCaseMessage.includes('cooling center') || lowerCaseMessage.includes('cool place')) {
    return "Cooling centers are air-conditioned public facilities designated to provide respite during extreme heat events. They often include libraries, community centers, and government buildings. You can locate cooling centers on our Heat Map page or by contacting local authorities.";
  }
  
  if (lowerCaseMessage.includes('report') || lowerCaseMessage.includes('hazard')) {
    return "You can report a heat hazard by using our 'Report Issue' feature. Navigate to the Report Issue page, provide details about the hazard type, location, and severity. Your reports help us improve community safety during extreme heat events.";
  }
  
  if (lowerCaseMessage.includes('heat map') || lowerCaseMessage.includes('temperature map')) {
    return "Our Heat Map feature shows real-time temperature and heat risk information across different areas. It uses color coding to indicate danger levels and shows cooling centers. You can access it from the main menu or home page of the app.";
  }
  
  if (lowerCaseMessage.includes('route') || lowerCaseMessage.includes('path') || lowerCaseMessage.includes('walking')) {
    return "Our Safe Route Planner helps you find paths with maximum shade coverage and cooling spots. It considers the current heat index and provides custom safety recommendations for your journey. Access it from the 'Safe Route' option in the menu.";
  }
  
  // Help for others
  if (lowerCaseMessage.includes('help someone') || lowerCaseMessage.includes('signs')) {
    return "If someone shows signs of heat-related illness: 1) Move them to a cool place, 2) Help them hydrate if conscious, 3) Apply cool, wet cloths to their body, 4) If they have hot, red skin, are confused, or unconscious, call emergency services immediately as these are signs of heat stroke, which is life-threatening.";
  }
  
  if (lowerCaseMessage.includes('vulnerable') || lowerCaseMessage.includes('elderly') || lowerCaseMessage.includes('children')) {
    return "Vulnerable populations like the elderly, children, and those with chronic illnesses need extra attention during extreme heat. Check on elderly neighbors regularly, never leave children or pets in vehicles, ensure everyone stays hydrated, and help them access cooling centers if needed.";
  }
  
  // General chat
  if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.match(/^hey/)) {
    return "Hello! I'm your HeatSafe assistant. I can help with questions about heat safety, identifying heat-related health issues, or using the app's features. How can I assist you today?";
  }
  
  if (lowerCaseMessage.includes('thank')) {
    return "You're welcome! Stay safe and remember to take precautions during hot weather. Feel free to ask if you have any other questions about heat safety.";
  }
  
  // Default response
  return "I'm your HeatSafe assistant, here to help with questions about extreme heat safety, heat-related health issues, or using the HeatSafe app. Could you provide more details about what you'd like to know?";
};

export default {
  getChatbotResponse,
  getFallbackResponse
};