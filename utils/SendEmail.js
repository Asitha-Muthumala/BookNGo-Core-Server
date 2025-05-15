const axios = require('axios');

/**
 * Send an email via the external email microservice.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} content - Email content/body
 * @returns {Promise<void>}
 */
const sendEmail = async (to, subject, content) => {
  try {
    const response = await axios.post('http://localhost:5001/api/send/mail', {
      email: to,
      subject,
      content
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Email sent successfully:', response.data);
  } catch (error) {
    console.error('Failed to send email:', error.response?.data || error.message);
  }
};

module.exports = sendEmail;