import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    project: "NetArchitect",
    message: "Network Recommendation & Configuration Engine",
    status: "Running"
  });
});

export default app;
