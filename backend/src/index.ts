// import { PrismaClient } from "@prisma/client/edge";

// import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { userRouter } from "./routes/user-routes";
import { blogRouter } from "./routes/blog-routes";
const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

app.route("/api/v1/user", userRouter);
app.route("/api/v1/blog", blogRouter);

app.get("/", async (c) => {
  c.status(200);
  return c.json({
    message: "Welcome to the Medium Blog Project API",
    success: true,
  });
});

export default app;
