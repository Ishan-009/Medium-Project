import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { sign } from "hono/jwt";
import { withAccelerate } from "@prisma/extension-accelerate";
import commonModules from "../utils/common";
import {
  signupInput,
  signinInput,
  SignupInput,
  SigninInput,
} from "@ishan09/medium-blog-types";
import { z } from "zod";

const { SuccessResponse, ErrorResponse } = commonModules;

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    const validatedData = signupInput.safeParse(body);

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json(new ErrorResponse("Validation failed", errors), 400);
    }

    const { email, password, name } = validatedData.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return c.json(new ErrorResponse("User already exists"), 409);
    }

    const user = await prisma.user.create({
      data: {
        email,
        password,
        name,
      },
    });

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json(
      new SuccessResponse("User signup successful", { token: jwt }),
      201
    );
  } catch (error) {
    console.error("Error during signup:", error);
    return c.json(new ErrorResponse("An error occurred during signup"), 500);
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();
    const validatedData = signinInput.safeParse(body);

    if (!validatedData.success) {
      const errors = validatedData.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return c.json(new ErrorResponse("Validation failed", errors), 400);
    }

    const { email, password } = validatedData.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.password !== password) {
      return c.json(new ErrorResponse("Invalid credentials"), 401);
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET);

    return c.json(
      new SuccessResponse("User signin successful", { token: jwt }),
      200
    );
  } catch (error) {
    console.error("Error during signin:", error);
    return c.json(new ErrorResponse("An error occurred during signin"), 500);
  }
});
