const contactService = require("../services/contactService");

exports.submitContact = async (req, res) => {
  try {
    const { fullName, email, subject, message } = req.body;

    const contact = await contactService.submitContact({
      fullName,
      email,
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Your message has been sent. We'll get back to you shortly.",
      data: contact,
    });
  } catch (error) {
    console.error("Submit contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit contact form",
      error: error.message,
    });
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const { search, page, limit } = req.query;

    const result = await contactService.getAllContacts(
      { search },
      { page, limit },
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact submissions",
      error: error.message,
    });
  }
};

exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await contactService.getContactById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact submission",
      error: error.message,
    });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await contactService.deleteContact(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact submission not found",
      });
    }

    res.json({
      success: true,
      message: "Contact submission deleted successfully",
    });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete contact submission",
      error: error.message,
    });
  }
};
