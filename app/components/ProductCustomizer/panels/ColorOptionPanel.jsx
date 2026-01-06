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
        // Update the base product in store
        setBaseProduct({
            ...baseProduct,
            id: product.id,
            image: variant.image?.url,
            price: parseFloat(variant.price?.amount || 0),
            selectedVariantId: variant.id,
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
                        const isSelected = baseProduct?.image === variant.image?.url;

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
                                    {/* If we had color codes we'd use bg color, else image */}
                                    <img src={variant.image?.url} alt={colorValue} className="w-full h-full object-cover" />
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
