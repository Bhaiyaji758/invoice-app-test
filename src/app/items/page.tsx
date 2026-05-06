"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiGet, apiPost } from "@/lib/apiClient";

interface ItemRow {
  itemID: number;
  itemName: string;
  description: string | null;
  saleRate: number;
  discountPct: number;
  updatedOn: string;
}

interface InsertUpdateResponse {
  itemID: number;
  updatedOn: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async (itemID?: number) => {
    setLoading(true);
    try {
      const query = itemID ? `?itemID=${itemID}` : "";
      const res = await apiGet<ItemRow[]>(`/item/getlist${query}`);
      if (itemID && res.length === 1) {
        setItems((prev) => {
          const existing = prev.findIndex((i) => i.itemID === itemID);
          if (existing === -1) {
            return [...prev, res[0]];
          }
          const copy = [...prev];
          copy[existing] = res[0];
          return copy;
        });
      } else {
        setItems(res);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Could not load items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(term) ||
        (i.description ?? "").toLowerCase().includes(term)
    );
  }, [items, search]);

  const handleOpenNew = () => {
    setEditingItem(null);
    setEditorOpen(true);
  };

  const handleEdit = (row: ItemRow) => {
    setEditingItem(row);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await apiPost<{ ok: boolean }>("/item/delete", { itemID: confirmDeleteId });
      setItems((prev) => prev.filter((i) => i.itemID !== confirmDeleteId));
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Could not delete item.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleSaved = (resp: InsertUpdateResponse) => {
    loadItems(resp.itemID);
  };

  const columns: GridColDef<ItemRow>[] = [
    {
      field: "itemName",
      headerName: "Item Name",
      flex: 1.2,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 600 }}>{params.row.itemName}</Typography>
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 2,
      renderCell: (params) => (
        <Tooltip title={params.row.description || ""}>
          <Typography noWrap>{params.row.description}</Typography>
        </Tooltip>
      ),
    },
    {
      field: "saleRate",
      headerName: "Sale Rate",
      flex: 0.6,
      type: "number",
      headerAlign: "right",
      align: "right",
      renderCell: (p) => (
        <Typography>
          {p.row.saleRate.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>
      ),
    },
    {
      field: "discountPct",
      headerName: "Discount %",
      flex: 0.6,
      type: "number",
      headerAlign: "right",
      align: "right",
      renderCell: (p) => (
        <Typography>{p.row.discountPct.toFixed(2)}%</Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            onClick={() => handleEdit(params.row)}
            aria-label="Edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setConfirmDeleteId(params.row.itemID)}
            aria-label="Delete"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5">Items</Typography>
            <Typography color="text.secondary">
              Manage your product and service catalog.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              placeholder="Search by name or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="outlined"
              disabled
            >
              Export
            </Button>
            <Button
              variant="outlined"
              disabled
            >
              Column Chooser
            </Button>
            <Button
              startIcon={<AddIcon />}
              onClick={handleOpenNew}
            >
              Add New Item
            </Button>
          </Box>
        </Box>

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        <Box
          sx={{
            height: 500,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <DataGrid
            rows={filteredItems}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.itemID}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
          />
        </Box>
      </Stack>

      {editorOpen && (
        <ItemEditorDialog
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          item={editingItem}
          onSaved={handleSaved}
        />
      )}

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this item?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

interface ItemEditorDialogProps {
  open: boolean;
  onClose: () => void;
  item: ItemRow | null;
  onSaved: (resp: InsertUpdateResponse) => void;
}

function ItemEditorDialog({ open, onClose, item, onSaved }: ItemEditorDialogProps) {
  const isEdit = !!item;
  const [itemName, setItemName] = useState(item?.itemName ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [saleRate, setSaleRate] = useState(item?.saleRate.toString() ?? "0");
  const [discountPct, setDiscountPct] = useState(item?.discountPct.toString() ?? "0");
  const [errors, setErrors] = useState<{
    itemName?: string;
    saleRate?: string;
    discountPct?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    const name = itemName.trim();
    if (!name) {
      next.itemName = "Please enter item name.";
    } else if (name.length > 50) {
      next.itemName = "Name must be at most 50 characters.";
    }
    const rateNum = Number(saleRate);
    if (Number.isNaN(rateNum) || rateNum < 0) {
      next.saleRate = "Enter a valid rate.";
    }
    const discNum = Number(discountPct || 0);
    if (Number.isNaN(discNum) || discNum < 0 || discNum > 100) {
      next.discountPct = "0–100 only.";
    }
    if (description && description.length > 500) {
      // soft client-side guard
      next.itemName = next.itemName;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSubmitting(true);
      const body = {
        itemID: item?.itemID ?? 0,
        itemName: itemName.trim(),
        description: description.trim() || null,
        saleRate: Number(saleRate),
        discountPct: Number(discountPct || 0),
        updatedOnPrev: item?.updatedOn ?? null,
      };
      const res = await apiPost<InsertUpdateResponse>(
        "/item/insertupdate",
        body
      );
      onSaved(res);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        setErrors((prev) => ({ ...prev, itemName: "Name already exists." }));
      } else if (apiErr.status === 412) {
        setErrors((prev) => ({
          ...prev,
          itemName: "Item updated by another user, please reload.",
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit Item" : "New Item"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Button variant="outlined" disabled>
            Item Picture (coming from blob storage)
          </Button>
          <TextField
            required
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            error={!!errors.itemName}
            helperText={errors.itemName}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={3}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              required
              label="Sale Rate"
              value={saleRate}
              onChange={(e) => setSaleRate(e.target.value)}
              error={!!errors.saleRate}
              helperText={errors.saleRate}
            />
            <TextField
              label="Discount %"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              error={!!errors.discountPct}
              helperText={errors.discountPct}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

