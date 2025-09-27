const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/analyze-sentiment', async (req, res) => {
  const { text } = req.body;
  // ทำการเรียก HuggingFace API ที่นี่ (ใส่ token จาก .env)
  res.json({ message: 'รับข้อความแล้ว', text });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
