"use client";

import { Box, CircularProgress } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiGet } from "@/lib/apiClient";

interface PrintResponse {
  html?: string;
  url?: string;
}

export default function InvoicePrintViewClient() {
  const params = useSearchParams();
  const invoiceID = params.get("invoiceID");
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceID) return;
    const load = async () => {
      try {
        const res = await apiGet<PrintResponse>(
          `/Invoice/PrintView?InvoiceID=${invoiceID}`
        );
        if (res.url) {
          window.location.href = res.url;
        } else if (res.html) {
          setHtml(res.html);
        } else {
          setError("No print content.");
        }
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.message || "Could not load print view.");
      }
    };
    load();
  }, [invoiceID]);

  if (error) {
    return <Box sx={{ p: 2 }}>{error}</Box>;
  }

  if (!html) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

