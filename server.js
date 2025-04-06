import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cors from 'cors';

const config = {
  port: 3001,
  mangaDirectory: 'manga',
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
};

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mangaPath = path.join(__dirname, config.mangaDirectory);

app.use(cors());
app.use(express.json());

app.use('/manga', express.static(mangaPath));

const getChapters = async () => {
  try {
    const items = await fs.readdir(mangaPath);
    const directories = await Promise.all(
      items.map(async item => {
        const stat = await fs.stat(path.join(mangaPath, item));
        return stat.isDirectory() ? item : null;
      })
    );
    return directories.filter(Boolean).sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  } catch (error) {
    throw new Error('Unable to scan chapters');
  }
};

const getPages = async (chapter) => {
  try {
    const chapterPath = path.join(mangaPath, chapter);
    const items = await fs.readdir(chapterPath);
    
    const files = await Promise.all(
      items.map(async item => {
        const stat = await fs.stat(path.join(chapterPath, item));
        const ext = path.extname(item).toLowerCase();
        return stat.isFile() && config.allowedExtensions.includes(ext) ? item : null;
      })
    );
    
    return files
      .filter(Boolean)
      .sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
  } catch (error) {
    throw new Error('Unable to scan pages');
  }
};

app.get('/api/chapters', async (req, res) => {
  try {
    const chapters = await getChapters();
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chapters/:chapter', async (req, res) => {
  try {
    const pages = await getPages(req.params.chapter);
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server is running`);
});