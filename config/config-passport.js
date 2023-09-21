import passport from 'passport';
import passportJWT from 'passport-jwt';
import User from '../models/schemas/user.js';

import 'dotenv/config';

const jwt_secret = process.env.JWT_SECRET;

const ExtractJWT = passportJWT.ExtractJwt;
const Strategy = passportJWT.Strategy;

const params = {
	secretOrKey: jwt_secret,
	jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
};

passport.use(
	new Strategy(params, function (payload, done) {
		User.find({ _id: payload.id })
			.then(([user]) => {
				if (!user) {
					return done(new Error('User not found'));
				}
				return done(null, user);
			})
			.catch(err => done(err));
	})
);
