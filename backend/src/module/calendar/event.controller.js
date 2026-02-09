import logger from "../../config/logger.js";
import { createEvent } from "./event.service.js";
import asyncHandler from "../../utils/asyncHandler.js";

export const creatEvent = asyncHandler( async(req, res) => {
    const id = req.user._id;
    const result = await createEvent(req.body, id);
    return res.status(201).json({
        success : true,
        message : "Event Created",
        data : result
    })  
})

export const getEvent = asyncHandler( async(req, res) => {
    const result = await createEvent(req.query);
    return res.status(200).json({
        success : true,
        message : "Event Fetched",
        data : result
    })  
})

export const updateEvent = asyncHandler( async(req, res) => {
    const {id} = req.params;
    const body = req.body;
    const result = await createEvent(id, body);
    return res.status(200).json({
        success : true,
        message : "Event Updated",
        data : result
    })  
})

export const deleteEvent = asyncHandler( async(req, res) => {
    const {id} = req.params;
    await createEvent(id);
    return res.status(200).json({
        success : true,
        message : "Event Deleted Successfully"
    })  
})