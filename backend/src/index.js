import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { conf } from './config/index.js';
import authRoutes from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import settingsRouter from './routes/settings.route.js';

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

// Routes
app.use('/api/v1/auth', authRoutes);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/settings", settingsRouter);

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
