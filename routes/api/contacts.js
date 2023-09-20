import express from 'express';
import auth from '../../middleware/auth.js';

const router = express.Router();

import {
	listContacts,
	getContactById,
	addContact,
	removeContact,
	updateContact,
	updateContactStatus,
} from '../../models/contacts.js';

router.get('/', auth, async (req, res, next) => {
	try {
		const contacts = await listContacts();
		res.status(200).json({
			status: 'success',
			code: 200,
			data: { contacts },
		});
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

router.get('/:contactId', auth, async (req, res, next) => {
	const { contactId } = req.params;

	try {
		const contact = await getContactById(contactId);

		if (contact) {
			res.status(200).json({
				status: 'success',
				code: 200,
				data: { contact },
			});
		} else {
			res.status(404).json({
				status: 'Contact not found',
				code: 404,
				message: 'Not found',
			});
		}
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

router.post('/', auth, async (req, res, next) => {
	const { name, email, phone } = req.body;
	try {
		const addedContact = await addContact({ name, email, phone });

		res.status(201).json({
			status: 'success',
			code: 201,
			data: { addedContact },
		});
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

router.delete('/:contactId', auth, async (req, res, next) => {
	const { contactId } = req.params;
	const contact = await getContactById(contactId);

	try {
		if (contact) {
			await removeContact(contactId);

			res.status(200).json({
				status: 'success',
				code: 200,
				message: 'Contact deleted',
			});
		} else {
			res.status(404).json({
				status: 'Contact not found',
				code: 404,
				message: 'Not found',
			});
		}
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

router.put('/:contactId', auth, async (req, res, next) => {
	const { contactId } = req.params;
	const updatedContact = req.body;
	const contact = await getContactById(contactId);
	try {
		const editedContact = await updateContact(contactId, updatedContact);

		if (contact) {
			res.status(200).json({
				status: 'success',
				code: 200,
				data: { editedContact },
			});
		} else {
			res.status(404).json({
				status: 'Contact not found',
				code: 404,
				message: 'Not found',
			});
		}
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

router.patch('/:contactId/favorite', auth, async (req, res, next) => {
	const { contactId } = req.params;
	const { favorite } = req.body;

	if (favorite === undefined || favorite === null) {
		return res.status(400).json({
			status: 'error',
			code: 400,
			message: 'Missing field favorite',
		});
	}

	try {
		const contactStatus = await updateContactStatus(contactId, { favorite });
		if (contactStatus) {
			res.json({
				status: 'success',
				code: 200,
				data: { favorite },
			});
		} else {
			res.status(404).json({
				status: 'error',
				code: 404,
				message: `Not found contacts id: ${contactId}`,
				data: 'Not Found',
			});
		}
	} catch (err) {
		res.status(500).json({
			status: 'Internal Server Error',
			code: 500,
			message: err?.message,
		});
	}
});

export default router;
