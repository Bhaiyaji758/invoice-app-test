"use client";

import {
  Alert,
  Box,
  Button,
  Link as MUILink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, apiPost, setAuthContext } from "@/lib/apiClient";

interface SignupResponse {
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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
    address: "",
    city: "",
    zip: "",
    industry: "",
    currencySymbol: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | "logo", string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const validate = () => {
    const nextErrors: Partial<Record<keyof typeof form | "logo", string>> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "Please enter your first name.";
    if (!form.lastName.trim()) nextErrors.lastName = "Please enter your last name.";
    const email = form.email.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.password || form.password.length < 8 || form.password.length > 20) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }
    if (!form.companyName.trim()) {
      nextErrors.companyName = "Please enter your company name.";
    }
    if (!form.address.trim()) {
      nextErrors.address = "Please enter company address.";
    }
    if (!form.city.trim()) {
      nextErrors.city = "Please enter city.";
    }
    // TODO: Add support for 6 digit zip codes but in backend we are using 5 digit zip codes.
    if (!/^\d{5}$/.test(form.zip.trim())) {
      nextErrors.zip = "Zip must be exactly 5 digits.";
    }
    if (!form.currencySymbol.trim() || form.currencySymbol.trim().length > 5) {
      nextErrors.currencySymbol = "Enter a valid currency symbol.";
    }

    if (logoFile) {
      const validTypes = ["image/png", "image/jpeg"];
      if (!validTypes.includes(logoFile.type)) {
        nextErrors.logo = "Invalid logo file.";
      } else if (logoFile.size > 5 * 1024 * 1024) {
        nextErrors.logo = "Invalid logo file.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("firstName", form.firstName.trim());
      formData.append("lastName", form.lastName.trim());
      formData.append("email", form.email.trim());
      formData.append("password", form.password);
      formData.append("companyName", form.companyName.trim());
      formData.append("address", form.address.trim());
      formData.append("city", form.city.trim());
      formData.append("zip", form.zip.trim());
      formData.append("industry", form.industry.trim());
      formData.append("currencySymbol", form.currencySymbol.trim());
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await apiPost<SignupResponse>("/Auth/Signup", formData, false);
      setAuthContext(res.token, res.user, res.company, true);
      router.push("/invoices");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        setErrors((prev) => ({ ...prev, email: "Email already exists." }));
      } else if (apiErr.status === 415 || apiErr.status === 413) {
        setErrors((prev) => ({ ...prev, logo: "Invalid logo file." }));
      } else {
        setSubmitError("Could not sign up. Try again.");
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
          maxWidth: 720,
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
              Create Your Account
            </Typography>
            <Typography color="text.secondary">
              Set up your company and start invoicing in minutes.
            </Typography>
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                User Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  required
                  label="First Name"
                  value={form.firstName}
                  onChange={handleChange("firstName")}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                />
                <TextField
                  required
                  label="Last Name"
                  value={form.lastName}
                  onChange={handleChange("lastName")}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                />
                <TextField
                  required
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  error={!!errors.email}
                  helperText={errors.email}
                />
                <TextField
                  required
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  error={!!errors.password}
                  helperText={errors.password}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Company Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  required
                  label="Company Name"
                  value={form.companyName}
                  onChange={handleChange("companyName")}
                  error={!!errors.companyName}
                  helperText={errors.companyName}
                />
                <TextField
                  required
                  label="Address"
                  multiline
                  minRows={3}
                  value={form.address}
                  onChange={handleChange("address")}
                  error={!!errors.address}
                  helperText={errors.address}
                />
                <TextField
                  required
                  label="City"
                  value={form.city}
                  onChange={handleChange("city")}
                  error={!!errors.city}
                  helperText={errors.city}
                />
                <TextField
                  required
                  label="Zip Code"
                  value={form.zip}
                  onChange={handleChange("zip")}
                  error={!!errors.zip}
                  helperText={errors.zip}
                />
                <TextField
                  label="Industry"
                  value={form.industry}
                  onChange={handleChange("industry")}
                  error={!!errors.industry}
                  helperText={errors.industry}
                />
                <TextField
                  required
                  label="Currency Symbol"
                  value={form.currencySymbol}
                  onChange={handleChange("currencySymbol")}
                  error={!!errors.currencySymbol}
                  helperText={errors.currencySymbol}
                />
                <Button variant="outlined" component="label">
                  Upload Company Logo
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setLogoFile(file);
                    }}
                  />
                </Button>
                {errors.logo && (
                  <Typography variant="caption" color="error">
                    {errors.logo}
                  </Typography>
                )}
                {logoFile && (
                  <Typography variant="caption" color="text.secondary">
                    {logoFile.name}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Box>

          <Button type="submit" fullWidth size="large" disabled={submitting}>
            {submitting ? "Signing up..." : "Sign Up"}
          </Button>

          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Already have an account?{" "}
            <MUILink component={Link} href="/login" underline="hover">
              Login
            </MUILink>
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

