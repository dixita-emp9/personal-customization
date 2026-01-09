import { useEffect } from 'react';
import useCustomizerStore from '../../../store/useCustomizerStore';
import { clsx } from 'clsx';

// Google Fonts Configuration
const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime&family=Dancing+Script&family=Playfair+Display&family=Roboto:wght@400;700&display=swap";

const FONTS = [
    { name: 'Modern', family: 'Roboto' },
    { name: 'Elegant', family: 'Playfair Display' },
    { name: 'Cursive', family: 'Dancing Script' },
    { name: 'Bold', family: 'Bebas Neue' },
    { name: 'Typewriter', family: 'Courier Prime' },
];

const COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Silver', value: '#C0C0C0' },
    { name: 'Gold', value: '#FFD700' },
    { name: 'Red', value: '#FF0000' },
    { name: 'Blue', value: '#0000FF' },
    { name: 'Pink', value: '#FFC0CB' },
];

export function EmbroideryPanel() {
    const { baseProduct, embroideryState, updateEmbroideryState, enableEmbroidery } = useCustomizerStore();
    const maxChars = baseProduct?.maxCharacters || 30;

    useEffect(() => {
        enableEmbroidery();

        // Dynamically load fonts
        const link = document.createElement('link');
        link.href = GOOGLE_FONTS_URL;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        return () => {
            // Optional: remove on unmount, but usually fine to keep
            // document.head.removeChild(link); 
        };
    }, [enableEmbroidery]);

    const handleChange = (key, value) => {
        updateEmbroideryState({ [key]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">


            {/* Text Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Text
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={embroideryState.text}
                        onChange={(e) => handleChange('text', e.target.value)}
                        maxLength={maxChars}
                        placeholder="Type here..."
                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                    />
                    <span className="absolute right-3 top-3 text-xs text-gray-400">
                        {embroideryState.text.length}/{maxChars}
                    </span>
                </div>
            </div>

            {/* Font Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Font
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {FONTS.map(font => (
                        <button
                            key={font.family}
                            onClick={() => handleChange('fontFamily', font.family)}
                            className={clsx(
                                "py-3 px-4 rounded-lg border text-base transition-all text-center",
                                embroideryState.fontFamily === font.family
                                    ? "border-pink-500 bg-pink-50 text-pink-700 font-medium"
                                    : "border-gray-200 hover:border-pink-300 text-gray-600"
                            )}
                            style={{ fontFamily: font.family }}
                        >
                            {font.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Color Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose Color
                </label>
                <div className="flex flex-wrap gap-3">
                    {COLORS.map(color => (
                        <button
                            key={color.name}
                            onClick={() => handleChange('color', color.name)}
                            title={color.name}
                            className={clsx(
                                "w-10 h-10 rounded-full border-2 transition-transform hover:scale-110",
                                embroideryState.color === color.name
                                    ? "border-pink-500 ring-2 ring-pink-200"
                                    : "border-transparent ring-1 ring-gray-200"
                            )}
                            style={{ backgroundColor: color.value }}
                        />
                    ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">Selected: {embroideryState.color}</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Embroidery Cost:</span>
                    <span className="font-medium text-gray-900">AED 80.00</span>
                </div>
            </div>

        </div>
    );
}
