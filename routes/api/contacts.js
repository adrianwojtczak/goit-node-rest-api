const express = require("express");
const Joi = require("joi");

const router = express.Router();

const {
  listContacts,
  getContactById,
  addContact,
  removeContact,
  updateContact,
} = require("../../models/contacts");

const addSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
});

const updateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string(),
}).or("name", "email", "phone");

router.get("/", async (req, res, next) => {
  try {
    const contacts = await listContacts();
    res.status(200).json({
      status: "success",
      code: 200,
      data: { contacts },
    });
  } catch (err) {
    res.status(500).json({
      status: "Internal Server Error",
      code: 500,
      message: err?.message,
    });
  }
});

router.get("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;

  try {
    const contact = await getContactById(contactId);

    if (contact) {
      res.status(200).json({
        status: "success",
        code: 200,
        data: { contact },
      });
    } else {
      res.status(404).json({
        status: "Contact not found",
        code: 404,
        message: "Not found",
      });
    }
  } catch (err) {
    res.status(500).json({
      status: "Internal Server Error",
      code: 500,
      message: err?.message,
    });
  }
});

// router.post("/", async (req, res, next) => {
//   const newContact = req.body;

//   try {
//     const addedContact = await addContact(newContact);

//     if (!newContact.name) {
//       res.status(400).json({
//         status: "Missing required fields",
//         code: 400,
//         message: "Missing required name - name",
//       });
//     } else if (!newContact.email) {
//       res.status(400).json({
//         status: "Missing required fields",
//         code: 400,
//         message: "Missing required name - email",
//       });
//     } else if (!newContact.phone) {
//       res.status(400).json({
//         status: "Missing required fields",
//         code: 400,
//         message: "Missing required name - phone",
//       });
//     } else {
//       res.status(201).json({
//         status: "success",
//         code: 200,
//         data: { addedContact },
//       });
//     }
//   } catch (err) {
//     res.status(500).json({
//       status: "Internal Server Error",
//       code: 500,
//       message: err?.message,
//     });
//   }
// });

// router.post("/", async (req, res, next) => {
//   const newContact = req.body;

//   const missingFields = [];

//   if (!newContact.name) {
//     missingFields.push("name");
//   }
//   if (!newContact.email) {
//     missingFields.push("email");
//   }
//   if (!newContact.phone) {
//     missingFields.push("phone");
//   }

//   if (missingFields.length > 0) {
//     res.status(400).json({
//       status: "Missing required fields",
//       code: 400,
//       message: `Missing required name - ${missingFields.join(", ")}`,
//     });
//   } else {
//     try {
//       const addedContact = await addContact(newContact);

//       res.status(201).json({
//         status: "success",
//         code: 201,
//         data: { addedContact },
//       });
//     } catch (err) {
//       res.status(500).json({
//         status: "Internal Server Error",
//         code: 500,
//         message: err?.message,
//       });
//     }
//   }
// });

router.post("/", async (req, res, next) => {
  const newContact = req.body;

  const { error } = addSchema.validate(newContact);

  if (error) {
    res.status(400).json({
      status: "Validation Error",
      code: 400,
      message: error.details[0].message,
    });
  } else {
    try {
      const addedContact = await addContact(newContact);

      res.status(201).json({
        status: "success",
        code: 201,
        data: { addedContact },
      });
    } catch (err) {
      res.status(500).json({
        status: "Internal Server Error",
        code: 500,
        message: err?.message,
      });
    }
  }
});

router.delete("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const contact = await getContactById(contactId);

  try {
    if (contact) {
      await removeContact(contactId);

      res.status(200).json({
        status: "success",
        code: 200,
        message: "Contact deleted",
      });
    } else {
      res.status(404).json({
        status: "Contact not found",
        code: 404,
        message: "Not found",
      });
    }
  } catch (err) {
    res.status(500).json({
      status: "Internal Server Error",
      code: 500,
      message: err?.message,
    });
  }
});

// router.put("/:contactId", async (req, res, next) => {
//   const { contactId } = req.params;
//   const updatedContact = req.body;
//   const contact = await getContactById(contactId);

//   if (!contact) {
//     res.status(404).json({
//       status: "Contact not found",
//       code: 404,
//       message: "Not found",
//     });
//   } else if (
//     !updatedContact.name &&
//     !updatedContact.email &&
//     !updatedContact.phone
//   ) {
//     res.status(400).json({
//       status: "Missing required fields",
//       code: 400,
//       message: "Missing fields",
//     });
//   } else {
//     try {
//       const editedContact = await updateContact(contactId, updatedContact);

//       res.status(200).json({
//         status: "success",
//         code: 200,
//         data: { editedContact },
//       });
//     } catch (error) {
//       res.status(500).json({
//         status: "Internal Server Error",
//         code: 500,
//         message: err?.message,
//       });
//     }
//   }
// });

router.put("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const updatedContact = req.body;
  const contact = await getContactById(contactId);

  if (!contact) {
    res.status(404).json({
      status: "Contact not found",
      code: 404,
      message: "Not found",
    });
  } else {
    const { error } = updateSchema.validate(updatedContact);

    if (error) {
      res.status(400).json({
        status: "Validation Error",
        code: 400,
        message: error.details[0].message,
      });
    } else {
      try {
        const editedContact = await updateContact(contactId, updatedContact);

        res.status(200).json({
          status: "success",
          code: 200,
          data: { editedContact },
        });
      } catch (error) {
        res.status(500).json({
          status: "Internal Server Error",
          code: 500,
          message: err?.message,
        });
      }
    }
  }
});

module.exports = router;
