import { useState } from 'react';
import useCustomizerStore from '../../../store/useCustomizerStore';
import { clsx } from 'clsx';

export function ColorOptionPanel({ product, variants }) {
    const { baseProduct, setBaseProduct } = useCustomizerStore();

    // Flatten variants to finding unique colors or just list them all
    // Assuming variants have 'Color' option
    const colorOption = product?.options?.find(opt => opt.name === 'Color');

    // This is a simplified logic. In reality we need to map values to variants.
    // We'll trust proper data is passed or we extract from variants.

    const handleVariantChange = (variant) => {
        const metafieldImg = variant?.personaliser_preview_image?.reference?.image?.url;
        const imageUrl = metafieldImg || variant.image?.url;

        // Update the base product in store
        setBaseProduct({
            ...baseProduct,
            image: imageUrl,
            price: parseFloat(variant.price?.amount || 0),
            variantId: variant.id, // Consistent with ProductCustomizer
            selectedColor: variant.selectedOptions.find(o => o.name === 'Color')?.value
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Product Color</h3>
                <div className="grid grid-cols-4 gap-4">
                    {product?.variants?.nodes?.map((variant) => {
                        const colorValue = variant.selectedOptions.find(o => o.name === 'Color')?.value || variant.title;

                        // Check if this variant is selected using ID
                        const isSelected = baseProduct?.variantId === variant.id;

                        // Priority: metafield image, fallback to variant image
                        const previewImg = variant.personaliser_preview_image?.reference?.image?.url || variant.image?.url;

                        return (
                            <button
                                key={variant.id}
                                onClick={() => handleVariantChange(variant)}
                                className={clsx(
                                    "flex flex-col items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 transition-all",
                                    isSelected ? "border-pink-500 ring-1 ring-pink-500 bg-pink-50" : "border-gray-200"
                                )}
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shadow-sm relative">
                                    <img src={previewImg} alt={colorValue} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs text-center font-medium text-gray-700 truncate w-full">
                                    {colorValue}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
