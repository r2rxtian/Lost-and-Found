import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Lost & Found API listening at http://localhost:${port} (${process.env.DB_MODE || 'demo'} mode)`));
