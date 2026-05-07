"use client";

import {
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiGet, apiPost, apiDelete, getAuthCompany } from "@/lib/apiClient";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useRouter } from "next/navigation";

type RangeKey = "today" | "week" | "month" | "year" | "custom";

interface InvoiceRow {
  invoiceID: number;
  invoiceNo: number;
  invoiceDate: string;
  customerName: string;
  itemsCount?: number;
  subTotal: number;
  taxPercentage: number;
  taxAmount: number;
  invoiceAmount: number;
}

interface MetricsResponse {
  invoiceCount: number;
  totalAmount: number;
}

interface TrendPoint {
  monthStart: string;
  invoiceCount: number;
  amountSum: number;
}

interface TopItem {
  itemID: number | null;
  itemName: string;
  amountSum: number;
}

const PIE_COLORS = ["#1976d2", "#9c27b0", "#ff9800", "#4caf50", "#ef5350", "#90a4ae"];

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeMetrics(input: any): MetricsResponse {
  const source = Array.isArray(input) ? input[0] : input;
  return {
    invoiceCount: toNumber(source?.invoiceCount ?? source?.InvoiceCount ?? source?.count),
    totalAmount: toNumber(source?.totalAmount ?? source?.TotalAmount ?? source?.amount),
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const company = getAuthCompany();
  const currency = company?.currencySymbol ?? "₹";

  const [range, setRange] = useState<RangeKey>("month");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [list, setList] = useState<InvoiceRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "true") {
      const timer = setTimeout(() => {
        window.print();
      }, 1500); // Give it time to load charts
      return () => clearTimeout(timer);
    }
  }, []);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // initialize default range "This Month"
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    setFromDate(start);
    setToDate(todayISO);
  }, [todayISO]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchListAndMetrics = async (from?: string, to?: string) => {
    const query = `?from=${from ?? ""}&to=${to ?? ""}`;
    setLoadingList(true);
    setLoadingCards(true);
    try {
      const [listRes, metricsRes] = await Promise.all([
        apiGet<InvoiceRow[]>(`/Invoice/GetList${query}`),
        apiGet<any>(`/Invoice/GetMetrices${query}`),
      ]);
      setList(Array.isArray(listRes) ? listRes : []);
      setMetrics(normalizeMetrics(metricsRes));
    } catch (err) {
      setList([]);
      setMetrics({ invoiceCount: 0, totalAmount: 0 });
    } finally {
      setLoadingList(false);
      setLoadingCards(false);
    }
  };

  const fetchTrend = async () => {
    setLoadingTrend(true);
    try {
      const res = await apiGet<TrendPoint[]>("/Invoice/GetTrend12m");
      setTrend(Array.isArray(res) ? res : []);
    } catch {
      setTrend([]);
    } finally {
      setLoadingTrend(false);
    }
  };

  const fetchTopItems = async (from?: string, to?: string) => {
    const query = `?from=${from ?? ""}&to=${to ?? ""}`;
    setLoadingTop(true);
    try {
      const res = await apiGet<TopItem[]>(`/Invoice/TopItems${query}`);
      setTopItems(Array.isArray(res) ? res : []);
    } catch {
      setTopItems([]);
    } finally {
      setLoadingTop(false);
    }
  };

  // initial load after dates are ready
  useEffect(() => {
    if (!fromDate || !toDate) return;
    fetchListAndMetrics(fromDate, toDate);
    fetchTrend();
    fetchTopItems(fromDate, toDate);
  }, [fromDate, toDate]);

  const onRangeChange = (key: RangeKey) => {
    setRange(key);
    const now = new Date();
    let from = fromDate;
    let to = toDate;
    if (key !== "custom") {
      if (key === "today") {
        const iso = todayISO;
        from = iso;
        to = iso;
      } else if (key === "week") {
        const day = now.getDay();
        const diff = (day + 6) % 7;
        const start = new Date(now);
        start.setDate(now.getDate() - diff);
        from = start.toISOString().slice(0, 10);
        to = todayISO;
      } else if (key === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        from = start.toISOString().slice(0, 10);
        to = todayISO;
      } else if (key === "year") {
        const start = new Date(now.getFullYear(), 0, 1);
        from = start.toISOString().slice(0, 10);
        to = todayISO;
      }
      setFromDate(from);
      setToDate(to);
      fetchListAndMetrics(from, to);
      fetchTopItems(from, to);
    }
  };

  const onCustomDatesChange = (from: string, to: string) => {
    setRange("custom");
    setFromDate(from);
    setToDate(to);
    if (from && to) {
      fetchListAndMetrics(from, to);
      fetchTopItems(from, to);
    }
  };

  const filteredList = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (row) =>
        row.invoiceNo.toString().includes(term) ||
        row.customerName.toLowerCase().includes(term)
    );
  }, [list, search]);

  const showToast = (message: string, severity: "success" | "error" = "success") => {
    setToast({ open: true, message, severity });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await apiDelete<{ ok: boolean }>(`/Invoice/${id}`);
      showToast("Invoice deleted successfully.");
      if (fromDate && toDate) {
        fetchListAndMetrics(fromDate, toDate);
        fetchTrend();
        fetchTopItems(fromDate, toDate);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      showToast(apiErr.message || "Could not delete invoice.", "error");
    }
  };

  const columns: GridColDef<InvoiceRow>[] = [
    {
      field: "invoiceNo",
      headerName: "Invoice No",
      flex: 0.6,
      renderCell: (p) => (
        <Typography sx={{ fontWeight: 600 }}>{p.row.invoiceNo}</Typography>
      ),
    },
    {
      field: "invoiceDate",
      headerName: "Invoice Date",
      flex: 0.7,
      renderCell: (p) => {
        const d = new Date(p.row.invoiceDate);
        return (
          <Typography>
            {d.toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Typography>
        );
      },
    },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
    },
    {
      field: "subTotal",
      headerName: "Sub Total",
      headerAlign: "right",
      align: "right",
      flex: 0.7,
      renderCell: (p) => (
        <Typography>
          {currency}{" "}
          {p.row.subTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: "taxPercentage",
      headerName: "Tax %",
      headerAlign: "right",
      align: "right",
      flex: 0.5,
      renderCell: (p) => (
        <Typography>{p.row.taxPercentage.toFixed(2)}</Typography>
      ),
    },
    {
      field: "taxAmount",
      headerName: "Tax Amt",
      headerAlign: "right",
      align: "right",
      flex: 0.6,
      renderCell: (p) => (
        <Typography>
          {currency}{" "}
          {p.row.taxAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: "invoiceAmount",
      headerName: "Total",
      headerAlign: "right",
      align: "right",
      flex: 0.8,
      renderCell: (p) => (
        <Typography>
          {currency}{" "}
          {p.row.invoiceAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 220,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={() =>
              router.push(`/invoice/editor?invoiceID=${params.row.invoiceID}`)
            }
          >
            Edit
          </Button>
          <Button
            size="small"
            onClick={() =>
              window.open(
                `/invoices?print=true`,
                "_blank"
              )
            }
          >
            Print
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => setConfirmDeleteId(params.row.invoiceID)}
          >
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

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
          <Typography variant="h5">Invoices</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {(["today", "week", "month", "year", "custom"] as RangeKey[]).map(
              (key) => (
                <Chip
                  key={key}
                  label={
                    key === "today"
                      ? "Today"
                      : key === "week"
                        ? "Week"
                        : key === "month"
                          ? "Month"
                          : key === "year"
                            ? "Year"
                            : "Custom"
                  }
                  color={range === key ? "primary" : "default"}
                  onClick={() => {
                    if (key === "custom") {
                      setRange("custom");
                    } else {
                      onRangeChange(key);
                    }
                  }}
                />
              )
            )}
            <Stack direction="row" spacing={1}>
              <TextField
                type="date"
                size="small"
                value={fromDate}
                onChange={(e) =>
                  onCustomDatesChange(e.target.value, toDate)
                }
              />
              <TextField
                type="date"
                size="small"
                value={toDate}
                onChange={(e) =>
                  onCustomDatesChange(fromDate, e.target.value)
                }
              />
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 200,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <Typography variant="subtitle2"># Invoices</Typography>
            <Typography variant="h5">
              {loadingCards || !metrics ? "-" : metrics.invoiceCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In selected range
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 200,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            <Typography variant="subtitle2">Total Amount</Typography>
            <Typography variant="h5">
              {loadingCards || !metrics
                ? "-"
                : `${currency} ${metrics.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In selected range
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1.5,
              minWidth: 260,
              width: { xs: "100%", md: "auto" },
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              height: 180,
              overflow: "hidden",
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Last 12 Months
            </Typography>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis
                    dataKey="monthStart"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString(undefined, {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis />
                  <ReTooltip
                    formatter={(value: any, name: any) => {
                      if (name === "amountSum") {
                        return [
                          `${currency} ${Number(value).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`,
                          "Amount",
                        ];
                      }
                      if (name === "invoiceCount") {
                        return [value, "Count"];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="amountSum"
                    stroke="#1976d2"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: "100%" }} />
            )}
          </Box>
          <Box
            sx={{
              flex: 1.2,
              minWidth: 260,
              width: { xs: "100%", md: "auto" },
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              height: 180,
              overflow: "hidden",
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Top Items
            </Typography>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topItems}
                    dataKey="amountSum"
                    nameKey="itemName"
                    outerRadius={70}
                    labelLine={false}
                  >
                    {topItems.map((entry, index) => (
                      <Cell
                        key={entry.itemName}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(value: any) => {
                      const total = topItems.reduce(
                        (sum, i) => sum + i.amountSum,
                        0
                      );
                      const share =
                        total > 0 ? (Number(value) / total) * 100 : 0;
                      return [
                        `${currency} ${Number(value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} (${share.toFixed(1)}%)`,
                        "Amount",
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: "100%" }} />
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search by Invoice No or Customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ maxWidth: 320 }}
          />
          <Stack direction="row" spacing={1}>
            {/* <Button
              variant="outlined"
              disabled
            >
              Export
            </Button> */}
            {/* <Button
              variant="outlined"
              disabled
            >
              Column Chooser
            </Button> */}
            <Button onClick={() => router.push("/invoice/editor")}>
              New Invoice
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            height: 500,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={filteredList}
            columns={columns}
            getRowId={(row) => row.invoiceID}
            loading={loadingList}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    No invoices found.
                  </Typography>
                </Box>
              ),
            }}
          />
        </Box>
      </Stack>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this invoice? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete} variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

