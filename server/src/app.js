import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { sendSuccess } from './utils/apiResponse.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import importRoutes from './routes/importRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import amcRoutes from './routes/amcRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import excelFieldRoutes from './routes/excelFieldRoutes.js';
import masterRoutes from './routes/masterRoutes.js';
import relationshipRoutes from './routes/relationshipRoutes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trust proxy to ensure correct client IP extraction when deployed behind a reverse proxy (e.g., Render)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());

const allowedOrigins = [
  'https://airport-authority-of-india-tau.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
if (process.env.CLIENT_URL) {
  const cUrl = process.env.CLIENT_URL.replace(/\/+$/, '');
  if (!allowedOrigins.includes(cUrl)) allowedOrigins.push(cUrl);
}
if (process.env.FRONTEND_URL) {
  const fUrl = process.env.FRONTEND_URL.replace(/\/+$/, '');
  if (!allowedOrigins.includes(fUrl)) allowedOrigins.push(fUrl);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, or mobile requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^https:\/\/airport-authority-of-india.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Rate Limiting
app.use('/api/v1', apiLimiter);

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root & Favicon Handlers (Prevents Render 404 logs)
app.get('/', (req, res) => {
  return sendSuccess(res, {
    service: 'Airports Authority of India (AAI) - Asset Management System API',
    status: 'ONLINE',
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `${req.protocol}://${req.get('host')}/api/v1/health`
  }, 'AAI AMS Backend API is active');
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health & System Diagnostic Check API
app.get('/api/v1/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  const memUsage = process.memoryUsage();

  return sendSuccess(res, {
    status: 'HEALTHY',
    service: 'AAI Regional Office - Asset Management System API',
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    },
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  }, 'Service is operational');
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/master', masterRoutes);
app.use('/api/v1/master/departments', departmentRoutes);
app.use('/api/v1/master/categories', categoryRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/amc', amcRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/excel-fields', excelFieldRoutes);
app.use('/api/v1/relationships', relationshipRoutes);

// Fallback route handlers
app.use(notFound);
app.use(errorHandler);

export default app;
