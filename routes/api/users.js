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

const jwt_secret = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AVATARS_FOLDER = path.join(__dirname, '../../public/avatars');

const router = express.Router();

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

		await newUser.save();
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
		next(err);
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
	} catch {
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
	}
});

router.get('/logout', auth, async (req, res, next) => {
	const { user } = req;

	try {
		user.token = null;
		await user.save();

		return res.status(204).send();
	} catch (error) {
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
			return res.status(400).json({ message: 'No avatar uploaded' });
		}

		const avatarPath = path.join('tmp', req.file.filename);
		const avatar = await jimp.read(avatarPath);
		await avatar.cover(250, 250).writeAsync(avatarPath);

		const newAvatarFileName = `${req.user._id.toString()}.jpg`;
		const newAvatarPath = path.join(AVATARS_FOLDER, newAvatarFileName);
		await fs.rename(avatarPath, newAvatarPath);

		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		user.avatarURL = `/avatars/${newAvatarFileName}`;
		await user.save();

		res.status(200).json({ avatarURL: user.avatarURL });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Server error' });
	}
});

export default router;
