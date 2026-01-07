import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRouter from './routes/user.route.js';

const app = express();
const PORT = conf.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/v1/user", userRouter);

// Routes
app.use('/api/v1/auth', authRoutes);

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
