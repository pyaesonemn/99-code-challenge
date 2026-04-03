import app from './app';
import db from './database';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => db.close());
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
