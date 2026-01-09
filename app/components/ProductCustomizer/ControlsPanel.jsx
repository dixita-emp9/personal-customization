import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useCustomizerStore from '../../store/useCustomizerStore';
import { AddToCartButton } from '~/components/AddToCartButton';
import { clsx } from 'clsx';
// Import Panels
import { LettersPatchesPanel } from './panels/LettersPatchesPanel';
import { EmbroideryPanel } from './panels/EmbroideryPanel';
import { VinylPanel } from './panels/VinylPanel';
import { ColorOptionPanel } from './panels/ColorOptionPanel';

const OPTIONS = [
    { id: 'color', label: 'Pick Personalisation (Color)' },
    { id: 'letters_patches', label: 'Letters & Patches' },
    { id: 'embroidery', label: 'Embroidery' },
    { id: 'vinyl', label: 'Cricut/Vinyl' },
];

export function ControlsPanel({ product, variants, lettersCollection, patchesCollection, embroideryProduct, cricutProduct }) {
    const {
        mode, setMode, baseProduct, canvasObjects, vinylState,
        isEmbroideryEnabled, embroideryState,
    } = useCustomizerStore();
    const [isOpen, setIsOpen] = useState(false);

    const renderActivePanel = () => {
        switch (mode) {
            case 'color':
                return <ColorOptionPanel product={product} variants={variants} />;
            case 'letters_patches':
                return <LettersPatchesPanel lettersCollection={lettersCollection} patchesCollection={patchesCollection} />;
            case 'embroidery':
                return <EmbroideryPanel />;
            case 'vinyl':
                return <VinylPanel />;
            default:
                return null;
        }
    };

    // --- PRICE CALCULATION ---
    const customizationTotal = canvasObjects.reduce((acc, obj) => {
        let price = obj.price;
        if (obj.type === 'vinyl' && (price === undefined || price === null)) {
            price = vinylState?.price || 60.00;
        }
        return acc + (parseFloat(price) || 0);
    }, 0);

    const totalPrice = (baseProduct?.price || 0) + customizationTotal;

    // --- OPTIONS FILTERING ---
    const activeOptions = OPTIONS.filter(opt => {
        if (opt.id === 'letters_patches') return baseProduct?.isLPEnabled !== false;
        if (opt.id === 'vinyl') return baseProduct?.isCricutEnabled !== false;
        return true;
    });

    // --- VALIDATION LOGIC ---
    const maxChars = baseProduct?.maxCharacters || 30;
    const maxLines = baseProduct?.maxLines || 1;
    const maxItemsPerLine = baseProduct?.maxItemsPerLine || 4;

    const isEmbroideryValid = !isEmbroideryEnabled || embroideryState.text.length <= maxChars;

    const lpObjects = canvasObjects.filter(obj => obj.type === 'letter' || obj.type === 'patch');
    const groupedLines = [];
    [...lpObjects].sort((a, b) => a.y - b.y).forEach(obj => {
        let added = false;
        for (let line of groupedLines) {
            if (Math.abs(line[0].y - obj.y) < 30) {
                line.push(obj);
                added = true;
                break;
            }
        }
        if (!added) groupedLines.push([obj]);
    });

    const lineCount = groupedLines.length;
    const maxItemsUsed = groupedLines.length > 0 ? Math.max(...groupedLines.map(l => l.length)) : 0;
    const isLPValid = lineCount <= maxLines && maxItemsUsed <= maxItemsPerLine;

    const isBlocked = !isEmbroideryValid || (lpObjects.length > 0 && !isLPValid);

    return (
        <div className="flex flex-col h-full">
            {/* Product Info Header */}
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{baseProduct?.title || product.title || 'Product'}</h1>

                {mode === 'color' && (
                    <div className="space-y-1 mb-4">
                        {product.material?.value && (
                            <div className="flex gap-2 text-sm text-gray-600">
                                <span className="font-semibold">Material</span>
                                <span>{product.material.value}</span>
                            </div>
                        )}
                        {product.dimensions?.value && (
                            <div className="flex gap-2 text-sm text-gray-600">
                                <span className="font-semibold">Dimensions</span>
                                <span>{product.dimensions.value}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Dropdown Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg hover:border-pink-50 transition-colors"
                    >
                        <span className="font-medium text-gray-700">
                            {activeOptions.find(o => o.id === mode)?.label || 'Select Personalisation'}
                        </span>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                            {activeOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setMode(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 hover:bg-pink-50 transition-colors border-b border-gray-100 last:border-0",
                                        mode === opt.id ? "bg-pink-50 text-pink-600 font-medium" : "text-gray-700"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                {renderActivePanel()}
            </div>

            {/* Footer / Cart Actions */}
            <div className="p-6 bg-white border-t border-gray-200 mt-auto">
                {/* Error Messaging */}
                {!isEmbroideryValid && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium animate-in fade-in slide-in-from-bottom-2">
                        You can have a maximum of {maxChars} embroidery characters.
                    </div>
                )}
                {lpObjects.length > 0 && !isLPValid && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 font-medium animate-in fade-in slide-in-from-bottom-2">
                        You can have a maximum of {maxLines} lines and {maxItemsPerLine} items per line. Make sure all items are aligned.
                    </div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-xl font-bold text-gray-900">
                        AED {totalPrice.toFixed(2)}
                    </span>
                </div>

                <div className="flex gap-3">
                    <button
                        className="flex-1 py-3 px-6 border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                            if (mode !== 'color') {
                                setMode('color');
                                setIsOpen(false);
                            } else {
                                window.history.back();
                            }
                        }}
                    >
                        Back
                    </button>

                    <div className="flex-[2]">
                        <AddToCartButton
                            lines={[
                                {
                                    merchandiseId: baseProduct?.variantId,
                                    quantity: 1,
                                    attributes: [
                                        { key: 'Total_Items', value: `${canvasObjects.length}` },
                                        { key: 'Customization_Ref', value: `Ref-${Date.now()}` },
                                        ...(isEmbroideryEnabled ? [{ key: 'Includes_Embroidery', value: 'Yes' }] : []),
                                        ...(vinylState.image ? [{ key: 'Includes_Vinyl', value: 'Yes' }] : [])
                                    ]
                                },
                                ...(isEmbroideryEnabled && embroideryProduct?.selectedOrFirstAvailableVariant?.id ? [
                                    {
                                        merchandiseId: embroideryProduct.selectedOrFirstAvailableVariant.id,
                                        quantity: 1,
                                        attributes: [
                                            { key: 'Text', value: embroideryState.text || '' },
                                            { key: 'Font', value: embroideryState.fontFamily || '' },
                                            { key: 'Color', value: embroideryState.color || '' },
                                            { key: 'Parent_Ref', value: `Ref-${Date.now()}` }
                                        ]
                                    }
                                ] : []),
                                ...(vinylState.image && cricutProduct?.selectedOrFirstAvailableVariant?.id ? [
                                    {
                                        merchandiseId: cricutProduct.selectedOrFirstAvailableVariant.id,
                                        quantity: 1,
                                        attributes: [
                                            { key: 'Filename', value: vinylState.filename || 'Uploaded Image' },
                                            { key: 'Parent_Ref', value: `Ref-${Date.now()}` }
                                        ]
                                    }
                                ] : []),
                                ...canvasObjects
                                    .filter(obj => (obj.type === 'letter' || obj.type === 'patch') && obj.variantId)
                                    .map(obj => ({
                                        merchandiseId: obj.variantId,
                                        quantity: 1,
                                        attributes: [
                                            { key: 'Placement_X', value: Math.round(obj.x).toString() },
                                            { key: 'Placement_Y', value: Math.round(obj.y).toString() },
                                            { key: 'Rotation', value: Math.round(obj.rotation).toString() },
                                            { key: 'Scale', value: Number(obj.scaleX).toFixed(2) },
                                            { key: 'Parent_Ref', value: `Ref-${Date.now()}` }
                                        ]
                                    }))
                            ]}
                            disabled={!baseProduct || isBlocked}
                            redirectTo="/cart"
                        >
                            <div className={clsx(
                                "w-full h-full flex items-center justify-center rounded-full font-bold transition-colors shadow-lg uppercase text-sm tracking-wide py-3",
                                isBlocked ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-pink-500 text-white hover:bg-pink-600 shadow-pink-200 cursor-pointer"
                            )}>
                                Add to Bag
                            </div>
                        </AddToCartButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
