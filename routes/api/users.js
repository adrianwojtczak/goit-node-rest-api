import express from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

import auth from '../../middleware/auth.js';
import User from '../../models/schemas/user.js';

const jwt_secret = process.env.JWT_SECRET;

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

export default router;
