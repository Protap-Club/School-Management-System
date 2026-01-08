import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { conf } from './config/index.js';
import authRoutes from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import settingsRouter from './routes/settings.route.js';
import instituteRouter from './routes/institute.route.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = conf.PORT || 5000;

// CORS Configuration
const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/institute", instituteRouter);

app.get('/', (req, res) => {
    res.send('Student Management System API is running...');
});

// MongoDB Connection
mongoose.connect(conf.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });
