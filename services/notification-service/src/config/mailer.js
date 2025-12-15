const nodemailer = require('nodemailer');

const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
  };

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  const transporter = nodemailer.createTransport(config);

  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection error:', error);
    } else {
      console.log('✅ SMTP ready to send emails');
    }
  });

  return transporter;
};

const transporter = createTransporter();

const sendEmail = async (emailOptions) => {
  try {
    const { to, subject, html, text } = emailOptions;

    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'ScriptumAI',
        address: process.env.SMTP_FROM_EMAIL || 'noreply@scriptumai.com',
      },
      to,
      subject,
      html,
      text: text || '',
    };

    console.log(`Sending email to: ${to}`);

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('Failed to send email:', error);

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

module.exports = { transporter, sendEmail };