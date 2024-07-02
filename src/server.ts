import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
const { PORT } = process.env;
import { router } from './routes/router';
import { connectDB } from './utils/connectDB';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const app = express();

//* Middlewares
app.use(morgan('dev'));
app.use(
  cors({
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(helmet());

app.listen(PORT, async () => {
  // connect to database
  await connectDB();
  console.log(`server started on http://localhost:${PORT}`);
});

// routes
app.use('/api', router);
