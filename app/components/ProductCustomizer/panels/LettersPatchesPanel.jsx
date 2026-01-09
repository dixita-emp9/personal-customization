import { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import useCustomizerStore from '../../../store/useCustomizerStore';

export function LettersPatchesPanel({ lettersCollection, patchesCollection }) {
    const {
        baseProduct,
        autoAlign, toggleAutoAlign,
        alignmentMode, setAlignmentMode,
        showDesignAids, toggleDesignAids
    } = useCustomizerStore();

    const [activeTab, setActiveTab] = useState('letters'); // 'letters' | 'patches'
    const [selectedProduct, setSelectedProduct] = useState(null); // The selected product (e.g., Letter A)
    const [globalColorFilter, setGlobalColorFilter] = useState(null); // 'Red', 'Blue', etc.

    // Helper to extract products from collection data
    const getProducts = (collection) => {
        return collection?.products?.nodes || [];
    };

    const activeProducts = useMemo(() => {
        return activeTab === 'letters'
            ? getProducts(lettersCollection)
            : getProducts(patchesCollection);
    }, [activeTab, lettersCollection, patchesCollection]);

    const handleDragStart = (e, variant, product) => {
        const data = {
            type: activeTab === 'letters' ? 'letter' : 'patch',
            id: variant.id,
            variantId: variant.id, // Explicitly store variantId
            productId: product.id,
            productTitle: product.title,
            variantTitle: variant.title,
            image: variant.image?.url,
            price: parseFloat(variant.price?.amount || 0),
            color: variant.selectedOptions?.find(opt => opt.name === 'Color')?.value,
        };

        e.dataTransfer.setData('application/json', JSON.stringify(data));
        e.dataTransfer.effectAllowed = 'copy';
    };

    // Level 1: Grid of all products (e.g. A, B, C...)
    const renderProductGrid = () => (
        <div className="grid grid-cols-6 gap-2">
            {activeProducts.map((product) => {
                // Find variant matching global filter, or default to first
                const variantToShow = globalColorFilter
                    ? product.variants.nodes.find(v => v.title.includes(globalColorFilter) || v.selectedOptions.some(o => o.value === globalColorFilter))
                    : product.variants.nodes[0];

                // Skip if no variant found (shouldn't happen usually, but good safety)
                if (!variantToShow) return null;

                return (
                    <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="flex flex-col items-center gap-1 transition-all group p-1"
                    >
                        <div className="aspect-square w-full flex items-center justify-center overflow-hidden">
                            {variantToShow?.image && (
                                <img
                                    src={variantToShow.image.url}
                                    alt={product.title}
                                    className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                                />
                            )}
                        </div>
                        <span className="text-[10px] text-gray-600 truncate w-full text-center">
                            {product.title}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    // Level 2: Product Detail + Variants + "See others in this color"
    const renderProductDetail = () => {
        if (!selectedProduct) return null;

        return (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <button
                    onClick={() => setSelectedProduct(null)}
                    className="flex items-center text-sm text-gray-500 hover:text-pink-600 mb-4 transition-colors"
                >
                    <ChevronLeft size={16} /> Back to Selection
                </button>

                <div className="mb-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{selectedProduct.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">Select a color/variant:</p>

                    <div className="grid grid-cols-6 gap-2 mb-6">
                        {selectedProduct.variants.nodes.map((variant) => (
                            <div
                                key={variant.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, variant, selectedProduct)}
                                onClick={() => {
                                    // Extract color from options if possible, fallback to title parsing if needed
                                    const colorOption = variant.selectedOptions.find(o => o.name === 'Color')?.value;
                                    if (colorOption) setGlobalColorFilter(colorOption);
                                }}
                                className={clsx(
                                    "aspect-square flex flex-col items-center justify-center bg-white border rounded-lg cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                                    (globalColorFilter && variant.title.includes(globalColorFilter))
                                        ? "border-pink-500 ring-2 ring-pink-100"
                                        : "border-gray-200 hover:border-pink-300"
                                )}
                            >
                                {variant.image && (
                                    <img src={variant.image.url} alt={variant.title} className="w-full h-full object-contain p-1" />
                                )}
                                <span className="text-[8px] text-gray-500 pb-0.5 px-0.5 truncate w-full text-center">{variant.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {globalColorFilter && (
                    <div className="pt-6 border-t border-gray-100">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm">
                            Other {activeTab} in "{globalColorFilter}"
                        </h4>
                        <div className="grid grid-cols-6 gap-2">
                            {activeProducts
                                .filter(p => p.id !== selectedProduct.id) // Exclude current
                                .map(product => {
                                    const matchingVariant = product.variants.nodes.find(v =>
                                        v.selectedOptions.some(o => o.name === 'Color' && o.value === globalColorFilter) ||
                                        v.title.includes(globalColorFilter)
                                    );

                                    if (!matchingVariant) return null;

                                    return (
                                        <div
                                            key={product.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, matchingVariant, product)}
                                            className="aspect-square bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-pink-500 hover:shadow-md transition-all flex items-center justify-center"
                                            title={product.title}
                                        >
                                            <img src={matchingVariant.image?.url} alt={product.title} className="w-full h-full object-contain p-1" />
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}

                <p className="mt-4 text-xs text-gray-400 text-center">
                    Drag items onto the canvas
                </p>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
            {/* {baseProduct?.lettersAndPatchesText && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed italic">
                    {baseProduct.lettersAndPatchesText}
                </div>
            )} */}
            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                <button
                    onClick={() => { setActiveTab('letters'); setSelectedProduct(null); }}
                    className={clsx(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === 'letters' ? "bg-white text-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    LETTERS
                </button>
                <button
                    onClick={() => { setActiveTab('patches'); setSelectedProduct(null); }}
                    className={clsx(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === 'patches' ? "bg-white text-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    PATCHES
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {selectedProduct ? renderProductDetail() : renderProductGrid()}
            </div>

            {/* Toggles - Visible only in Letters & Patches tab */}
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoAlign}
                                    onChange={(e) => toggleAutoAlign(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                            </div>
                            <span>Automatically tidy and align</span>
                        </label>

                        {autoAlign && (
                            <div className="flex gap-2">
                                <select
                                    value={alignmentMode}
                                    onChange={(e) => setAlignmentMode(e.target.value)}
                                    className="text-sm border-b border-gray-300 focus:border-pink-500 outline-none py-1 bg-transparent text-pink-600 font-medium cursor-pointer"
                                >
                                    <option value="top_left">top left</option>
                                    <option value="top_center">top center</option>
                                    <option value="top_right">top right</option>
                                    <option value="middle_left">middle left</option>
                                    <option value="middle_center">middle center</option>
                                    <option value="middle_right">middle right</option>
                                    <option value="bottom_left">bottom left</option>
                                    <option value="bottom_center">bottom center</option>
                                    <option value="bottom_right">bottom right</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showDesignAids}
                            onChange={(e) => toggleDesignAids(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </div>
                    <span>Show design aids</span>
                </label>
            </div>
        </div>
    );
}
