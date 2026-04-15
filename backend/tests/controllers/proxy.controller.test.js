import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { ProxyRequest, ProxyAssignment } from '../../src/module/proxy/Proxy.model.js';
import { TimetableEntry, TimeSlot } from '../../src/module/timetable/Timetable.model.js';
import User from '../../src/module/user/model/User.model.js';
import * as proxyController from '../../src/module/proxy/proxy.controller.js';
import * as proxyService from '../../src/module/proxy/proxy.service.js';

// Mock the proxy service
jest.mock('../../src/module/proxy/proxy.service.js');

describe('Proxy Controller Tests', () => {
  let req, res, next;
  let testSchool, testTeacher, testAdmin, testTimeSlot;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request, response, and next
    req = {
      user: { _id: new mongoose.Types.ObjectId(), role: 'teacher' },
      schoolId: new mongoose.Types.ObjectId(),
      params: {},
      body: {},
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Create test data
    testSchool = createTestSchool();
    testTeacher = createTestUser({ role: 'teacher' });
    testAdmin = createTestUser({ role: 'admin' });
    testTimeSlot = createTestTimeSlot({ schoolId: testSchool._id });
  });

  describe('createProxyRequest', () => {
    test('should create proxy request successfully', async () => {
      const mockProxyRequest = createTestProxyRequest();
      proxyService.createProxyRequest.mockResolvedValue(mockProxyRequest);

      req.body = {
        date: '2024-01-15',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id,
        reason: 'Medical appointment'
      };

      await proxyController.createProxyRequest(req, res, next);

      expect(proxyService.createProxyRequest).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockProxyRequest,
        message: 'Proxy request created successfully'
      });
    });

    test('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      proxyService.createProxyRequest.mockRejectedValue(error);

      req.body = {
        date: 'invalid-date',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id
      };

      await proxyController.createProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle conflict errors', async () => {
      const error = new Error('Proxy request already exists');
      error.name = 'ConflictError';
      proxyService.createProxyRequest.mockRejectedValue(error);

      req.body = {
        date: '2024-01-15',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id
      };

      await proxyController.createProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyProxyRequests', () => {
    test('should get user proxy requests successfully', async () => {
      const mockRequests = [createTestProxyRequest(), createTestProxyRequest()];
      proxyService.getMyProxyRequests.mockResolvedValue(mockRequests);

      req.query = { status: 'pending' };

      await proxyController.getMyProxyRequests(req, res, next);

      expect(proxyService.getMyProxyRequests).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.query
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequests
      });
    });

    test('should handle service errors', async () => {
      const error = new Error('Database error');
      proxyService.getMyProxyRequests.mockRejectedValue(error);

      await proxyController.getMyProxyRequests(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProxyRequests', () => {
    test('should get all proxy requests for admin', async () => {
      const mockRequests = [createTestProxyRequest()];
      proxyService.getProxyRequests.mockResolvedValue(mockRequests);

      req.user.role = 'admin';
      req.query = { status: 'pending' };

      await proxyController.getProxyRequests(req, res, next);

      expect(proxyService.getProxyRequests).toHaveBeenCalledWith(
        req.schoolId,
        req.query
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequests
      });
    });
  });

  describe('assignProxyTeacher', () => {
    test('should assign proxy teacher successfully', async () => {
      const mockAssignment = createTestProxyAssignment();
      proxyService.assignProxyTeacher.mockResolvedValue(mockAssignment);

      req.user.role = 'admin';
      req.params.requestId = new mongoose.Types.ObjectId();
      req.body = {
        proxyTeacherId: new mongoose.Types.ObjectId(),
        notes: 'Covering for sick teacher'
      };

      await proxyController.assignProxyTeacher(req, res, next);

      expect(proxyService.assignProxyTeacher).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.params.requestId,
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignment,
        message: 'Proxy teacher assigned successfully'
      });
    });

    test('should handle teacher trying to assign proxy', async () => {
      req.user.role = 'teacher';
      req.params.requestId = new mongoose.Types.ObjectId();

      await proxyController.assignProxyTeacher(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError'
        })
      );
    });
  });

  describe('markAsFreePeriod', () => {
    test('should mark as free period successfully', async () => {
      const mockAssignment = createTestProxyAssignment({ type: 'free_period' });
      proxyService.markAsFreePeriod.mockResolvedValue(mockAssignment);

      req.user.role = 'admin';
      req.params.requestId = new mongoose.Types.ObjectId();
      req.body = { notes: 'Teacher is sick' };

      await proxyController.markAsFreePeriod(req, res, next);

      expect(proxyService.markAsFreePeriod).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.params.requestId,
        'Teacher is sick'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignment,
        message: 'Marked as free period successfully'
      });
    });
  });

  describe('getAvailableTeachers', () => {
    test('should get available teachers successfully', async () => {
      const mockTeachers = [
        { teacherId: new mongoose.Types.ObjectId(), available: true },
        { teacherId: new mongoose.Types.ObjectId(), available: true }
      ];
      proxyService.getAvailableTeachers.mockResolvedValue(mockTeachers);

      req.query = {
        date: '2024-01-15',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id
      };

      await proxyController.getAvailableTeachers(req, res, next);

      expect(proxyService.getAvailableTeachers).toHaveBeenCalledWith(
        req.schoolId,
        new Date('2024-01-15'),
        'Mon',
        testTimeSlot._id
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTeachers
      });
    });

    test('should handle missing query parameters', async () => {
      const error = new Error('Missing required parameters');
      error.name = 'ValidationError';
      proxyService.getAvailableTeachers.mockRejectedValue(error);

      req.query = {}; // Missing required params

      await proxyController.getAvailableTeachers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cancelProxyRequest', () => {
    test('should cancel proxy request successfully', async () => {
      const mockRequest = createTestProxyRequest({ status: 'cancelled' });
      proxyService.cancelProxyRequest.mockResolvedValue(mockRequest);

      req.params.requestId = new mongoose.Types.ObjectId();

      await proxyController.cancelProxyRequest(req, res, next);

      expect(proxyService.cancelProxyRequest).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.params.requestId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequest,
        message: 'Proxy request cancelled successfully'
      });
    });

    test('should handle cancellation of resolved request', async () => {
      const error = new Error('Cannot cancel resolved request');
      error.name = 'ForbiddenError';
      proxyService.cancelProxyRequest.mockRejectedValue(error);

      req.params.requestId = new mongoose.Types.ObjectId();

      await proxyController.cancelProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProxyAssignments', () => {
    test('should get proxy assignments successfully', async () => {
      const mockAssignments = [createTestProxyAssignment()];
      proxyService.getProxyAssignments.mockResolvedValue(mockAssignments);

      req.query = { date: '2024-01-15' };

      await proxyController.getProxyAssignments(req, res, next);

      expect(proxyService.getProxyAssignments).toHaveBeenCalledWith(
        req.schoolId,
        req.query
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignments
      });
    });
  });

  describe('createDirectProxyAssignment', () => {
    test('should create direct proxy assignment successfully', async () => {
      const mockAssignment = createTestProxyAssignment();
      proxyService.createDirectProxyAssignment.mockResolvedValue(mockAssignment);

      req.user.role = 'admin';
      req.body = {
        originalTeacherId: new mongoose.Types.ObjectId(),
        proxyTeacherId: new mongoose.Types.ObjectId(),
        type: 'proxy',
        standard: '10',
        section: 'A',
        subject: 'Math',
        date: '2024-01-15',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id,
        notes: 'Direct assignment'
      };

      await proxyController.createDirectProxyAssignment(req, res, next);

      expect(proxyService.createDirectProxyAssignment).toHaveBeenCalledWith(
        req.user._id,
        req.schoolId,
        req.body
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssignment,
        message: 'Direct proxy assignment created successfully'
      });
    });

    test('should handle teacher trying to create direct assignment', async () => {
      req.user.role = 'teacher';
      req.body = { type: 'proxy' };

      await proxyController.createDirectProxyAssignment(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle NotFoundError', async () => {
      const error = new Error('Resource not found');
      error.name = 'NotFoundError';
      proxyService.getMyProxyRequests.mockRejectedValue(error);

      await proxyController.getMyProxyRequests(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle BadRequestError', async () => {
      const error = new Error('Bad request');
      error.name = 'BadRequestError';
      proxyService.createProxyRequest.mockRejectedValue(error);

      req.body = { date: 'invalid' };

      await proxyController.createProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      proxyService.getMyProxyRequests.mockRejectedValue(error);

      await proxyController.getMyProxyRequests(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Request Validation', () => {
    test('should validate request ID format', async () => {
      const error = new Error('Invalid request ID');
      error.name = 'BadRequestError';
      proxyService.cancelProxyRequest.mockRejectedValue(error);

      req.params.requestId = 'invalid-id';

      await proxyController.cancelProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should validate date format', async () => {
      const error = new Error('Invalid date format');
      error.name = 'BadRequestError';
      proxyService.createProxyRequest.mockRejectedValue(error);

      req.body = {
        date: 'invalid-date',
        dayOfWeek: 'Mon',
        timeSlotId: testTimeSlot._id
      };

      await proxyController.createProxyRequest(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
