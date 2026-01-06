import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useCustomizerStore from '../../store/useCustomizerStore';
import { AddToCartButton } from '~/components/AddToCartButton';
import { clsx } from 'clsx';
// Import Panels (will create these next)
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
        showDesignAids, toggleDesignAids,
        autoAlign, toggleAutoAlign,
        alignmentMode, setAlignmentMode
    } = useCustomizerStore();
    const [isOpen, setIsOpen] = useState(true);

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

    // Calculate Total Price
    const customizationTotal = canvasObjects.reduce((acc, obj) => {
        let price = obj.price;
        // Fallback for vinyl if price isn't stamped on object
        if (obj.type === 'vinyl' && (price === undefined || price === null)) {
            price = vinylState?.price || 60.00;
        }
        return acc + (parseFloat(price) || 0);
    }, 0);

    const totalPrice = (baseProduct?.price || 0) + customizationTotal;

    return (
        <div className="flex flex-col h-full">
            {/* Product Info Header */}
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{baseProduct?.title || 'Product'}</h1>
                <p className="text-gray-500 mb-4">Customize your unique product below.</p>

                {/* Dropdown Selector for Mode */}
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg hover:border-pink-50 transition-colors"
                    >
                        <span className="font-medium text-gray-700">
                            {OPTIONS.find(o => o.id === mode)?.label}
                        </span>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                            {OPTIONS.map((opt) => (
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

            {/* Toggles & Customization Controls */}
            <div className="p-6 bg-white border-t border-gray-100 space-y-4">
                {/* Auto Tidy Toggle */}
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

                        {/* Alignment Dropdown - Only visible if Auto Tidy is ON */}
                        {autoAlign && (
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
                        )}
                    </div>
                </div>

                {/* Show Design Aids Toggle */}
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

            {/* Footer / Cart Actions */}
            <div className="p-6 bg-white border-t border-gray-200 mt-auto">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-xl font-bold text-gray-900">
                        AED {totalPrice.toFixed(2)}
                    </span>
                </div>

                <div className="flex gap-3">
                    <button
                        className="flex-1 py-3 px-6 border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => window.history.back()}
                    >
                        Back
                    </button>

                    <div className="flex-[2]">
                        <AddToCartButton
                            lines={[
                                // 1. Base Product Line
                                {
                                    merchandiseId: baseProduct?.variantId,
                                    quantity: 1,
                                    attributes: [
                                        // Metadata references
                                        { key: 'Total_Items', value: `${canvasObjects.length}` },
                                        { key: 'Customization_Ref', value: `Ref-${Date.now()}` },
                                        // Informational only - real products added below
                                        ...(isEmbroideryEnabled ? [{ key: 'Includes_Embroidery', value: 'Yes' }] : []),
                                        ...(vinylState.image ? [{ key: 'Includes_Vinyl', value: 'Yes' }] : [])
                                    ]
                                },
                                // 2. Embroidery Product Line (Dynamic)
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
                                // 3. Cricut/Vinyl Product Line (Dynamic)
                                ...(vinylState.image && cricutProduct?.selectedOrFirstAvailableVariant?.id ? [
                                    {
                                        merchandiseId: cricutProduct.selectedOrFirstAvailableVariant.id,
                                        quantity: 1,
                                        attributes: [
                                            { key: 'Filename', value: vinylState.filename || 'Uploaded Image' },
                                            // Ideally we'd pass the image URL if uploaded, but for now we rely on filename/session
                                            // In a real app, we might upload to Shopify or external storage first.
                                            { key: 'Parent_Ref', value: `Ref-${Date.now()}` }
                                        ]
                                    }
                                ] : []),
                                // 4. Letters & Patches Lines
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
                            disabled={!baseProduct}
                        >
                            <div className="w-full h-full flex items-center justify-center bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200 uppercase text-sm tracking-wide cursor-pointer py-3">
                                Add to Bag
                            </div>
                        </AddToCartButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
