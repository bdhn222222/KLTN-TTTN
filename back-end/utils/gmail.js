import nodemailer from "nodemailer";
import { configDotenv } from "dotenv";

configDotenv({ path: "../.env" });

export const sendOTP = async (email, otp_code, link) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  try {
  } catch (error) {
    throw new Error(error.message);
  }
};

export const sendVerifyLink = async (email, link) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Verification OTP",
      html: `
            <p>Hello</p>
            <p>Verify link is valid for 5 minutes.</p>.
            <p>Click <a href="${link}">here</a> to verify your account.</p>
        `,
    };

    transport.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } catch (error) {
    throw new Error(error.message);
  }
};