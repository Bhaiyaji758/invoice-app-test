"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "@/theme";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

