const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const businessRoutes = require('./routes/businessRoutes');
const touristRoutes = require('./routes/touristRoutes');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const authenticate = require('./middleware/authenticate');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/tourist', touristRoutes);

app.use((req, res, next) => {
    return next(new AppError('URL not found', 404));
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});