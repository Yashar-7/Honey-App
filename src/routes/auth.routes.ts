import { Router } from "express";
import {
  loginSchema,
  loginUser,
  registerSchema,
  registerUser,
} from "../services/auth.service";

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Alta de dueño nuevo (email + contraseña).
 */
authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const result = await registerUser(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Obtiene un JWT para endpoints protegidos del dueño.
 */
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
