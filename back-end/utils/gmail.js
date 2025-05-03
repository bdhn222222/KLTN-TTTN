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

export const sendEmailAcceptAppointment = async (email, username, datetime) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Appointment Accepted",
      html: `
      <p>Hello ${username}</p>
      <p>Your appointment has been accepted.</p>
      <p>Date and time: ${datetime}</p>
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

export const sendEmailCancelAppointment = async (email, username, datetime) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Appointment Cancelled",
      html: `
      <p>Hello ${username}</p>
      <p>Your appointment has been cancelled.</p>
      <p>Date and time: ${datetime}</p>
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

export const sendVerifyLink = async (email, link) => {
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  try {
    const mailOptions = {
      from: process.env.MAIL_USER,
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
