require('dotenv').config();
const express = require('express');
const Brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Brevo API Setup
let apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Function to send email
async function sendEmail(toEmail, subject, htmlContent) {
  try {
    console.log(`📧 Sending email FROM: ${process.env.BREVO_EMAIL} TO: ${toEmail}`);
    
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "Sanket", email: process.env.BREVO_EMAIL };
    sendSmtpEmail.to = [{ email: toEmail }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent successfully");
    console.log(`✅ Message ID: ${data.body.messageId}`);
    return data;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}

// Path for ratings file
const ratingsFile = path.join(__dirname, 'ratings.json');

// Ensure ratings file exists
if (!fs.existsSync(ratingsFile)) {
  fs.writeFileSync(ratingsFile, JSON.stringify([], null, 2));
}

// POST route for sending email
app.post('/sendmail', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'name, email, subject, and message are required' });
    }

    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
            .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
            .message { white-space: pre-wrap; word-wrap: break-word; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📧 ${subject}</h2>
            </div>
            <div class="content">
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <hr>
              <p><strong>Message:</strong></p>
              <div class="message">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            </div>
            <p class="footer">This is an automated message from Portfolio</p>
          </div>
        </body>
      </html>
    `;

    console.log(`📨 Email from: ${name} (${email})`);
    console.log(`📨 Subject: ${subject}`);
    console.log(`📨 Email body:\n${htmlContent}`);

    // Send email to sanketuphade77@gmail.com
    sendEmail('sanketuphade77@gmail.com', subject, htmlContent).then((result) => {
      console.log("✅ Email sent! Response:", result);
      console.log(`📬 Email successfully sent FROM: ${process.env.BREVO_EMAIL} TO: sanketuphade77@gmail.com`);
      res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        from_name: name,
        from_email: email,
        to: 'sanketuphade77@gmail.com',
        messageId: result.body.messageId
      });
    }).catch((error) => {
      console.error("❌ Email failed:", error);
      res.status(500).json({ 
        error: 'Failed to send email', 
        details: error.message 
      });
    });
  } catch (error) {
    console.error('Email route error:', error.message);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
});

// POST route for storing ratings
app.post('/rate', (req, res) => {
  try {
    const { rating, rating_message, username } = req.body;
    const ratingNumber = parseInt(rating);

    // Validate inputs
    if (!ratingNumber || !rating_message || !username) {
      return res.status(400).json({
        error: 'Username, rating and rating_message are required'
      });
    }

    if (ratingNumber < 1 || ratingNumber > 5) {
      return res.status(400).json({
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    // Read existing ratings (array)
    let ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf8'));

    // New rating object
    const newRating = {
      id: Date.now(),
      username: username.trim(),   // 👈 store user name
      rating: ratingNumber,        // 👈 store as NUMBER
      rating_message: rating_message.trim(),
      timestamp: new Date().toISOString()
    };

    // Push & save
    ratings.push(newRating);
    fs.writeFileSync(ratingsFile, JSON.stringify(ratings, null, 2));

    res.status(200).json({
      success: true,
      message: 'Rating saved successfully',
      data: newRating
    });

  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({
      error: 'Failed to save rating',
      details: error.message
    });
  }
});


// GET route to retrieve all ratings
app.get('/ratings', (req, res) => {
  try {
    const ratings = JSON.parse(fs.readFileSync(ratingsFile, 'utf8'));

    const total = ratings.reduce(
      (sum, item) => sum + Number(item.rating),
      0
    );

    const average = ratings.length
      ? (total / ratings.length).toFixed(1)
      : 0;

    res.status(200).json({
      ratings,
      averageRating: Number(average),
      totalRatings: ratings.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});



// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📧 Brevo email service configured');
});
