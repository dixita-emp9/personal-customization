import { useEffect, useState, lazy, Suspense } from 'react';
import useCustomizerStore from '../../store/useCustomizerStore';
import { Info } from 'lucide-react';

// Lazy load components to avoid SSR issues with libraries like Konva and react-dropzone
const CustomizerCanvas = lazy(() => import('./CustomizerCanvas.client').then(m => ({ default: m.CustomizerCanvas })));
const ControlsPanel = lazy(() => import('./ControlsPanel').then(m => ({ default: m.ControlsPanel })));

// Local ClientOnly implementation since 'remix-utils' might not be available
function ClientOnly({ children, fallback = null }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return mounted ? children() : fallback;
}

function ProductCustomizerClient({ product, variants, lettersCollection, patchesCollection, embroideryProduct, cricutProduct }) {
    const { mode } = useCustomizerStore();

    const getGuidelines = () => {
        switch (mode) {
            case 'letters_patches':
                return product.guidelines?.value;
            case 'embroidery':
                return product.guidelines_embroidery?.value;
            case 'vinyl':
                return product.guidelines_cricut?.value;
            default:
                return null;
        }
    };

    const guidelines = getGuidelines();

    return (
        <div className="flex flex-col lg:flex-row w-full min-h-screen bg-white">
            {/* Left Panel - Canvas */}
            <div className="w-full lg:w-[60%] bg-gray-50 h-[60vh] lg:h-screen sticky top-0 flex items-center justify-center border-r border-gray-200 relative overflow-hidden">
                <Suspense fallback={<div className="w-full h-full bg-gray-50 animate-pulse" />}>
                    <CustomizerCanvas />
                </Suspense>

                {/* Pink Instructional Banner / Guidelines */}
                {guidelines ? (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg p-4 bg-pink-50 border border-pink-100 rounded-2xl flex gap-3 shadow-sm z-20">
                        <div className="flex-shrink-0">
                            <Info size={20} className="text-pink-500" />
                        </div>
                        <div className="text-sm text-pink-700 leading-relaxed whitespace-pre-line">
                            {guidelines}
                        </div>
                    </div>
                ) : (
                    <div className="absolute top-4 left-0 right-0 mx-auto w-max px-6 py-2 bg-pink-100 text-pink-600 rounded-full text-sm font-medium z-10 shadow-sm">
                        Drag items to customize your product
                    </div>
                )}
            </div>

            {/* Right Panel - Controls */}
            <div className="w-full lg:w-[40%] bg-white h-auto lg:h-screen overflow-y-auto">
                <Suspense fallback={<div className="p-6">Loading controls...</div>}>
                    <ControlsPanel
                        product={product}
                        variants={variants}
                        lettersCollection={lettersCollection}
                        patchesCollection={patchesCollection}
                        embroideryProduct={embroideryProduct}
                        cricutProduct={cricutProduct}
                    />
                </Suspense>
            </div>
        </div>
    );
}

export function ProductCustomizer({ product, variants, selectedVariant, lettersCollection, patchesCollection, embroideryProduct, cricutProduct }) {
    const { setBaseProduct } = useCustomizerStore();

    useEffect(() => {
        // Determine which variant to use: passed selectedVariant, or first available
        const initialVariant = selectedVariant || product.selectedOrFirstAvailableVariant || product.variants.nodes[0];

        // Helper to get image info prioritizing the metafield
        const getVariantImage = (v) => {
            const metafieldImg = v?.personaliser_preview_image?.reference?.image;
            if (metafieldImg) {
                return {
                    url: metafieldImg.url,
                    width: metafieldImg.width,
                    height: metafieldImg.height
                };
            }
            return {
                url: v?.image?.url,
                width: v?.image?.width || 0,
                height: v?.image?.height || 0
            };
        };

        const initialVariantInfo = getVariantImage(initialVariant);
        const initialImage = initialVariantInfo.url || product.featuredImage?.url;

        if (product) {
            // Find the global scale that fits EVERY variant in 600x600 without cropping
            const CANVAS_SIZE = 600;
            let globalScale = 1;

            const allVariants = product.variants?.nodes || [];

            // Collect all possible fit scales
            const fitScales = allVariants.map(v => {
                const imgInfo = getVariantImage(v);
                if (!imgInfo.width || !imgInfo.height) return 1;
                // Scale needed to fit this specific image in 600x600
                return Math.min(CANVAS_SIZE / imgInfo.width, CANVAS_SIZE / imgInfo.height);
            });

            if (fitScales.length > 0) {
                // Ensure no upscaling (cap at 1.0) and pick the min to fit ALL
                globalScale = Math.min(1.0, ...fitScales);
            }

            setBaseProduct({
                id: product.id,
                title: product.title,
                handle: product.handle,
                image: initialImage,
                price: parseFloat(initialVariant?.price?.amount || 0),
                variantId: initialVariant?.id,
                globalScale, // Store the calculated safe scale

                // Validation Rules from Metafields
                maxCharacters: parseInt(product.max_characters?.value || '30', 10),
                maxLines: parseInt(product.lines?.value || '1', 10),
                maxItemsPerLine: parseInt(product.small_combo?.value || '4', 10),
                lettersAndPatchesText: product.letters_and_patches?.value || '',
                cricutText: product.cricut?.value || '',

                // Enable/Disable flags
                isLPEnabled: product.letters_and_patches?.value && product.letters_and_patches?.value !== 'false',
                isCricutEnabled: product.cricut?.value && product.cricut?.value !== 'false'
            });
        }
    }, [product, selectedVariant, setBaseProduct]);

    return (
        <ClientOnly fallback={<div className="w-full min-h-screen bg-gray-50 animate-pulse" />}>
            {() => (
                <ProductCustomizerClient
                    product={product}
                    variants={variants}
                    lettersCollection={lettersCollection}
                    patchesCollection={patchesCollection}
                    embroideryProduct={embroideryProduct}
                    cricutProduct={cricutProduct}
                />
            )}
        </ClientOnly>
    );
}
