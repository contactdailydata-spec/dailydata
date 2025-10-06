const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const csvFile = 'dailydata.csv';
const postsDir = path.join(__dirname, 'posts');
const sitemapFile = path.join(__dirname, 'sitemap.xml');
const stateFile = path.join(__dirname, 'lastProcessed.json');

// Ensure posts folder exists
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir);

// Read CSV
const csvText = fs.readFileSync(csvFile, 'utf8');
const rows = csvText.trim().split('\n');
const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
const dataRows = rows.slice(1).map(row => {
    const values = row.split(',');
    const entry = {};
    headers.forEach((header, i) => entry[header] = values[i]?.trim());
    return entry;
});

// Helper: hash content
function hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex');
}

// Load state
let state = { lastDate: null, hashes: {} };
if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

// Generate HTML for each post
let sitemapEntries = '';
dataRows.forEach((row, index) => {
    const date = row.date;
    const fileName = `${date}.html`;
    const filePath = path.join(postsDir, fileName);

    const prevLink =
        index < dataRows.length - 1
            ? `<div class="prev-figure-container">
                <h3 class="prev-label">Previous Day's</h3>
                <a href="${dataRows[index + 1].date}.html">
                    <img src="../Figures/${dataRows[index + 1].date}.png" alt="Previous figure for ${dataRows[index + 1].date}" class="prev-figure" />
                </a>
            </div>`
            : '';

    const nextLink =
        index > 0
            ? `<div class="next-figure-container">
                <h3 class="next-label">Next Day's</h3>
                <a href="${dataRows[index - 1].date}.html">
                    <img src="../Figures/${dataRows[index - 1].date}.png" alt="Next figure for ${dataRows[index - 1].date}" class="next-figure" />
                </a>
            </div>`
            : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${row.title || 'The DailyDATA'} - ${date}</title>
    <link rel="icon" href="../LOGO.png" type="image/png" />
    <link rel="stylesheet" href="../styles.css" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${row.description || ''}" />
</head>
<body>
    <header class="header">
        <div class="logo-container">
            <img src="../LOGO.png" alt="Logo" class="logo" />
            <h1 class="site-title"><a href="../index.html">The DailyDATA</a></h1>
        </div>
        <nav class="navbar">
            <ul>
                <li><a href="../about.html">About</a></li>
                <li><a href="../contact.html">Contact</a></li>
                <li><a href="../people.html">People</a></li>
                <li><a href="../terms-of-use.html">Terms of Use</a></li>
            </ul>
        </nav>
    </header>

    <div class="container">
        <div class="main-content">
            <h2 class="main-title">${row.title}</h2>
            <div class="date">${date}</div>
            <img src="../Figures/${date}.png" alt="Figure for ${date}" class="main-figure" />
            <div class="text">
                <p class="caption">${row.caption || ''}</p>
                <br />
                <hr />
                <br />
                <p class="description">${row.description || ''}</p>
                <br />
                <p class="datasource">${row.datasource ? `Data source: ${row.datasource}` : ''}</p>
                <br />
                <p class="disclaimer"><strong>*These figures have not yet been formally peer reviewed and are intended as exploratory</strong></p>
            </div>
        </div>

        <aside class="sidebar">
            ${prevLink}
            ${nextLink}
        </aside>
    </div>

    <footer class="footer">
        <img src="../LOGO.png" alt="Logo Small" class="footer-logo" />
        <p>&copy; 2025 The DailyDATA. All rights reserved.</p>
    </footer>
</body>
</html>`;

    const newHash = hashContent(htmlContent);

    if (fs.existsSync(filePath) && state.hashes[fileName] === newHash) {
        console.log(`Unchanged, skipped: ${fileName}`);
    } else {
        fs.writeFileSync(filePath, htmlContent);
        state.hashes[fileName] = newHash;
        console.log(`Generated/Updated: ${fileName}`);
    }

    sitemapEntries += `
   <url>
      <loc>https://thedailydata.org/posts/${fileName}</loc>
      <lastmod>${date}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
   </url>`;
});

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>https://thedailydata.org/</loc>
      <lastmod>${dataRows[dataRows.length-1].date}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
   </url>
   ${sitemapEntries}
</urlset>
`;

fs.writeFileSync(sitemapFile, sitemapContent);
console.log('Sitemap generated: sitemap.xml');

state.lastDate = dataRows[dataRows.length-1].date;
fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
