import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendOtpEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: `"DocMind" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your DocMind OTP Verification Code",
    html: `
      <h2>DocMind Email Verification</h2>
      <p>Your OTP is:</p>
      <h1 style="color:#6D28D9">${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
    `,
  });
}
