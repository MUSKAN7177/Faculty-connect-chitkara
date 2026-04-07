const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Transporter create karein (Gmail setup)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Aapki .env se ID lega
            pass: process.env.EMAIL_PASS  // Aapki .env se 16-digit password lega
        }
    });

    // 2. Email options define karein
    const mailOptions = {
        from: `Faculty Connect <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // 3. Email bhejien
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;