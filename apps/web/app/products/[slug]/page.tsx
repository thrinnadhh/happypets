"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { featuredProducts } from "@/lib/mock-data";

const thumbnails = ["Forest view", "Kibble close-up", "Ingredient blend", "Happy pet"];

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}): JSX.Element {
  const product =
    featuredProducts.find((entry) => entry.slug === params.slug) ??
    featuredProducts[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 pt-8 md:px-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="glass-panel relative overflow-hidden rounded-[38px] p-5 md:p-6">
            <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient}`} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/70" />
            <div className="absolute inset-4 rounded-[32px] border border-white/10 bg-gradient-to-b from-emerald-200/10 via-slate-900/10 to-slate-950/50 backdrop-blur-md" />
            <div className="relative z-10 min-h-[560px] overflow-hidden rounded-[32px]">
              <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
                Mobile-inspired flagship PDP
              </div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-12 left-10 rounded-[32px] border border-white/10 bg-gradient-to-b from-orange-300 to-amber-700 px-7 py-16 text-center font-heading text-3xl font-semibold text-white shadow-2xl"
              >
                Orijen
              </motion.div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="absolute bottom-10 right-10 flex h-[340px] w-[220px] items-center justify-center rounded-[42px] border border-white/10 bg-gradient-to-b from-stone-100/50 via-stone-300/20 to-stone-700/30 shadow-2xl"
              >
                <div className="h-[250px] w-[150px] rounded-[80px] bg-gradient-to-b from-slate-100/90 via-stone-300/60 to-stone-700/90" />
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {thumbnails.map((label, index) => (
              <motion.button
                key={label}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-panel flex h-24 flex-col items-start justify-between rounded-[24px] p-3 text-left"
              >
                <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${featuredProducts[index % featuredProducts.length].gradient}`} />
                <span className="text-xs text-slate-200">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="space-y-4"
        >
          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <Link href="/categories" className="metric-chip">
                {product.category}
              </Link>
              {product.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  {badge}
                </span>
              ))}
            </div>

            <h1 className="mt-6 font-heading text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300">{product.subtitle}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-300/80">
              <span className="text-lg text-amber-300">★★★★★</span>
              <span>{product.rating.toFixed(1)} / 5</span>
              <span>{product.reviews} reviews</span>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {product.benefits.map((benefit, index) => (
                <motion.article
                  key={benefit}
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: index * 0.03 }}
                  className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <strong className="block text-sm font-semibold text-white">{benefit}</strong>
                  <p className="mt-2 text-sm leading-6 text-slate-300/75">
                    Purpose-built for the denser mobile product experience you referenced.
                  </p>
                </motion.article>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Premium price</p>
                <div className="mt-3 flex items-center gap-3">
                  <strong className="text-4xl font-semibold text-white">${product.price.toFixed(2)}</strong>
                  {product.compareAtPrice ? (
                    <span className="text-lg text-slate-500 line-through">${product.compareAtPrice.toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
              <span className="metric-chip">{product.delivery}</span>
            </div>

            <div className="mt-6 space-y-3">
              <motion.div whileHover={{ y: -3 }} className="rounded-[26px] border border-cyan-400/20 bg-cyan-400/10 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-white">Subscribe &amp; Save</strong>
                    <p className="mt-1 text-sm text-slate-300/80">Soft recurring plan with stock priority and 10% off.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Save 10%</p>
                    <strong className="text-2xl text-white">${(product.price * 0.9).toFixed(2)}</strong>
                  </div>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <strong className="text-white">One-time purchase</strong>
                    <p className="mt-1 text-sm text-slate-300/80">Fast dispatch for a single order.</p>
                  </div>
                  <strong className="text-2xl text-white">${product.price.toFixed(2)}</strong>
                </div>
              </motion.div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button className="gradient-button w-full justify-center">Add to Cart</button>
              <button className="neo-button">Wishlist</button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300/80">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">{product.stock}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">Secure checkout</span>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold text-white">Detailed ingredients</h2>
              <span className="metric-chip">Nutrition</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-300/80">{product.ingredients}</p>
          </div>

          <div className="glass-panel rounded-[34px] p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold text-white">Customer reviews</h2>
              <span className="text-sm text-slate-400">Live sentiment cards</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                "My cat took to it immediately and the page makes the options much easier to compare.",
                "The subscription choice feels clearer, and the product details finally feel premium.",
              ].map((review) => (
                <motion.article
                  key={review}
                  whileHover={{ y: -5 }}
                  className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5"
                >
                  <div className="text-amber-300">★★★★★</div>
                  <p className="mt-4 text-sm leading-7 text-slate-300/80">{review}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
