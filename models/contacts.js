import Contact from './schemas/contact.js';

const listContacts = async () => {
	return Contact.find();
};

const getContactById = contactId => {
	return Contact.findOne({ _id: contactId });
};

const removeContact = contactId => {
	return Contact.findByIdAndRemove({ _id: contactId });
};

const addContact = ({ name, email, phone }) => {
	return Contact.create({ name, email, phone });
};

const updateContact = (contactId, fields) => {
	return Contact.findByIdAndUpdate({ _id: contactId }, fields, { new: true });
};

const updateContactStatus = (contactId, body) => {
	return Contact.findByIdAndUpdate(contactId, body);
};

export {
	listContacts,
	getContactById,
	removeContact,
	addContact,
	updateContact,
	updateContactStatus,
};
