"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  _id: string;
  title: string;
}

interface FormImage {
  assetId: string;
  url: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  discount: string;
  stock: string;
  categoryId: string;
  brandId: string;
  status: string;
  variant: string;
  isFeatured: boolean;
  images: FormImage[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  price: "",
  discount: "0",
  stock: "0",
  categoryId: "",
  brandId: "none",
  status: "none",
  variant: "others",
  isFeatured: false,
  images: [],
};

const MAX_IMAGES = 8;

interface ProductFormDialogProps {
  open: boolean;
  /** Product id to edit, or null to create a new product. */
  productId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const ProductFormDialog: React.FC<ProductFormDialogProps> = ({
  open,
  productId,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(productId);

  // Load dropdown options + (when editing) the product itself.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const optionsRes = await fetch("/api/admin/products/options", {
          cache: "no-store",
        });
        if (!optionsRes.ok) throw new Error("Could not load categories");
        const options = await optionsRes.json();
        if (cancelled) return;
        setCategories(options.categories ?? []);
        setBrands(options.brands ?? []);

        if (!productId) {
          setForm(EMPTY);
          return;
        }

        const res = await fetch(`/api/admin/products?id=${productId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load product");
        const { product } = await res.json();
        if (cancelled) return;
        setForm({
          name: product.name ?? "",
          description: product.description ?? "",
          price: String(product.price ?? ""),
          discount: String(product.discount ?? 0),
          stock: String(product.stock ?? 0),
          categoryId: product.categories?.[0]?._id ?? "",
          brandId: product.brand?._id ?? "none",
          status: product.status ?? "none",
          variant: product.variant ?? "others",
          isFeatured: Boolean(product.isFeatured),
          images: (product.images ?? [])
            .filter((img: { asset?: { _id: string; url: string } }) => img.asset?._id)
            .map((img: { asset: { _id: string; url: string } }) => ({
              assetId: img.asset._id,
              url: img.asset.url,
            })),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load form");
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - form.images.length;
    if (room <= 0) {
      toast.error(`A product can have at most ${MAX_IMAGES} images`);
      return;
    }

    setUploading(true);
    try {
      const uploaded: FormImage[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/products/upload", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(`${file.name}: ${data.error ?? "upload failed"}`);
          continue;
        }
        uploaded.push({ assetId: data.assetId, url: data.url });
      }
      if (uploaded.length) set("images", [...form.images, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const moveFirst = (index: number) =>
    set("images", [form.images[index], ...form.images.filter((_, i) => i !== index)]);

  const removeImage = (index: number) =>
    set("images", form.images.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Please choose a category");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            price: form.price,
            discount: form.discount,
            stock: form.stock,
            categoryIds: [form.categoryId],
            brandId: form.brandId === "none" ? null : form.brandId,
            status: form.status === "none" ? null : form.status,
            variant: form.variant,
            isFeatured: form.isFeatured,
            imageAssetIds: form.images.map((i) => i.assetId),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save product");

      toast.success(isEdit ? "Product updated" : "Product created");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            Changes are written straight to Sanity and appear on the storefront.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pf-name">Name</Label>
              <Input
                id="pf-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-desc">Description</Label>
              <Textarea
                id="pf-desc"
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pf-price">Price ({siteConfig.currency.code})</Label>
                <Input
                  id="pf-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-discount">Discount (%)</Label>
                <Input
                  id="pf-discount"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pf-stock">Stock</Label>
                <Input
                  id="pf-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={form.brandId} onValueChange={(v) => set("brandId", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brand</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product type</Label>
                <Select value={form.variant} onValueChange={(v) => set("variant", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gadget">Gadget</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="refrigerators">Refrigerators</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="pf-featured">Featured product</Label>
                <p className="text-xs text-muted-foreground">
                  Shown in featured sections on the home page.
                </p>
              </div>
              <Switch
                id="pf-featured"
                checked={form.isFeatured}
                onCheckedChange={(v) => set("isFeatured", v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Images ({form.images.length}/{MAX_IMAGES})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading || form.images.length >= MAX_IMAGES}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {form.images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  <ImagePlus className="h-6 w-6" />
                  Click to upload product photos (JPG, PNG, WebP — max 8 MB each)
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {form.images.map((img, index) => (
                    <div
                      key={img.assetId}
                      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${img.url}?w=240&h=240&fit=crop`}
                        alt={`Product image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                          Main
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {index !== 0 ? (
                          <button
                            type="button"
                            onClick={() => moveFirst(index)}
                            className="text-[10px] text-white underline"
                          >
                            Make main
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => removeImage(index)}
                          className="text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create product"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
