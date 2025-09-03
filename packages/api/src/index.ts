import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// TODO: import and use routes here

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
