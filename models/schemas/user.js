import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const Schema = mongoose.Schema;

const userSchema = new Schema({
	password: {
		type: String,
		required: [true, 'Password is required'],
	},
	email: {
		type: String,
		required: [true, 'Email is required'],
		unique: true,
	},
	verify: {
		type: Boolean,
		default: false,
	},
	verificationToken: {
		type: String,
		required: [true, 'Verify token is required'],
	},
	subscription: {
		type: String,
		enum: ['starter', 'pro', 'business'],
		default: 'starter',
	},
	token: {
		type: String,
		default: null,
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: 'user',
	},
	avatarURL: String,
});

userSchema.methods.setPassword = function (password) {
	this.password = bcrypt.hashSync(password, bcrypt.genSaltSync(6));
};

userSchema.methods.validPassword = function (password) {
	return bcrypt.compareSync(password, this.password);
};

export default mongoose.model('User', userSchema);
