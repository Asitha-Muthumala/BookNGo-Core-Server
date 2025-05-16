require("dotenv").config();
const prisma = require("../prisma/prismaClient");
const AppError = require("../utils/AppError");
const { CREATE_EVENT_MODEL } = require('../validation/business');
const validateRequest = require('../utils/validateRequest');
const e = require("express");

const handleValidation = (reqBody, validationModel) => {
    const validationErrors = validateRequest(reqBody, validationModel);
    if (validationErrors) {
        return { status: false, message: "Validation failed", validationErrors };
    }
    return null;
};

exports.addEvent = async (req, res, next) => {
  try {
    const validationResult = handleValidation(req.body, CREATE_EVENT_MODEL);
    if (validationResult) return res.status(402).json(validationResult);

    const businessId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: businessId },
      include: {
        business: true,
        tourist: true,
      },
    });

    if (user.role !== "BUSINESS" || !user.business) {
      return next(new AppError("Business not found.", 404));
    }

    const existingEvent = await prisma.event.findFirst({
        where:  {
            businessId: user.business.id,
            date: new Date(req.body.date),
            OR: [
                {
                    startTime: {
                        lt: req.body.endTime,
                    },
                    endTime: {
                        gt: req.body.startTime,
                    },
                }
            ]
        }
    })

    if (existingEvent) {
        return next(new AppError("Time slot already booked for another event.", 409));
    }
    
    await prisma.event.create({
      data: {
        name: req.body.name,
        type: req.body.type,
        category: req.body.category,
        maximumCount: req.body.maximumCount,
        cordinatorName: req.body.cordinatorName,
        cordinatorContact: req.body.cordinatorContact,
        description: req.body.description,
        hashtag: req.body.hashtag,
        location: req.body.location,
        country: req.body.country,
        discount: req.body.discount,
        refundPolicy: req.body.refundPolicy,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        date: new Date(req.body.date),
        bannerUrl: req.body.bannerUrl,
        businessId: user.business.id,
        specifications: {
          create: req.body.specifications,
        },
        conditions: {
          create: req.body.conditions,
        },
        priceCategories: {
          create: req.body.priceCategories,
        },
      },
    });

    res.status(200).json({ 
      status: true, 
      message: "Event created" 
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.searchEvents = async (req, res, next) => {
  try {
    const { name, hashtag, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(name && {
        name: {
          contains: name,
        },
      }),
      ...(hashtag && {
        hashtag: {
          contains: hashtag,
        },
      }),
    };

    const events = await prisma.event.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'asc' },
    });

    const total = await prisma.event.count({ where });

    res.status(200).json({
      status: true,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
      events,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getEventById = async (req, res, next) => {
  const eventId = parseInt(req.params.id);

  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId },
      include: {
        specifications: true,
        conditions: true,
        priceCategories: true
      }
    });
  
    if (!event) {
      return next(new AppError("Event not found.", 404));
    }
  
    res.status(200).json({ 
      status: true, 
      body: event
    });  
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
}

exports.disableEvent = async (req, res, next) => {
  const eventId = parseInt(req.params.id);

  try {
    const event = await prisma.event.findFirst({
      where: { id: eventId }
    });
  
    if (!event) {
      return next(new AppError("Event not found.", 404));
    }

    //develop here

    res.status(200).json({
      status: true,
      message: "Event disabled successfully."
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
}

exports.getEventsByBusinessId = async (req, res, next) => {
  const businessId = parseInt(req.params.id);

  try {
    const events = await prisma.event.findMany({
      where: { businessId: businessId }
    });

    if (events.length === 0) {
      return next(new AppError("No events found for this business.", 404));
    }

    //want change
    res.status(200).json({
      status: true,
      count: events.length,
      body: events,
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getBusinessEventsPaginated = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const businessId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: businessId },
      include: {
        business: true,
        tourist: true,
      },
    });
    
    if (!user) {
      return next(new AppError("Invalid request", 400));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await prisma.event.findMany({
      where: {
        businessId: parseInt(user.business.id),
      },
      skip,
      take: parseInt(limit),
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
        priceCategories: true
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
        price: minPrice
      };
    });

    const total = await prisma.event.count({
      where: {
        businessId: parseInt(businessId),
      },
    });

    res.status(200).json({
      status: true,
      businessId: parseInt(businessId),
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalEvents: total,
      events: formattedEvents,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};

exports.getBusinessBookings = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const businessId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: businessId },
      include: {
        business: true,
        tourist: true,
      },
    });
    
    if (!user || !user.business) {
      return next(new AppError("Invalid request", 400));
    }

    const totalBookings = await prisma.touristEventBooking.count({
      where: {
        event: {
          businessId: user.business.id
        }
      }
    });

    const bookings = await prisma.touristEventBooking.findMany({
      where: {
        event: {
          businessId: user.business.id
        }
      },
      include: {
        event: true,
        tourist: {
          include: {
            user: true
          }
        },
        priceCategory: true
      },
      skip,
      take: limit,
      orderBy: {
        paymentDate: 'desc'
      }
    });

    res.json({
      status: true,
      businessId,
      currentPage: page,
      totalPages: Math.ceil(totalBookings / limit),
      totalBookings,
      bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getBusinessBasicDetails = async (req, res, next) => {
  try {
    const businessId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: businessId },
      include: {
        business: true,
        tourist: true,
      },
    });
    
    if (!user) {
      return next(new AppError("Business not found", 400));
    }

    const response = {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    res.status(200).json({ 
      status: true, 
      data: response
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};





