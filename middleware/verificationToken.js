import { v4 as uuidv4 } from 'uuid';

const generateVerificationToken = () => {
	return uuidv4();
};

export default generateVerificationToken;
