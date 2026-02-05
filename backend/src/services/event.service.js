import { eventModel } from "../models/event.model.js";
import logger from "../config/logger";
import { CustomError } from "../utils/customError";

//  Create Event
export const createEvent = async (eventData) => {
  const { title, start, end, allDay, category, description } = eventData;

  // Edge Case: Check if an exact duplicate event already exists to prevent spam
  const existingEvent = await eventModel.findOne({ 
    title, 
    start: new Date(start), 
    end: new Date(end) 
  });
  
  if (existingEvent) {
    logger.wanr("Duplicate Event Alreay Exist");
    throw new Error("Duplicate event already exists");
  }

  const newEvent = await eventModel.create({
    title,
    start: new Date(start),
    end: new Date(end),
    allDay,
    category,
    description
  });

  return newEvent;
};

// Fetch Events (with Date Range Filter)
export const fetchEvents = async (queryData) => {
  const { start, end } = queryData;
  let query = {};

  // Edge Case: If start/end provided, filter by that range (Optimized for Calendar View)
  if (start && end) {
    query = {
      start: { $gte: new Date(start) },
      end: { $lte: new Date(end) }
    };
  }

  const events = await eventModel.find(query).sort({ start: 1 }); // Sort by nearest date
  return events;
};

//  Update Event
export const updateEvent = async (id, updateData) => {

  // check by event id if it exist or not?
  const event = await eventModel.findById(id);

  if (!event) {
    logger.error("Event Not Found!");
    throw new Error("Event not found");
  }

  // Edge Case: If updating dates, re-validate that Start < End inside DB Logic 
  if (updateData.start && updateData.end) {
    if (new Date(updateData.start) > new Date(updateData.end)) {
        logger.warn("End date cannot be before start date");
        throw new Error("End date cannot be before start date");
    }
  }

  const updatedEvent = await eventModel.findByIdAndUpdate(
    id, 
    updateData, 
    { new: true, runValidators: true }
  );

  return updatedEvent;
};

//  Delete Event
export const removeEvent = async (id) => {
  const event = await eventModel.findById(id);

  if (!event) {
    logger.warn("Event Not Found!");
    throw new Error("Event not found");
  }

  await eventModel.findByIdAndDelete(id);
  return { message: "Event deleted successfully" };
};