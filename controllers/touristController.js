require("dotenv").config();
const prisma = require("../prisma/prismaClient");
const AppError = require("../utils/AppError");
const { CREATE_EVENT_MODEL } = require("../validation/business");
const validateRequest = require("../utils/validateRequest");

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

    const existingBooking = await prisma.touristEventBooking.findFirst({
      where: {
        touristId: user.tourist.id,
        eventId,
      },
    });

    if (existingBooking) {
      return next(new AppError("Event already booked by this user", 409));
    }

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