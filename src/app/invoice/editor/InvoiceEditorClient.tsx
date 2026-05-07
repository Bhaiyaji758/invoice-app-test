"use client";

import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiGet, apiPost, getAuthCompany } from "@/lib/apiClient";

interface InvoiceHeader {
  invoiceID: number;
  invoiceNo: number | null;
  invoiceDate: string;
  customerName: string;
  address: string | null;
  city: string | null;
  notes: string | null;
  subTotal: number;
  taxPercentage: number;
  taxAmount: number;
  invoiceAmount: number;
  updatedOn: string | null;
}

interface InvoiceLine {
  rowNo: number;
  itemID: number | null;
  description: string | null;
  quantity: number;
  rate: number;
  discountPct: number;
  amount: number;
}

interface InvoiceGetResponse extends InvoiceHeader {
  lines: InvoiceLine[];
}

interface LookupItem {
  itemID: number;
  itemName: string;
  saleRate: number;
  discountPct: number;
}

interface SaveResponse {
  invoiceID: number;
  updatedOn: string;
}

export default function InvoiceEditorClient() {
  const router = useRouter();
  const params = useSearchParams();
  const invoiceID = params.get("invoiceID");
  const company = getAuthCompany();
  const currency = company?.currencySymbol ?? "₹";

  const isEdit = !!invoiceID;

  const [header, setHeader] = useState<InvoiceHeader>({
    invoiceID: 0,
    invoiceNo: null,
    invoiceDate: new Date().toISOString().slice(0, 10),
    customerName: "",
    address: "",
    city: "",
    notes: "",
    subTotal: 0,
    taxPercentage: 0,
    taxAmount: 0,
    invoiceAmount: 0,
    updatedOn: null,
  });
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      rowNo: 1,
      itemID: null,
      description: "",
      quantity: 0,
      rate: 0,
      discountPct: 0,
      amount: 0,
    },
  ]);
  const [itemsLookup, setItemsLookup] = useState<LookupItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    customerName?: string;
    invoiceDate?: string;
    lines?: string;
    server?: string;
  }>({});

  useEffect(() => {
    const loadLookup = async () => {
      try {
        const res = await apiGet<LookupItem[]>("/Item/GetLookupList");
        setItemsLookup(res);
      } catch {
        // ignore
      }
    };
    loadLookup();
  }, []);

  useEffect(() => {
    if (!invoiceID) return;
    const loadInvoice = async () => {
      try {
        const res = await apiGet<any>(`/Invoice/GetList?InvoiceID=${invoiceID}`);
        const row = Array.isArray(res) ? res[0] : res;
        if (!row) return;
        setHeader({
          invoiceID: row.invoiceID,
          invoiceNo: row.invoiceNo,
          invoiceDate: row.invoiceDate,
          customerName: row.customerName,
          address: row.address,
          city: row.city,
          notes: row.notes,
          subTotal: row.subTotal,
          taxPercentage: row.taxPercentage,
          taxAmount: row.taxAmount,
          invoiceAmount: row.invoiceAmount,
          updatedOn: row.updatedOn,
        });
        setLines(
          row.lines && row.lines.length
            ? row.lines
            : [
                {
                  rowNo: 1,
                  itemID: null,
                  description: "",
                  quantity: 0,
                  rate: 0,
                  discountPct: 0,
                  amount: 0,
                },
              ]
        );
      } catch {
        // ignore; keep blank
      }
    };
    loadInvoice();
  }, [invoiceID]);

  const recalcTotals = (currentLines: InvoiceLine[]) => {
    const sub = currentLines.reduce((sum, l) => sum + l.amount, 0);
    let taxAmount = header.taxAmount;
    let taxPercentage = header.taxPercentage;
    if (sub === 0) {
      taxAmount = 0;
      taxPercentage = 0;
    } else {
      if (header.taxPercentage) {
        taxAmount = Math.round(sub * header.taxPercentage) / 100;
      } else if (header.taxAmount) {
        taxPercentage = (header.taxAmount * 100) / sub;
      }
    }
    const invoiceAmount = sub + taxAmount;
    setHeader((prev) => ({
      ...prev,
      subTotal: Number(sub.toFixed(2)),
      taxPercentage: Number(taxPercentage.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      invoiceAmount: Number(invoiceAmount.toFixed(2)),
    }));
  };

  useEffect(() => {
    recalcTotals(lines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const handleLineChange = (
    index: number,
    field: keyof InvoiceLine,
    value: any
  ) => {
    setLines((prev) => {
      const copy = [...prev];
      const line = { ...copy[index] };
      if (field === "itemID") {
        const item = itemsLookup.find((i) => i.itemID === Number(value));
        line.itemID = item ? item.itemID : null;
        if (item) {
          line.description = item.itemName;
          line.rate = item.saleRate;
          line.discountPct = item.discountPct;
        }
      } else if (field === "description") {
        line.description = value;
      } else if (field === "quantity") {
        const num = Number(value);
        line.quantity = Number.isNaN(num) ? 0 : num;
      } else if (field === "rate") {
        const num = Number(value);
        line.rate = Number.isNaN(num) ? 0 : num;
      } else if (field === "discountPct") {
        const num = Number(value);
        line.discountPct = Number.isNaN(num) ? 0 : num;
      }
      const gross = line.quantity * line.rate;
      const disc = gross * (line.discountPct / 100);
      line.amount = Number((gross - disc).toFixed(2));
      copy[index] = line;
      return copy.map((l, idx) => ({ ...l, rowNo: idx + 1 }));
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        rowNo: prev.length + 1,
        itemID: null,
        description: "",
        quantity: 0,
        rate: 0,
        discountPct: 0,
        amount: 0,
      },
    ]);
  };

  const deleteLine = (index: number) => {
    setLines((prev) => {
      if (prev.length === 1) return prev;
      const copy = prev.filter((_, i) => i !== index);
      return copy.map((l, idx) => ({ ...l, rowNo: idx + 1 }));
    });
  };

  const handleTaxChange = (
    field: "taxPercentage" | "taxAmount",
    value: string
  ) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    if (field === "taxPercentage") {
      setHeader((prev) => ({ ...prev, taxPercentage: num, taxAmount: 0 }));
    } else {
      setHeader((prev) => ({ ...prev, taxAmount: num, taxPercentage: 0 }));
    }
    recalcTotals(lines);
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!header.invoiceDate) {
      next.invoiceDate = "Pick a date.";
    }
    if (!header.customerName.trim()) {
      next.customerName = "Enter name.";
    }
    const validLines = lines.filter((l) => l.quantity > 0);
    if (!validLines.length) {
      next.lines = "Add at least one line with Qty > 0.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const body = {
        invoiceID: header.invoiceID || 0,
        invoiceNo: header.invoiceNo,
        invoiceDate: header.invoiceDate,
        customerName: header.customerName.trim(),
        address: header.address?.trim() || null,
        city: header.city?.trim() || null,
        taxPercentage: header.taxPercentage,
        notes: header.notes?.trim() || null,
        updatedOnPrev: header.updatedOn,
        lines: lines.map((l) => ({
          rowNo: l.rowNo,
          itemID: l.itemID,
          description: l.description,
          quantity: l.quantity,
          rate: l.rate,
          discountPct: l.discountPct,
        })),
      };
      const res = await apiPost<SaveResponse>("/Invoice", body);
      setHeader((prev) => ({
        ...prev,
        invoiceID: res.invoiceID,
        updatedOn: res.updatedOn,
      }));
      router.push("/invoices");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        setErrors((prev) => ({
          ...prev,
          server: "Invoice no exists.",
        }));
      } else if (apiErr.status === 412) {
        setErrors((prev) => ({
          ...prev,
          server: "Invoice changed. Reload.",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          server: "Could not save invoice.",
        }));
      }
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? "Edit Invoice" : "New Invoice";

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
          }}
        >
          <Typography variant="h5">{title}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={() => router.push("/invoices")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Save
            </Button>
          </Stack>
        </Box>

        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Invoice No"
              type="number"
              value={header.invoiceNo ?? ""}
              onChange={(e) =>
                setHeader((prev) => ({
                  ...prev,
                  invoiceNo: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
            <TextField
              required
              label="Invoice Date"
              type="date"
              value={header.invoiceDate}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, invoiceDate: e.target.value }))
              }
              error={!!errors.invoiceDate}
              helperText={errors.invoiceDate}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              required
              label="Customer"
              value={header.customerName}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, customerName: e.target.value }))
              }
              error={!!errors.customerName}
              helperText={errors.customerName}
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Address"
              multiline
              minRows={2}
              value={header.address ?? ""}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, address: e.target.value }))
              }
            />
            <TextField
              label="City"
              value={header.city ?? ""}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, city: e.target.value }))
              }
            />
            <TextField
              label="Notes"
              multiline
              minRows={2}
              value={header.notes ?? ""}
              onChange={(e) =>
                setHeader((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </Stack>
        </Stack>

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Line Items
          </Typography>
          {errors.lines && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {errors.lines}
            </Typography>
          )}
          <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
            {lines.map((line, index) => (
              <Box
                key={line.rowNo}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { xs: "flex-start", md: "center" },
                  gap: 1,
                }}
              >
                <Typography sx={{ width: 24 }}>{index + 1}.</Typography>
                <TextField
                  select
                  slotProps={{ select: { native: true } }}
                  label="Item"
                  value={line.itemID ?? ""}
                  onChange={(e) =>
                    handleLineChange(index, "itemID", e.target.value)
                  }
                  fullWidth={false}
                  disabled={itemsLookup.length === 0}
                  helperText={
                    itemsLookup.length === 0
                      ? "No items found. Please add items from /items."
                      : undefined
                  }
                  sx={{ minWidth: 180 }}
                >
                  <option value=""></option>
                  {itemsLookup.map((item) => (
                    <option key={item.itemID} value={item.itemID}>
                      {item.itemName}
                    </option>
                  ))}
                </TextField>
                <TextField
                  label="Description"
                  value={line.description ?? ""}
                  onChange={(e) =>
                    handleLineChange(index, "description", e.target.value)
                  }
                  fullWidth={false}
                  sx={{ flex: 1, minWidth: 160 }}
                />
                <TextField
                  label="Qty"
                  type="number"
                  value={line.quantity}
                  onChange={(e) =>
                    handleLineChange(index, "quantity", e.target.value)
                  }
                  fullWidth={false}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Rate"
                  type="number"
                  value={line.rate}
                  onChange={(e) =>
                    handleLineChange(index, "rate", e.target.value)
                  }
                  fullWidth={false}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Disc %"
                  type="number"
                  value={line.discountPct}
                  onChange={(e) =>
                    handleLineChange(index, "discountPct", e.target.value)
                  }
                  fullWidth={false}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Amount"
                  value={`${currency} ${line.amount.toFixed(2)}`}
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth={false}
                  sx={{ width: 150 }}
                />
                <IconButton
                  onClick={() => deleteLine(index)}
                  disabled={lines.length === 1}
                  aria-label="Delete line"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={addLine}
              sx={{ alignSelf: "flex-start", mt: 1 }}
            >
              Add line
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Box
            sx={{
              minWidth: 280,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              p: 2,
            }}
          >
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography>Sub Total</Typography>
                <Typography>
                  {currency}{" "}
                  {header.subTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  label="Tax %"
                  type="number"
                  value={header.taxPercentage}
                  onChange={(e) =>
                    handleTaxChange("taxPercentage", e.target.value)
                  }
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Tax Amt"
                  type="number"
                  value={header.taxAmount}
                  onChange={(e) => handleTaxChange("taxAmount", e.target.value)}
                  sx={{ width: 160 }}
                />
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Typography sx={{ fontWeight: 600 }}>Invoice Amount</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {currency}{" "}
                  {header.invoiceAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              {errors.server && (
                <Typography color="error" variant="body2">
                  {errors.server}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

