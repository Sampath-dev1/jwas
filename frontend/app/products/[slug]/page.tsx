'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, ShoppingBag, ShieldCheck, Check, Truck, AlertCircle } from 'lucide-react';
import { apiRequest, getAuthToken, resolveImageUrl } from '@/lib/api';
import { Product, ProductVariant } from '@/types';

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    apiRequest<Product>(`/products/${slug}`)
      .then((data) => {
        setProduct(data);
        if (data.images && data.images.length > 0) {
          const main = data.images.find((img) => img.is_main) || data.images[0];
          setSelectedImage(main.image_url);
        }
        if (data.variants && data.variants.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
        // Fetch reviews
        if (data.id) {
          apiRequest(`/products/${data.id}/reviews`)
            .then((r) => setReviews(r || []))
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Failed to load product:', err);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs uppercase tracking-widest text-neutral-400">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold uppercase text-neutral-900">Product Not Found</h1>
        <p className="text-xs text-neutral-500 mt-2">This piece is currently unavailable or has been archived.</p>
      </div>
    );
  }

  const currentPrice = selectedVariant?.selling_price !== undefined && selectedVariant?.selling_price !== null
    ? selectedVariant.selling_price
    : product.selling_price;

  const originalPrice = selectedVariant?.original_price || product.original_price;
  const availableStock = selectedVariant ? selectedVariant.available_stock : 0;
  const isOutOfStock = availableStock <= 0;

  const handleAddToCart = async (redirect: boolean = false) => {
    if (!selectedVariant) {
      setErrorMsg('Please select a variant.');
      return;
    }
    if (isOutOfStock) {
      setErrorMsg('This variant is currently out of stock.');
      return;
    }

    setAddingToCart(true);
    setFeedback(null);
    setErrorMsg(null);

    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          quantity: quantity,
        }),
      });

      if (redirect) {
        router.push('/checkout');
      } else {
        setFeedback(`Added ${quantity} item(s) to your shopping bag.`);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add item to bag.');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Images Gallery */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-100 rounded-sm">
            {selectedImage ? (
              <img
                src={resolveImageUrl(selectedImage)}
                alt={product.name}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600';
                }}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs tracking-widest text-neutral-400 uppercase">
                JWAS Studio
              </div>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`relative w-20 aspect-square overflow-hidden rounded-sm border-2 transition ${
                    selectedImage === img.image_url ? 'border-black' : 'border-neutral-900'
                  }`}
                >
                  <img
                    src={resolveImageUrl(img.image_url)}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=600';
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Purchase Form */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              SKU: {selectedVariant ? selectedVariant.sku : product.sku}
            </span>
            <h1 className="text-3xl font-bold uppercase tracking-tight text-neutral-900 mt-1">
              {product.name}
            </h1>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-neutral-900">
              ₹{Number(currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {originalPrice && Number(originalPrice) > Number(currentPrice) && (
              <span className="text-base text-neutral-400 line-through">
                ₹{Number(originalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
            {originalPrice && Number(originalPrice) > Number(currentPrice) && (
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                {Math.round(((Number(originalPrice) - Number(currentPrice)) / Number(originalPrice)) * 100)}% OFF
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-neutral-600 leading-relaxed font-light">
              {product.description}
            </p>
          )}

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-900 block">
                Select Option / Size
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const label = Object.values(v.attributes).join(' / ') || v.sku;
                  const isSelected = selectedVariant?.id === v.id;
                  const variantOutOfStock = v.available_stock <= 0;

                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border rounded transition ${
                        isSelected
                          ? 'border-black bg-black text-white active:bg-neutral-950 active:text-white'
                          : variantOutOfStock
                          ? 'border-neutral-200 text-neutral-400 line-through bg-neutral-50'
                          : 'border-neutral-300 text-neutral-900 hover:border-black hover:bg-neutral-50 active:bg-neutral-200 active:text-black'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Availability Indicator */}
          <div className="pt-2">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" /> Currently Unavailable (Out of Stock)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 uppercase tracking-wider">
                <Check className="w-4 h-4" /> In Stock — {availableStock} unit(s) available
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Quantity
              </label>
              <div className="flex items-center border border-neutral-300 rounded">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 text-sm font-bold hover:bg-neutral-100"
                >
                  -
                </button>
                <span className="px-4 py-1 text-xs font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-3 py-1 text-sm font-bold hover:bg-neutral-100"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {feedback && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded">
              {feedback}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 text-xs rounded">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => handleAddToCart(false)}
              disabled={isOutOfStock || addingToCart}
              className="flex-1 bg-black text-white active:text-white py-3.5 px-6 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 active:bg-neutral-950 disabled:bg-neutral-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-white" /> {addingToCart ? 'Adding...' : 'Add to Bag'}
            </button>
            <button
              onClick={() => handleAddToCart(true)}
              disabled={isOutOfStock || addingToCart}
              className="flex-1 border-2 border-black text-black active:text-white py-3.5 px-6 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white active:bg-neutral-950 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed transition"
            >
              Buy Now
            </button>
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="border-t border-neutral-200 pt-6 mt-8 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Specifications & Craft
              </h3>
              <dl className="grid grid-cols-2 gap-y-2 text-xs">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt className="text-neutral-500 uppercase tracking-wider">{key}</dt>
                    <dd className="text-neutral-900 font-medium">{String(value)}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}

          {/* Genuine Reviews */}
          <div className="border-t border-neutral-200 pt-6 mt-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
              Customer Reviews ({reviews.length})
            </h3>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-neutral-100 pb-3 text-xs">
                    <div className="flex justify-between font-semibold text-neutral-800">
                      <span>{r.customer_name}</span>
                      <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-neutral-600 mt-1">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">No customer reviews recorded for this product yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs tracking-widest uppercase">Loading product...</div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
