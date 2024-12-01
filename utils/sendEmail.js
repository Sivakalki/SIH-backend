const nodemailer = require("nodemailer");
const dotenv = require('dotenv')

dotenv.config()
const transporter = nodemailer.createTransport({
    service : 'gmail',
//   host: "smtp.ethereal.email",
//   port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

const sendMail = async (receiver_mail_id, text, subject) => {
    try {
      if (!process.env.USER_EMAIL || !process.env.APP_PASSWORD) {
        throw new Error("Email credentials are not set in the environment variables.");
      }
  
      const info = await transporter.sendMail({
        from: `"Mee Seva" <${process.env.USER_EMAIL}>`, // sender address
        to: receiver_mail_id,
        subject: subject,
        text: text,
        html: `<p>${text}</p>`,
      });
  
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
};
  

// sendMail("aluribalakalki3@gmail.com", "Download Your caste certificate", "Caste Certificate","C:/Users/sivak/Downloads/ff2a9149-487f-4ba8-a5e6-cc2c46c20da5.jpg")
// .then(response => console.log(response))
// .catch(err => console.error(err));

module.exports = {sendMail}