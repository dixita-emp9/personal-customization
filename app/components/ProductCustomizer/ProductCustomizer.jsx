import { useEffect, useState, lazy, Suspense } from 'react';
import useCustomizerStore from '../../store/useCustomizerStore';

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
    return (
        <div className="flex flex-col lg:flex-row w-full min-h-screen bg-white">
            {/* Left Panel - Canvas */}
            <div className="w-full lg:w-[60%] bg-gray-50 h-[60vh] lg:h-screen sticky top-0 flex items-center justify-center border-r border-gray-200 relative overflow-hidden">
                <Suspense fallback={<div className="w-full h-full bg-gray-50 animate-pulse" />}>
                    <CustomizerCanvas />
                </Suspense>

                {/* Pink Instructional Banner */}
                <div className="absolute top-4 left-0 right-0 mx-auto w-max px-6 py-2 bg-pink-100 text-pink-600 rounded-full text-sm font-medium z-10 shadow-sm">
                    Drag items to customize your product
                </div>
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

        // Get the image URL from the variant, fallback to product featured image
        const initialImage = initialVariant?.image?.url || product.featuredImage?.url;

        if (product) {
            setBaseProduct({
                id: product.id,
                title: product.title,
                handle: product.handle,
                image: initialImage,
                price: parseFloat(initialVariant?.price?.amount || 0),
                variantId: initialVariant?.id
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
