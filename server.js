const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
const PORT = 3000;
const DB = './urls.json';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const readDB = () => JSON.parse(fs.readFileSync(DB, 'utf-8'));
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

  res.json({ shortUrl: `http://localhost:3000/${code}`, code });
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

// GET /:code → redirect + increment click count
app.get('/:code', (req, res) => {
  const db = readDB();
  const index = db.findIndex(e => e.code === req.params.code);
  if (index === -1) return res.status(404).json({ error: 'URL not found' });

  db[index].clicks = (db[index].clicks || 0) + 1;
  writeDB(db);

  res.redirect(db[index].url);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));