const dotenv = require('dotenv/config');

// Access the Twilio credentials from the environment
const twilio = require('twilio');

// Use the environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM;

// Initialize Twilio client
const client = new twilio(accountSid, authToken);

// Function to send SMS
const sendSms = async (to, body) => {
  try {
    const message = await client.messages.create({
      body:body,       // The message content
      from: fromNumber,   // Your Twilio phone number
      to: to       // The recipient's phone number (must be verified with Twilio)
    });
    console.log('SMS sent successfully:', message.sid);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
};

// sendSms("+918008286137", "The caste certificate application has been successfully submitted.");

// Function to send WhatsApp message
const sendWhatsappMessage = async (to, body) => {
    try {
        const message = await client.messages.create({
            body,       // The message content
            from: whatsappFromNumber,  // Your WhatsApp-enabled Twilio number
            to: `whatsapp:${to}`       // The recipient's WhatsApp number, ensure it's formatted correctly
        });
        console.log('WhatsApp message sent successfully:', message.sid);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
    }
};

// sendWhatsappMessage("+918008286137", "The caste certificate application has been successfully submitted.");


module.exports = { sendSms, sendWhatsappMessage };