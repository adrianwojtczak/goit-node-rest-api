import express from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import gravatar from 'gravatar';

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import jimp from 'jimp';
import multer from 'multer';

import 'dotenv/config';

import auth from '../../middleware/auth.js';
import User from '../../models/schemas/user.js';
import sendVerificationEmail from '../../middleware/sendVerificationEmail.js';
import generateVerificationToken from '../../middleware/verificationToken.js';

const jwt_secret = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AVATARS_FOLDER = path.join(__dirname, '../../public/avatars');
const TMP_FOLDER = path.join(__dirname, '../../tmp');

const router = express.Router();

const ensureFoldersExist = async () => {
	try {
		await fs.mkdir(AVATARS_FOLDER, { recursive: true });
		await fs.mkdir(TMP_FOLDER, { recursive: true });
	} catch (err) {
		console.error('Error creating folders:', err);
	}
};

ensureFoldersExist();

const addUserSchema = Joi.object({
	password: Joi.string()
		.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
		.required()
		.messages({
			'string.pattern.base':
				'Password must contain at least 8 characters, one uppercase letter, one digit, and one special character.',
		}),
	email: Joi.string().email().required(),
});

const avatarStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'tmp');
	},
	filename: (req, file, cb) => {
		const avatarFileName = `${req.user._id.toString()}${path.extname(file.originalname)}`;
		cb(null, avatarFileName);
	},
});

const upload = multer({
	storage: avatarStorage,
	limits: {
		fileSize: 1024 * 1024,
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Invalid file type. Only images are allowed.'));
		}
	},
});

router.post('/signup', async (req, res, next) => {
	const { email, password, subscription } = req.body;

	const user = await User.findOne({ email });

	if (user) {
		return res.status(409).json({
			status: 'error',
			code: 409,
			message: 'Email is already in use',
			data: 'Conflict',
		});
	}

	const { error } = addUserSchema.validate(req.body);

	if (error) {
		return res.status(400).json({
			status: 'error',
			code: 400,
			message: 'Bad Request',
			data: `${error.details[0].message}`,
		});
	}

	try {
		const newUser = new User({ email, subscription });
		newUser.setPassword(password);

		const avatar = gravatar.url(email, { s: '250', d: 'retro' });
		newUser.avatarURL = avatar;

		const verificationToken = generateVerificationToken();
		newUser.verificationToken = verificationToken;

		await newUser.save();

		await sendVerificationEmail({ email, verificationToken: newUser.verificationToken });

		res.status(201).json({
			status: 'success',
			code: 201,
			data: {
				user: {
					subscription: newUser.subscription || 'starter',
					message: 'Registration successful',
				},
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			code: 500,
			message: 'Internal Server Error',
			data: 'Registration Failure',
		});
	}
});

router.post('/verify', async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({
				status: 'error',
				code: 404,
				message: 'User not found',
				data: 'Not Found',
			});
		}

		if (user.verify) {
			return res.status(400).json({
				status: 'error',
				code: 400,
				message: 'Verification has already been passed',
				data: 'Bad Request',
			});
		}

		await sendVerificationEmail({ email, verificationToken: user.verificationToken });

		res.status(200).json({
			status: 'success',
			code: 200,
			message: 'Verification email sent',
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			code: 500,
			message: 'Internal Server Error',
			data: 'Email Sending Failure',
		});
	}
});

router.get('/verify/:verificationToken', async (req, res) => {
	try {
		const { verificationToken } = req.params;
		const user = await User.findOne({ verificationToken });

		if (!user) {
			return res.status(404).json({
				status: 'error',
				code: 404,
				message: 'User not found',
				data: 'Not Found',
			});
		}

		await User.findByIdAndUpdate(user._id, {
			verificationToken: '',
			verify: true,
		});

		res.status(200).json({
			status: 'success',
			code: 200,
			message: 'Verification successful',
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			code: 500,
			message: 'Internal Server Error',
			data: 'Verification process failed',
		});
	}
});

router.post('/login', async (req, res, next) => {
	const { email, password } = req.body;
	const user = await User.findOne({ email });

	if (!user) {
		return res.status(404).json({
			status: 'error',
			code: 404,
			message: 'User not found',
			data: 'Not Found',
		});
	}

	if (!user || !user.validPassword(password)) {
		return res.status(401).json({
			status: 'error',
			code: 401,
			message: 'Email or password is wrong',
			data: 'Bad request',
		});
	}

	if (!user.verify) {
		return res.status(401).json({
			status: 'error',
			code: 401,
			message: 'Email is not verified',
			data: 'Unauthorized',
		});
	}

	try {
		const payload = {
			id: user.id,
			email: user.email,
			subscription: user.subscription,
		};

		const token = jwt.sign(payload, jwt_secret, { expiresIn: '1h' });
		res.status(200).json({
			status: 'success',
			code: 200,
			data: {
				token,
				user: {
					email: `${payload.email}`,
					subscription: `${payload.subscription}`,
				},
			},
		});

		user.token = token;
		await user.save();
	} catch (err) {
		console.error(err);
		return res.status(400).json({
			status: 'Bad request',
			code: 400,
			message: 'Login failed',
		});
	}
});

router.get('/current', auth, (req, res) => {
	const { email, subscription } = req.user;

	try {
		const id = req.user.id;
		const user = async id => {
			try {
				const user = await User.findById(id);
				if (!user) {
					return null;
				} else {
					return user;
				}
			} catch (error) {
				console.log(error);
			}
		};

		if (!user) {
			return res.json({
				status: 'error',
				code: 401,
				data: {
					message: `Unauthorized`,
				},
			});
		} else {
			return res.json({
				status: 'success',
				code: 200,
				data: {
					message: `Authorization successful`,
					email,
					subscription,
				},
			});
		}
	} catch (err) {
		console.error(err);
		return res.status(400).json({
			status: 'Bad request',
			code: 400,
			message: 'Get User Failed',
		});
	}
});

router.get('/logout', auth, async (req, res, next) => {
	const { user } = req;

	try {
		user.token = null;
		await user.save();

		return res.status(204).send();
	} catch (err) {
		return res.status(401).json({
			status: 'Unauthorized',
			code: 401,
			message: `Not authorized`,
		});
	}
});

router.patch('/avatars', auth, upload.single('avatar'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				status: 'error',
				code: 400,
				message: 'No avatar uploaded',
				data: 'Bad Request',
			});
		}

		const avatarPath = path.join('tmp', req.file.filename);
		const avatar = await jimp.read(avatarPath);
		await avatar.cover(250, 250).writeAsync(avatarPath);

		const newAvatarFileName = `${req.user._id.toString()}.jpg`;
		const newAvatarPath = path.join(AVATARS_FOLDER, newAvatarFileName);
		await fs.rename(avatarPath, newAvatarPath);

		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({
				status: 'error',
				code: 404,
				message: 'User not found',
				data: 'Not Found',
			});
		}
		user.avatarURL = `/avatars/${newAvatarFileName}`;
		await user.save();

		res.status(200).json({
			status: 'success',
			code: 200,
			avatarURL: user.avatarURL,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			status: 'error',
			code: 500,
			message: 'Internal Server Error',
			data: 'Avatar update failed',
		});
	}
});

export default router;
