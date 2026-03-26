import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  // In-memory state
  let globalState = {
    layoutConfig: {
      'btn-start': { x: 0, y: 0, w: 1, h: 1 },
      'btn-settings': { x: 0, y: 0, w: 1, h: 1 },
      'btn-categories': { x: 0, y: 0, w: 1, h: 1 },
      'btn-colors': { x: 0, y: 0, w: 1, h: 1 },
      'btn-back': { x: 0, y: 0, w: 1, h: 1 },
      'category-box': { x: 0, y: 0, w: 1, h: 1 },
      'voting-options': { x: 0, y: 0, w: 1, h: 1 },
      'out-guess-options': { x: 0, y: 0, w: 1, h: 1 },
    },
    backgroundColor: '#40E0D0',
    categories: null // Will be initialized by the first client or kept null until someone sets it
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send current state to the new client
    socket.emit("sync_state", globalState);

    socket.on("update_layout", (newLayout) => {
      globalState.layoutConfig = newLayout;
      socket.broadcast.emit("layout_updated", newLayout);
    });

    socket.on("update_background", (newColor) => {
      globalState.backgroundColor = newColor;
      socket.broadcast.emit("background_updated", newColor);
    });

    socket.on("update_categories", (newCategories) => {
      globalState.categories = newCategories;
      socket.broadcast.emit("categories_updated", newCategories);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
