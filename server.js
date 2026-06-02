const express = require("express");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
    res.json({ status: "ok", hostname: os.hostname() });
});

app.listen(PORT, () => {
    console.log(`Mandelbrot Explorer running on port ${PORT}`);
});
