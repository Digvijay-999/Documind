import './dns-override';
import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';

import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { connectMongoDB } from './config/mongodb';
import { connectRedis } from './config/redis';
import { initUsageCleanupCron } from './jobs/usage-cleanup.job';
import { initSocketIO } from './websocket/socket.service';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Documentation (OpenAPI / Swagger)
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(swaggerDocument);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api', routes);

// Centralized Error Handling
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocketIO(httpServer);

if (process.env.NODE_ENV !== 'test') {
  // Connect to databases sequentially to avoid c-ares DNS initialization race conditions
  connectRedis().then(() => connectMongoDB()).then(() => {
    initUsageCleanupCron();
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

export { httpServer };
export default app;
