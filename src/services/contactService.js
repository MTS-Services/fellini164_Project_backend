const prisma = require("../config/database");

class ContactService {
  async submitContact({ fullName, email, subject, message }) {
    return prisma.contactSubmission.create({
      data: {
        fullName,
        email,
        subject,
        message,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        subject: true,
        createdAt: true,
      },
    });
  }

  async getAllContacts(filters = {}, pagination = {}) {
    const { search } = filters;
    const page = Math.max(parseInt(pagination.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(pagination.limit, 10) || 10, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [contacts, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          subject: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContactById(id) {
    return prisma.contactSubmission.findUnique({
      where: { id },
    });
  }

  async deleteContact(id) {
    const contact = await prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!contact) {
      return null;
    }

    await prisma.contactSubmission.delete({
      where: { id },
    });

    return contact;
  }
}

module.exports = new ContactService();
