import nodemailer from 'nodemailer';

import 'dotenv/config';

const EMAIL = process.env.EMAIL;
const API_KEY = process.env.EMAIL_API_KEY;
const BASE_URL = process.env.BASE_URL;

const sendVerificationEmail = async ({ email, verificationToken }) => {
	const config = {
		service: 'gmail',
		auth: {
			user: EMAIL,
			pass: API_KEY,
		},
	};

	const transporter = nodemailer.createTransport(config);

	const emailOptions = {
		from: EMAIL,
		to: email,
		subject: 'Verification Mail',
		html: `<p>Your verification code: ${verificationToken}</p><a href="${BASE_URL}/users/verify/${verificationToken}" target="_blank">Or click here </a>`,
	};

	await transporter.sendMail(emailOptions);
};

export default sendVerificationEmail;
