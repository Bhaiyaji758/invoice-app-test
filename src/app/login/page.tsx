"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Link as MUILink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiPost, ApiError, setAuthContext } from "@/lib/apiClient";

interface LoginResponse {
  token: string;
  user: {
    userID: number;
    firstName: string;
    lastName?: string;
    email: string;
  };
  company: {
    companyID: number;
    companyName: string;
    currencySymbol: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (
      !trimmedEmail ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)
    ) {
      errors.email = "Enter a valid email address.";
    }
    if (!password || password.length < 8 || password.length > 20) {
      errors.password = "Enter your password.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    try {
      setSubmitting(true);
      const body = {
        email: email.trim(),
        password,
        rememberMe,
      };
      const res = await apiPost<LoginResponse>(
        "/Auth/Login",
        body,
        false
      );
      setAuthContext(res.token, res.user, res.company, rememberMe);
      router.push("/invoices");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        setAuthError("Email or password is wrong.");
      } else if (apiErr.status === 400) {
        setAuthError(apiErr.message || "Enter a valid email or password.");
      } else {
        setAuthError("Could not log in. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          width: "100%",
          bgcolor: "background.paper",
          boxShadow: 3,
          borderRadius: 2,
          p: 4,
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Welcome Back
            </Typography>
            <Typography color="text.secondary">
              Log in to your account.
            </Typography>
          </Box>

          {authError && <Alert severity="error">{authError}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
            autoComplete="current-password"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Keep me signed in."
          />

          <Button
            type="submit"
            disabled={submitting}
            fullWidth
            size="large"
          >
            {submitting ? "Logging in..." : "Login"}
          </Button>

          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <MUILink component={Link} href="/signup" underline="hover">
              Create account
            </MUILink>
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

