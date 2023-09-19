import passport from 'passport';

const auth = (req, res, next) => {
	passport.authenticate('jwt', { session: false }, (err, user) => {
		if (err || !user) {
			return res.status(401).json({
				status: 'error',
				code: 401,
				message: 'Unauthorized',
				data: 'Unauthorized',
			});
		}
		req.user = user;
		next();
	})(req, res, next);
};

export default auth;
