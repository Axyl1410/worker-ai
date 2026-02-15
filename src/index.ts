import { Hono } from "hono";
import aiRoutes from "./routes/ai";
import messageRoutes from "./routes/message";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.route("/message", messageRoutes);
app.route("/ai", aiRoutes);

export default app;
