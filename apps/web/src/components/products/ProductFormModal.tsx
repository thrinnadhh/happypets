import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  categoryLifeStages,
  displaySectionLabels,
  displaySections,
  getCategoryLabel,
  normalizeProductType,
  productCategories,
  productTagLabels,
  productTags,
  productTagStyles,
  presetProductTypes,
  sortTags,
} from "@/data/catalog";
import { categoryBrands } from "@/data/mockData";
import { isManufactureDateInvalid } from "@/lib/commerce";
import { Product, ProductCategory, ProductShopInventory, ProductTag, ShopLocation } from "@/types";
import { uploadImageToSupabase } from "@/lib/supabase";

type ProductFormInput = Omit<Product, "id" | "soldCount" | "revenue">;
const OTHER_BRAND_VALUE = "__other__";
const OTHER_PRODUCT_TYPE_VALUE = "__other_product_type__";

const emptyForm: ProductFormInput = {
  name: "",
  category: "Dog",
  productType: "Dry Food",
  lifeStage: "Adult",
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
  shopInventories: [],
};

function validateProductForm(
  form: ProductFormInput,
): Partial<Record<"brand" | "productType" | "price" | "quantity" | "discount" | "packetCount" | "dates" | "shops", string>> {
  const errors: Partial<Record<"brand" | "productType" | "price" | "quantity" | "discount" | "packetCount" | "dates" | "shops", string>> = {};

  if (!form.brand.trim()) {
    errors.brand = "Brand name is required.";
  }

  if (!form.productType.trim()) {
    errors.productType = "Product type is required.";
  }

  if (form.price <= 0) {
    errors.price = "Price must be greater than 0.";
  }

  if (form.quantity < 0) {
    errors.quantity = "Quantity cannot be negative.";
  }

  if ((form.discount ?? 0) < 0) {
    errors.discount = "Discount cannot be negative.";
  }

  if (form.packetCount < 1) {
    errors.packetCount = "Packet count must be at least 1.";
  }

  if (!form.shopInventories?.length) {
    errors.shops = "Select at least one fulfillment shop.";
  }

  if (form.shopInventories?.some((inventory) => inventory.stockQuantity < 0)) {
    errors.quantity = "Per-shop stock cannot be negative.";
  }

  if (isManufactureDateInvalid(form.manufactureDate, form.expiryDate)) {
    errors.dates = "Manufacture date must be before expiry date.";
  }

  return errors;
}

function buildInitialInventories(
  product: Product | null | undefined,
  availableShops: ShopLocation[],
): ProductShopInventory[] {
  if (product?.shopInventories?.length) {
    return product.shopInventories;
  }

  if (product?.shopId) {
    const matchedShop = availableShops.find((shop) => shop.id === product.shopId);
    return [
      {
        shopId: product.shopId,
        shopName: matchedShop?.name ?? "Primary shop",
        stockQuantity: product.quantity,
        isActive: true,
      },
    ];
  }

  const firstShop = availableShops[0];
  if (!firstShop) {
    return [];
  }

  return [{
    shopId: firstShop.id,
    shopName: firstShop.name,
    stockQuantity: 0,
    isActive: true,
  }];
}

function calculateTotalQuantity(inventories: ProductShopInventory[] | undefined): number {
  return (inventories ?? []).reduce((sum, inventory) => sum + Math.max(0, inventory.stockQuantity), 0);
}

function buildBrandOptions(
  category: ProductCategory,
  existingBrandsByCategory: Record<ProductCategory, string[]>,
  currentBrand?: string,
): string[] {
  const catalogBrands = [...categoryBrands[category]];
  const dynamicBrands = existingBrandsByCategory[category] ?? [];
  const merged = [...catalogBrands, ...dynamicBrands, currentBrand ?? ""]
    .map((brand) => brand.trim())
    .filter(Boolean);

  return [...new Set(merged)].sort((left, right) => left.localeCompare(right));
}

export function ProductFormModal({
  open,
  product,
  availableShops,
  existingBrandsByCategory,
  onClose,
  onSave,
}: {
  open: boolean;
  product?: Product | null;
  availableShops: ShopLocation[];
  existingBrandsByCategory: Record<ProductCategory, string[]>;
  onClose: () => void;
  onSave: (input: ProductFormInput) => Promise<void>;
}): JSX.Element {
  const [form, setForm] = useState<ProductFormInput>(emptyForm);
  const [brandMode, setBrandMode] = useState<"preset" | "other">("preset");
  const [customBrand, setCustomBrand] = useState("");
  const [productTypeMode, setProductTypeMode] = useState<"preset" | "other">("preset");
  const [customProductType, setCustomProductType] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const validationErrors = validateProductForm(form);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const brandOptions = buildBrandOptions(form.category, existingBrandsByCategory, form.brand);
  const brandValue = brandMode === "other" ? customBrand : form.brand;
  const productTypeValue = productTypeMode === "other" ? customProductType : form.productType;

  useEffect(() => {
    if (product) {
      const { id, soldCount, revenue, shopId, createdAt, ...rest } = product;
      const shopInventories = buildInitialInventories(product, availableShops);
      const nextBrandOptions = buildBrandOptions(rest.category, existingBrandsByCategory, rest.brand);
      const normalizedType = normalizeProductType(rest.productType, `${rest.name} ${rest.description} ${rest.weight}`);
      setForm({
        ...rest,
        productType: normalizedType,
        quantity: calculateTotalQuantity(shopInventories),
        shopInventories,
        lifeStage:
          rest.lifeStage || (categoryLifeStages[rest.category]?.[0] ?? ""),
      });
      setBrandMode(nextBrandOptions.includes(rest.brand) ? "preset" : "other");
      setCustomBrand(rest.brand);
      const isPresetType = presetProductTypes.includes(normalizedType as (typeof presetProductTypes)[number]);
      setProductTypeMode(isPresetType ? "preset" : "other");
      setCustomProductType(isPresetType ? "" : normalizedType);
      setPreview(rest.image);
      return;
    }

    const shopInventories = buildInitialInventories(null, availableShops);
    const defaultBrand = categoryBrands.Dog[0];
    setForm({
      ...emptyForm,
      brand: defaultBrand,
      quantity: calculateTotalQuantity(shopInventories),
      shopInventories,
    });
    setBrandMode("preset");
    setCustomBrand("");
    setProductTypeMode("preset");
    setCustomProductType("");
    setPreview("");
    setUploadProgress(0);
    setUploadError("");
  }, [product, open, availableShops, existingBrandsByCategory]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleCategoryChange = (category: ProductCategory): void => {
    const nextLifeStages = categoryLifeStages[category] ?? [];
    const nextBrandOptions = buildBrandOptions(category, existingBrandsByCategory);
    const nextBrand = nextBrandOptions[0] ?? categoryBrands[category][0];
    setForm((current) => ({
      ...current,
      category,
      lifeStage: nextLifeStages.length ? nextLifeStages[0] : "",
      displaySection: current.displaySection === current.category ? category : current.displaySection,
      brand: nextBrand,
    }));
    setBrandMode("preset");
    setCustomBrand("");
  };

  const toggleTag = (tag: ProductTag): void => {
    setForm((current) => ({
      ...current,
      tags: current.tags?.includes(tag)
        ? current.tags.filter((value) => value !== tag)
        : sortTags([...(current.tags ?? []), tag]),
    }));
  };

  const toggleShop = (shop: ShopLocation): void => {
    setForm((current) => {
      const existing = current.shopInventories?.find((inventory) => inventory.shopId === shop.id);
      const shopInventories = existing
        ? (current.shopInventories ?? []).filter((inventory) => inventory.shopId !== shop.id)
        : [
            ...(current.shopInventories ?? []),
            {
              shopId: shop.id,
              shopName: shop.name,
              stockQuantity: 0,
              isActive: shop.status === "active",
            },
          ];

      return {
        ...current,
        shopInventories,
        quantity: calculateTotalQuantity(shopInventories),
      };
    });
  };

  const updateInventoryStock = (shopId: string, stockQuantity: number): void => {
    setForm((current) => {
      const shopInventories = (current.shopInventories ?? []).map((inventory) =>
        inventory.shopId === shopId
          ? { ...inventory, stockQuantity: Math.max(0, stockQuantity || 0) }
          : inventory,
      );

      return {
        ...current,
        shopInventories,
        quantity: calculateTotalQuantity(shopInventories),
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (hasValidationErrors) {
      setUploadError(Object.values(validationErrors)[0] ?? "Please fix the highlighted product fields.");
      return;
    }

    setSaving(true);
    setUploadError("");

    try {
      await onSave({
        ...form,
        brand: brandValue.trim(),
        productType: productTypeValue.trim(),
        quantity: calculateTotalQuantity(form.shopInventories),
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
      if (inputRef.current) {
        inputRef.current.value = "";
      }
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
                    <option key={category} value={category}>
                      {getCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Brand Name</span>
                <select
                  value={brandMode === "other" ? OTHER_BRAND_VALUE : form.brand}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === OTHER_BRAND_VALUE) {
                      setBrandMode("other");
                      setCustomBrand(form.brand);
                      return;
                    }

                    setBrandMode("preset");
                    setCustomBrand("");
                    setForm((current) => ({ ...current, brand: nextValue }));
                  }}
                  className="input"
                >
                  {brandOptions.map((brand) => (
                    <option key={brand}>{brand}</option>
                  ))}
                  <option value={OTHER_BRAND_VALUE}>Other</option>
                </select>
                {brandMode === "other" ? (
                  <input
                    value={customBrand}
                    onChange={(event) => {
                      const nextBrand = event.target.value;
                      setCustomBrand(nextBrand);
                      setForm((current) => ({ ...current, brand: nextBrand }));
                    }}
                    className="input mt-3"
                    placeholder="Enter brand name"
                    required
                  />
                ) : null}
                {validationErrors.brand ? <p className="text-xs text-rose-500">{validationErrors.brand}</p> : null}
              </label>

              <label className="field">
                <span>Product Type</span>
                <select
                  value={productTypeMode === "other" ? OTHER_PRODUCT_TYPE_VALUE : form.productType}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === OTHER_PRODUCT_TYPE_VALUE) {
                      setProductTypeMode("other");
                      setCustomProductType(form.productType);
                      return;
                    }

                    setProductTypeMode("preset");
                    setCustomProductType("");
                    setForm((current) => ({ ...current, productType: nextValue }));
                  }}
                  className="input"
                >
                  {presetProductTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value={OTHER_PRODUCT_TYPE_VALUE}>Other</option>
                </select>
                {productTypeMode === "other" ? (
                  <input
                    value={customProductType}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setCustomProductType(nextType);
                      setForm((current) => ({ ...current, productType: nextType }));
                    }}
                    className="input mt-3"
                    placeholder="Enter product type"
                    required
                  />
                ) : null}
                {validationErrors.productType ? <p className="text-xs text-rose-500">{validationErrors.productType}</p> : null}
              </label>

              {categoryLifeStages[form.category]?.length ? (
                <label className="field">
                  <span>{form.category} stage</span>
                  <select
                    value={form.lifeStage ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, lifeStage: event.target.value }))}
                    className="input"
                  >
                    {categoryLifeStages[form.category]?.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

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

              <div className="field md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span>Fulfillment Shops</span>
                  <p className="text-sm font-semibold text-brand-700">
                    Total stock: {calculateTotalQuantity(form.shopInventories)}
                  </p>
                </div>
                {availableShops.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableShops.map((shop) => {
                      const selectedInventory = form.shopInventories?.find((inventory) => inventory.shopId === shop.id);
                      const selected = Boolean(selectedInventory);

                      return (
                        <div
                          key={shop.id}
                          className={`rounded-[24px] border p-4 transition ${
                            selected
                              ? "border-brand-300 bg-brand-50/60"
                              : "border-[#e7d9c3] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{shop.name}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{shop.slug}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleShop(shop)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                selected
                                  ? "bg-brand-700 text-white"
                                  : "bg-[#f6efe3] text-slate-600"
                              }`}
                            >
                              {selected ? "Selected" : "Add"}
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[18px] bg-white/80 px-3 py-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coordinates</p>
                              <p className="mt-2 text-sm text-ink">
                                {shop.originLat?.toFixed(6) ?? "NA"}, {shop.originLng?.toFixed(6) ?? "NA"}
                              </p>
                            </div>
                            <label className="field">
                              <span>Stock For This Shop</span>
                              <input
                                type="number"
                                min="0"
                                disabled={!selected}
                                value={selectedInventory?.stockQuantity ?? 0}
                                onChange={(event) => updateInventoryStock(shop.id, Number(event.target.value))}
                                className="input"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-[22px] border border-dashed border-[#d8cab4] px-4 py-4 text-sm text-slate-500">
                    No active shops are available yet. Ask the super admin to configure shop locations first.
                  </p>
                )}
                {validationErrors.shops ? <p className="text-xs text-rose-500">{validationErrors.shops}</p> : null}
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
                <span>Total Quantity</span>
                <input value={calculateTotalQuantity(form.shopInventories)} className="input bg-slate-50" readOnly />
                <p className="text-xs text-slate-500">This total is calculated automatically from the selected fulfillment shops.</p>
                {validationErrors.quantity ? <p className="text-xs text-rose-500">{validationErrors.quantity}</p> : null}
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
                {validationErrors.price ? <p className="text-xs text-rose-500">{validationErrors.price}</p> : null}
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
                {validationErrors.packetCount ? <p className="text-xs text-rose-500">{validationErrors.packetCount}</p> : null}
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
                {validationErrors.discount ? <p className="text-xs text-rose-500">{validationErrors.discount}</p> : null}
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
                {validationErrors.dates ? <p className="text-xs text-rose-500">{validationErrors.dates}</p> : null}
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
                {validationErrors.dates ? <p className="text-xs text-rose-500">{validationErrors.dates}</p> : null}
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
                  disabled={uploading || saving || hasValidationErrors}
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
