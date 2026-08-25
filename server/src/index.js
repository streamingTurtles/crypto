import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crypto-xrpl-api'
  });
});

app.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`);
});
