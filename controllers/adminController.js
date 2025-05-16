// controllers/eventApprovalController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_ACTIONS = ["CREATE", "UPDATE"];
const VALID_CATEGORY = ["EVENT", "BUSINESS"];

exports.adminTest = async (req, res) => {
  res.json({ message: "test" });
};

exports.getPendingApprovals = async (req, res) => {
  const { category } = req.query;

  // if (!category || !VALID_CATEGORY.includes(category)) {
  //     return res.status(400).json({ error: "Invalid or missing category. Use 'EVENT' or 'BUSINESS'." });
  // }

  try {
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        event: true,
        business: {
          include: {
            user: true,
          },
        },
      },
    });
    res.json(pendingApprovals);
  } catch (err) {
    console.error('Error fetching pending approvals:', err);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
};

exports.getApprovedEvents = async (req, res) => {
  try {
    const approvals = await prisma.approval.findMany({
      where: {
        status: {
          in: ['APPROVED', 'REJECTED']
        }
      },
      include: {
        event: true,
        business: true
      }
    });
    res.json(approvals);
  } catch (err) {
    console.error('Error fetching approved events:', err);
    res.status(500).json({ error: 'Failed to fetch approved events' });
  }
};
exports.updateApprovalStatus = async (req, res) => {
  const approvalId = parseInt(req.params.id);
  const { status, authorizedBy } = req.body;

  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const updated = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status,
        authorizedBy: "authorizedBy",
        authorizedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating approval status:', error);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
};

exports.getPendingApprovalCount = async (req, res) => {
  try {
    const count = await prisma.approval.count({
      where: {
        status: 'PENDING' // Make sure this matches your ApprovalStatus enum
      }
    });

    return res.status(200).json({ pendingCount: count });
  } catch (error) {
    console.error('Error fetching pending approval count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getEventCountByCountry = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      select: {
        country: true,
      },
    });

    const countryCounts = events.reduce((acc, curr) => {
      acc[curr.country] = (acc[curr.country] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    const top4 = sorted.slice(0, 4);
    const otherTotal = sorted.slice(4).reduce((sum, item) => sum + item.count, 0);
    const final = [...top4, { country: "Other", count: otherTotal }];

    return res.status(200).json({ data: final });
  } catch (err) {
    console.error("Error fetching event counts by country:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getTotalEventCount = async (req, res) => {
  try {
    const count = await prisma.event.count();
    return res.status(200).json({ totalEvents: count });
  } catch (error) {
    console.error("Error fetching event count:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.getBookingStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const getMonthlyCounts = async (year) => {
      const counts = Array(12).fill(0);
      const bookings = await prisma.touristEventBooking.findMany({
        where: {
          paymentDate: {
            gte: new Date(`${year}-01-01T00:00:00Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
        select: {
          paymentDate: true,
        },
      });

      bookings.forEach((booking) => {
        const month = booking.paymentDate.getMonth(); // 0-based
        counts[month]++;
      });

      return counts;
    };

    const getNewTourists = async (year) => {
      const counts = Array(12).fill(0);
      const users = await prisma.user.findMany({
        where: {
          role: 'TOURIST',
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00Z`),
          },
        },
        select: {
          createdAt: true,
        },
      });

      users.forEach((user) => {
        const month = user.createdAt.getMonth(); // 0-based
        counts[month]++;
      });

      return counts;
    };

    const lastYearBookings = await getMonthlyCounts(lastYear);
    const thisYearBookings = await getMonthlyCounts(currentYear);
    const newTouristsThisYear = await getNewTourists(currentYear);

    res.json({
      success: true,
      data: {
        lastYearBookings,
        thisYearBookings,
        newTouristsThisYear,
      },
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getEventById = async (req, res) => {
  const eventId = parseInt(req.params.id, 10); // Ensure it's an integer

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        business: true,
        specifications: true,
        conditions: true,
        priceCategories: true,
        bookings: true,
        approvals: true,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// exports.getEventsByName = async (req, res) => {
//   try {
//     const { name } = req.query;

//     if (!name) {
//       return res.status(400).json({ error: 'Event name is required' });
//     }

//     const events = await prisma.event.findMany({
//       where: {
//         name: {
//           contains: name,
//         }
//       },
//       // include: {
//       //   business: true,
//       //   specifications: true,
//       //   conditions: true,
//       //   priceCategories: true,
//       // }
//     });

//     res.status(200).json(events);
//   } catch (error) {
//     console.error('Error fetching events:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };


exports.getEventsByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    const events = await prisma.event.findMany({
      where: {
        name: {
          contains: name,
          lte: 'insensitive',
        }
      },
      take: 8,
      include: {
        business: {
          include: {
            user: true,
          }
        }
      }
    });
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// controllers/adminController.js
exports.toggleEventStatus = async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: !event.status, // flip true <-> false
      },
    });

    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error('Error toggling event status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
exports.getBusinessCount = async (req, res) => {
  try {
    const count = await prisma.business.count();
    return res.status(200).json({ businessCount: count });
  } catch (error) {
    console.error("Error fetching business count:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTouristCount = async (req, res) => {
  try {
    const count = await prisma.user.count({
      where: {
        role: 'TOURIST'
      }
    });

    return res.status(200).json({ touristCount: count });
  } catch (error) {
    console.error("Error fetching tourist count from User table:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


// GET /api/admin/business/search?name=xyz
exports.searchBusinessesByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log("name", name);
    if (!name) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    const businesses = await prisma.business.findMany({
      where: {
        user: {
          name: {
            contains: name,
          },
        },
      },
      include: {
        user: true,
      }


    });

    res.json(businesses);
  } catch (error) {
    console.error('Error searching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/admin/business/:id
exports.toggleBusinessStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const existingBusiness = await prisma.business.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingBusiness) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: parseInt(id) },
      data: {
        status: !existingBusiness.status,
      },
      include: {
        user: true,
      },
    });

    res.json(updatedBusiness);
  } catch (error) {
    console.error('Error toggling business status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



