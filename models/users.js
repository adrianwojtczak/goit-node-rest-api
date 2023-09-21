import User from './schemas/user.js';

const createUser = ({ email, password, subscription }) => {
	const newUser = new User({ email, password, subscription });
	return newUser.save();
};

const findUserByEmail = email => {
	return User.findOne({ email });
};

const findUserById = id => {
	return User.findById(id);
};

const updateUserToken = (id, token) => {
	return User.findByIdAndUpdate(id, { token });
};

export { createUser, findUserByEmail, findUserById, updateUserToken };
