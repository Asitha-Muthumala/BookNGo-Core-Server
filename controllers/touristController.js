require("dotenv").config();
const prisma = require("../prisma/prismaClient");
const AppError = require("../utils/AppError");
const { CREATE_EVENT_MODEL } = require("../validation/business");
const validateRequest = require("../utils/validateRequest");
const { PrismaClient } = require('@prisma/client');

const bcrypt = require('bcrypt');
exports.eventBook = async (req, res, next) => {
  try {
    const { eventId, priceCategoryId, ticketCount, paymentAmount } = req.body;
    const touristId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: touristId },
      include: {
        business: true,
        tourist: true,
      },
    });

    if (user.role !== "TOURIST" || !user.tourist) {
      return next(new AppError("Only tourist users can book events", 403));
    }

    // const existingBooking = await prisma.touristEventBooking.findFirst({
    //   where: {
    //     touristId: user.tourist.id,
    //     eventId,
    //   },
    // });

    // if (existingBooking) {
    //   return next(new AppError("Event already booked by this user", 409));
    // }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        maximumCount: true,
        bookings: {
          select: { ticketCount: true },
        },
      },
    });

    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    const currentCount = event.bookings.reduce(
      (sum, b) => sum + b.ticketCount,
      0
    );
    const newTotal = currentCount + ticketCount;

    if (newTotal > event.maximumCount) {
      return next(
        new AppError(
          `Not enough tickets available. Only ${
            event.maximumCount - currentCount
          } left.`,
          400
        )
      );
    }

    const priceCategory = await prisma.priceCategory.findFirst({
      where: {
        id: priceCategoryId,
        eventId: eventId,
      },
    });

    if (!priceCategory) {
      return next(
        new AppError("Invalid price category for the selected event.", 400)
      );
    }

    const expectedAmount = priceCategory.price * ticketCount;
    if (expectedAmount !== paymentAmount) {
      return next(
        new AppError(
          `Incorrect payment amount. Expected ${expectedAmount}, got ${paymentAmount}`,
          400
        )
      );
    }

    await prisma.touristEventBooking.create({
      data: {
        touristId: user.tourist.id,
        eventId,
        priceCategoryId,
        ticketCount,
        paymentAmount,
      },
    });

    res.status(201).json({
      status: true,
      message: "Booking Success",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tourist: true },
    });

    if (user.role !== "TOURIST" || !user.tourist) {
      return next(new AppError("Only tourists can view bookings.", 403));
    }

    const where = {
      touristId: user.tourist.id,
    };

    const bookings = await prisma.touristEventBooking.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: {paymentDate: "desc"},
    });

    const total = await prisma.touristEventBooking.count({where});

    res.status(200).json({
      status: true,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
      bookings,
    })
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
}

// exports.getBookingById = async (req, res, next) => {
//   try {
//     const bookingId = parseInt(req.params.id);

//     if (isNaN(bookingId)) {
//       return next(new AppError("Invalid booking ID", 400));

//     }

//     const booking = await prisma.touristEventBooking.findFirst({
//       where: {
//         id: bookingId,
//       },
//       include: {
//         event: true,
//         priceCategory: true,
//       },
//     });

//     if (!booking) {
//       return next(new AppError("Booking not found", 404));
//     }

//     res.status(200).json({
//       status: true,
//       booking: booking,
//     });
//   } catch (error) {
//     return next(new AppError(error.message, 500));
//   }
// }

exports.getBookingById = async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id);

    if (isNaN(bookingId)) {
      return next(new AppError("Invalid booking ID", 400));
    }

    const booking = await prisma.touristEventBooking.findFirst({
      where: {
        id: bookingId,
      },
      include: {
        event: true,
        priceCategory: true,
        tourist: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    res.status(200).json({
      status: true,
      booking: booking,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.updateEvent = async (req, res, next) => {
  const eventId = parseInt(req.params.id);
  const { name, location } = req.body;

  try {
    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        name,
        location,
      },
    });

    res.status(200).json({ 
      success: true, 
      event: updated 
    });
  } catch (err) {
    return next(new AppError(err.message, 500));
  }
}

exports.getTouristProfileById = async (req, res, next) => {
  const touristId = parseInt(req.params.id);

  try {
    const tourist = await prisma.tourist.findUnique({
      where: { id: touristId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            // contactNo: true,
            // imageUrl: true,
          }
        }
      }
    });

    if (!tourist) {
      return next(new AppError("Tourist not found.", 404));
    }

    res.status(200).json({
      status: true,
      data: {
        id: tourist.user.id,
        name: tourist.user.name,
        email: tourist.user.email,
        contactNo: tourist.user.contactNo,
        imageUrl: tourist.user.imageUrl,
      }
    });
  } catch (error) {
    console.error("Error fetching tourist:", error);
    next(new AppError(error.message, 500));
  }
};


exports.getAllEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await prisma.event.findMany({
      skip,
      take: parseInt(limit),
        where: {
        status: true, 
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        location: true,
        date: true,
        maximumCount: true,
        bannerUrl: true,
        hashtag: true,
        bookings: {
          select: {
            ticketCount: true,
          },
        },
        priceCategories: true,
      },
    });

    const formattedEvents = events.map((event) => {
      const bookingCount = event.bookings.reduce((sum, b) => sum + b.ticketCount, 0);
      const minPrice = event.priceCategories.length
        ? Math.min(...event.priceCategories.map(p => p.price))
        : 0;
      return {
        eventId: event.id,
        name: event.name,
        category: event.category,
        location: event.location,
        date: event.date,
        maximumCount: event.maximumCount,
        bannerUrl: event.bannerUrl,
        keyword: event.hashtag,
        currentBookingCount: bookingCount,
        price: minPrice,
      };
    });

    const total = await prisma.event.count();

    res.status(200).json({
      status: true,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalEvents: total,
      events: formattedEvents,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};



exports.userDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
     const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: true,
      user: user,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

const generateHashedPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

exports.getBookingByTouristId = async (req, res, next) => {
  try {
    const touristId = parseInt(req.params.id);

    if (isNaN(touristId)) {
      return next(new AppError("Invalid tourist ID", 400));
    }

    const bookings = await prisma.touristEventBooking.findMany({
      where: { touristId },
      include: {
        event: true,
        priceCategory: true,
      },
    });

    if (!bookings || bookings.length === 0) {
      return next(new AppError("No bookings found for this tourist", 404));
    }

    res.status(200).json({
      status: true,
      bookings,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.updateUserProfile = async (req, res, next) => {
  const { userId } = req.params;
  const { name, email, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // If password change is requested
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ status: false, message: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ status: false, message: 'Password must be at least 6 characters' });
      }

      const hashedPassword = await generateHashedPassword(newPassword);

      const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          name,
          email,
          password: hashedPassword
        },
      });

      return res.status(200).json({ status: true, message: 'Profile and password updated', data: updatedUser });
    }

    // If no password change
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        name,
        email
      },
    });

    res.status(200).json({ status: true, message: 'Profile updated', data: updatedUser });

  } catch (err) {
    console.error('Update profile error:', err);
    return next(new AppError(err.message || 'Server error', 500));
  }
};
