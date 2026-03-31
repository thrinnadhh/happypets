import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  displaySectionLabels,
  displaySections,
  productCategories,
  productTagLabels,
  productTags,
  productTagStyles,
  sortTags,
} from "@/data/catalog";
import { categoryBrands } from "@/data/mockData";
import { Product, ProductCategory, ProductTag } from "@/types";
import { uploadImageToSupabase } from "@/lib/supabase";

type ProductFormInput = Omit<Product, "id" | "soldCount" | "revenue">;

const emptyForm: ProductFormInput = {
  name: "",
  category: "Dog",
  displaySection: "Dog",
  position: 1,
  tags: [],
  brand: categoryBrands.Dog[0],
  image: "",
  description: "",
  quantity: 0,
  price: 0,
  discount: 0,
  weight: "",
  packetCount: 1,
  isSample: false,
  manufactureDate: "",
  expiryDate: "",
  rating: 4.8,
  gallery: [],
};

export function ProductFormModal({
  open,
  product,
  onClose,
  onSave,
}: {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSave: (input: ProductFormInput) => Promise<void>;
}): JSX.Element {
  const [form, setForm] = useState<ProductFormInput>(emptyForm);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (product) {
      const { id, soldCount, revenue, shopId, createdAt, ...rest } = product;
      setForm(rest);
      setPreview(rest.image);
      return;
    }

    setForm(emptyForm);
    setPreview("");
    setUploadProgress(0);
    setUploadError("");
  }, [product, open]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleCategoryChange = (category: ProductCategory): void => {
    setForm((current) => ({
      ...current,
      category,
      displaySection: current.displaySection === current.category ? category : current.displaySection,
      brand: categoryBrands[category][0],
    }));
  };

  const toggleTag = (tag: ProductTag): void => {
    setForm((current) => ({
      ...current,
      tags: current.tags?.includes(tag)
        ? current.tags.filter((value) => value !== tag)
        : sortTags([...(current.tags ?? []), tag]),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setUploadError("");

    try {
      await onSave({
        ...form,
        gallery: form.gallery?.length ? form.gallery : [form.image],
      });
      onClose();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (file?: File): Promise<void> => {
    if (!file) return;

    setUploadError("");
    setUploading(true);
    setUploadProgress(8);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const publicUrl = await uploadImageToSupabase(file, setUploadProgress);
      setForm((current) => ({
        ...current,
        image: publicUrl,
        gallery: current.gallery?.length
          ? [publicUrl, ...current.gallery.filter((image) => image !== publicUrl)]
          : [publicUrl],
      }));
      setPreview(publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#1a1a1a]/30 px-4 py-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-700">
                  {product ? "Update Product" : "Create Product"}
                </p>
                <h2 className="mt-2 font-heading text-3xl font-semibold text-ink">
                  Product management form
                </h2>
              </div>
              <button onClick={onClose} className="soft-button">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Product Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="input"
                  required
                />
              </label>

              <label className="field">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) => handleCategoryChange(event.target.value as ProductCategory)}
                  className="input"
                >
                  {productCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Brand Name</span>
                <select
                  value={form.brand}
                  onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                  className="input"
                >
                  {categoryBrands[form.category].map((brand) => (
                    <option key={brand}>{brand}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Display Section</span>
                <select
                  value={form.displaySection}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displaySection: event.target.value as Product["displaySection"],
                    }))
                  }
                  className="input"
                >
                  {displaySections.map((section) => (
                    <option key={section} value={section}>
                      {section === "Home" ? "Home" : displaySectionLabels[section]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Position</span>
                <input
                  type="number"
                  min="1"
                  value={form.position}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      position: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="input"
                  required
                />
                <p className="text-xs text-slate-500">Lower numbers appear first in the selected section.</p>
              </label>

              <div className="field md:col-span-2">
                <span>Tags</span>
                <div className="flex flex-wrap gap-3">
                  {productTags.map((tag) => {
                    const active = form.tags?.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? productTagStyles[tag]
                            : "border-[#e7d9c3] bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700"
                        }`}
                      >
                        {productTagLabels[tag]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">Use tags to control homepage highlights and category-page filters.</p>
              </div>

              <div className="field">
                <span>Upload Image</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleFileChange(event.target.files?.[0])}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-white shadow-soft"
                    style={{ backgroundImage: "linear-gradient(135deg, #2F4F6F 0%, #3B628A 100%)" }}
                  >
                    +
                  </button>
                  <input
                    value={form.image}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setForm((current) => ({ ...current, image: nextValue }));
                      setPreview(nextValue);
                    }}
                    className="input flex-1"
                    placeholder="Paste image URL"
                    required
                  />
                </div>
                {preview ? (
                  <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-[#FAFAF9]">
                    <img src={preview} alt="Product preview" className="h-48 w-full object-cover" />
                  </div>
                ) : null}
                {uploading ? (
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#2F4F6F] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">Uploading to Supabase Storage... {uploadProgress}%</p>
                  </div>
                ) : null}
                {uploadError ? <p className="text-xs text-rose-500">{uploadError}</p> : null}
              </div>

              <label className="field md:col-span-2">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="input min-h-[120px]"
                  required
                />
              </label>

              <label className="field">
                <span>Quantity</span>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                  }
                  className="input"
                  required
                />
              </label>

              <label className="field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: Number(event.target.value) }))
                  }
                  className="input"
                  required
                />
                <p className="text-xs text-slate-500">Enter the selling price in INR.</p>
              </label>

              <label className="field">
                <span>Weight</span>
                <input
                  value={form.weight}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, weight: event.target.value }))
                  }
                  className="input"
                  placeholder="1kg"
                  required
                />
              </label>

              <label className="field">
                <span>Packet Count</span>
                <input
                  type="number"
                  min="1"
                  value={form.packetCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      packetCount: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="input"
                  required
                />
              </label>

              <label className="field md:col-span-2">
                <span>Product Flags</span>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, isSample: !current.isSample }))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      form.isSample
                        ? "border-brand-300 bg-brand-100 text-brand-700"
                        : "border-[#e7d9c3] bg-white text-slate-500"
                    }`}
                  >
                    {form.isSample ? "Sample Enabled" : "Mark As Sample"}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Discount (optional)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount ?? 0}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, discount: Number(event.target.value) }))
                  }
                  className="input"
                />
              </label>

              <label className="field">
                <span>Rating</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rating: Number(event.target.value) }))
                  }
                  className="input"
                  required
                />
              </label>

              <label className="field">
                <span>Manufacture Date</span>
                <input
                  type="date"
                  value={form.manufactureDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, manufactureDate: event.target.value }))
                  }
                  className="input"
                  required
                />
              </label>

              <label className="field">
                <span>Expiry Date</span>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expiryDate: event.target.value }))
                  }
                  className="input"
                  required
                />
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="soft-button">
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={uploading || saving}
                  className="primary-button disabled:opacity-60"
                >
                  {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
