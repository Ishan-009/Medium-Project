import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import commonModules from "../utils/common";
import { verify } from "hono/jwt";
const { SuccessResponse, ErrorResponse } = commonModules;
import {
  createBlogInput,
  updateBlogInput,
  CreateBlogInput,
  UpdateBlogInput,
} from "@ishan09/medium-blog-types";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };

  Variables: {
    userId: string; // you have to add userId variable in order to set userId property of jwt to user.id value , you have to define variable and bind it
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  try {
    const user = await verify(token, c.env.JWT_SECRET);
    c.set("userId", user.id);
    await next();
  } catch (error) {
    return c.json(new ErrorResponse("Unauthorized"), 401);
  }
});

blogRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    const validatedData = createBlogInput.safeParse(body);

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return c.json(new ErrorResponse("Validation failed", errors), 400);
    }
    const { title, content } = validatedData.data;
    const authorId = c.get("userId");

    const blog = await prisma.blog.create({
      data: {
        authorId: Number(authorId),
        title,
        content,
        published: true,
      },
    });

    return c.json(new SuccessResponse("Blog created successfully", blog), 201);
  } catch (error) {
    console.error("Error creating blog:", error);

    return c.json(new ErrorResponse("Failed to create blog", true), 500);
  }
});

blogRouter.put("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    const validatedData = updateBlogInput.safeParse(body);

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return c.json(new ErrorResponse("Validation failed", errors), 400);
    }
    const { title, content } = validatedData.data;
    const blogId = c.req.param("id");

    const blog = await prisma.blog.update({
      where: { id: Number(blogId) },
      data: {
        title,
        content,
      },
    });

    return c.json(new SuccessResponse("Blog updated successfully", blog), 200);
  } catch (error) {
    console.error("Error updating blog:", error);

    return c.json(new ErrorResponse("Failed to update blog", true), 500);
  }
});

blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogId = c.req.param("id");

    const blog = await prisma.blog.findUnique({
      where: { id: Number(blogId) },
    });

    if (!blog) {
      return c.json(new ErrorResponse("Blog not found"), 404);
    }

    return c.json(new SuccessResponse("Blog fetched successfully", blog), 200);
  } catch (error) {
    console.error("Error fetching blog:", error);
    return c.json(new ErrorResponse("Failed to fetch blog"), 500);
  }
});

blogRouter.get("/fetch/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { page = 1, limit = 10 } = await c.req.query();

    const blogs = await prisma.blog.findMany({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    // add one more filter where published == true
    return c.json(
      new SuccessResponse("Blogs fetched successfully", blogs),
      200
    );
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return c.json(new ErrorResponse("Failed to fetch blogs"), 500);
  }
});
