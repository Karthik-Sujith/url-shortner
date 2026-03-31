const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB = './urls.json';

app.use(cors());
app.use(express.json());

const readDB = () => {
  if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');
  return JSON.parse(fs.readFileSync(DB, 'utf-8'));
};
const writeDB = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));

// POST /shorten
app.post('/shorten', (req, res) => {
  const { url, customCode } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const db = readDB();

  if (customCode) {
    const exists = db.find(e => e.code === customCode);
    if (exists) return res.status(400).json({ error: 'Custom code already taken!' });
  }

  const code = customCode || nanoid(6);
  const entry = { code, url, clicks: 0, createdAt: new Date().toISOString() };

  db.push(entry);
  writeDB(db);

  // Dynamically build the short URL from the actual request host
  // Works correctly both on localhost AND when live/deployed
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  res.json({ shortUrl: `${protocol}://${host}/${code}`, code });
});

// GET /all
app.get('/all', (req, res) => {
  res.json(readDB());
});

// DELETE /delete/:code
app.delete('/delete/:code', (req, res) => {
  let db = readDB();
  const index = db.findIndex(e => e.code === req.params.code);
  if (index === -1) return res.status(404).json({ error: 'URL not found' });
  db.splice(index, 1);
  writeDB(db);
  res.json({ message: 'Deleted successfully' });
});

// GET / → serve the main app explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static assets with index: false
// Prevents index.html from being served as a fallback for /:code paths
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// GET /:code → redirect to original URL + track clicks
app.get('/:code', (req, res) => {
  const code = req.params.code;
  const db = readDB();
  const index = db.findIndex(e => e.code === code);

  if (index === -1) {
    return res.status(404).send(`
      <h2 style="font-family:sans-serif">404 — Short link not found</h2>
      <p style="font-family:sans-serif">The code <strong>${code}</strong> doesn't exist.</p>
      <a href="/" style="font-family:sans-serif">← Back to TrimURL</a>
    `);
  }

  db[index].clicks = (db[index].clicks || 0) + 1;
  writeDB(db);

  res.redirect(302, db[index].url);
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
