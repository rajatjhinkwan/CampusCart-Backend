const handleAsync = require("../utils/handleAsync");

exports.predict = handleAsync(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: "image file required" });
  }

  try {
    const fd = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "application/octet-stream" });
    fd.append("file", blob, req.file.originalname || "image.jpg");

    const upstream = process.env.ML_PREDICT_URL || "http://127.0.0.1:8000/predict";
    const resp = await fetch(upstream, { method: "POST", body: fd });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    if (!resp.ok) {
      return res.status(502).json({ message: "ml upstream error", status: resp.status, data });
    }

    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ message: "prediction failed", error: e?.message || String(e) });
  }
});

