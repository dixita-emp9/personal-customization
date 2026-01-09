import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import useCustomizerStore from '../../../store/useCustomizerStore';

export function VinylPanel() {
    const { baseProduct, vinylState, setVinylImage } = useCustomizerStore();

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setVinylImage({ image: reader.result, filename: file.name });
            };
            reader.readAsDataURL(file);
        }
    }, [setVinylImage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.svg']
        },
        maxFiles: 1
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {baseProduct?.cricutText && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 leading-relaxed italic">
                    {baseProduct.cricutText}
                </div>
            )}


            {!vinylState.image ? (
                <div
                    {...getRootProps()}
                    className={`
              border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all
              ${isDragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400 hover:bg-gray-50'}
            `}
                >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Upload className="text-gray-500" size={24} />
                    </div>
                    <p className="font-medium text-gray-700">Click to upload or drag & drop</p>
                    <p className="text-sm text-gray-400 mt-1">SVG, PNG, JPG (Max 5MB)</p>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white p-2">
                    <button
                        onClick={() => setVinylImage(null)}
                        className="absolute top-3 right-3 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-red-500 z-10"
                    >
                        <X size={16} />
                    </button>
                    <div className="aspect-video relative bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={vinylState.image} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-center text-sm text-green-600 font-medium mt-2 flex items-center justify-center gap-1">
                        ✓ Image Uploaded
                    </p>
                </div>
            )}

            <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Vinyl Transfer Cost:</span>
                    <span className="font-medium text-gray-900">AED 60.00</span>
                </div>
            </div>
        </div>
    );
}
