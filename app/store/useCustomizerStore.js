import { create } from 'zustand';

/**
 * @typedef {Object} CustomizationBaseProduct
 * @property {string} id
 * @property {string} title
 * @property {string} handle
 * @property {string} image
 * @property {number} price
 */

/**
 * @typedef {Object} CanvasObject
 * @property {string} id
 * @property {'letter' | 'patch' | 'embroidery' | 'vinyl'} type
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {Object} [data] - Specific data for the object (e.g. text, color, image url)
 */

/**
 * @typedef {Object} CustomizerState
 * @property {CustomizationBaseProduct | null} baseProduct
 * @property {'color' | 'letters_patches' | 'embroidery' | 'vinyl'} mode
 * @property {CanvasObject[]} canvasObjects
 * @property {string | null} selectedObjectId
 * @property {Object} embroideryState
 * @property {boolean} isEmbroideryEnabled
 * @property {number} width
 * @property {number} height
 * 
 * @property {(product: CustomizationBaseProduct) => void} setBaseProduct
 * @property {(mode: 'color' | 'letters_patches' | 'embroidery' | 'vinyl') => void} setMode
 * @property {(object: CanvasObject) => void} addObject
 * @property {(id: string, updates: Partial<CanvasObject>) => void} updateObject
 * @property {(id: string) => void} removeObject
 * @property {(id: string | null) => void} selectObject
 * @property {(updates: Partial<CustomizerState['embroideryState']>) => void} updateEmbroideryState
 */

const useCustomizerStore = create((set, get) => ({
    baseProduct: null,
    mode: 'color', // Default mode
    canvasObjects: [],
    selectedObjectId: null,

    // Canvas dimensions - default to a reasonable size, can be updated on mount
    width: 600,
    height: 600,

    // Specific state for the single-instance features
    embroideryState: {
        text: '',
        fontFamily: 'Lucida',
        color: 'Black',
        price: 80.00,
    },
    isEmbroideryEnabled: false,

    vinylState: {
        image: null,
        price: 60.00
    },

    setBaseProduct: (product) => set({ baseProduct: product }),

    setMode: (mode) => set({ mode, selectedObjectId: null }),

    addObject: (object) => set((state) => ({
        canvasObjects: [...state.canvasObjects, object],
        selectedObjectId: object.id
    })),

    setCanvasObjects: (objects) => set({ canvasObjects: objects }),

    updateObject: (id, updates) => set((state) => ({
        canvasObjects: state.canvasObjects.map((obj) =>
            obj.id === id ? { ...obj, ...updates } : obj
        )
    })),

    removeObject: (id) => set((state) => ({
        canvasObjects: state.canvasObjects.filter((obj) => obj.id !== id),
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId
    })),

    selectObject: (id) => set({ selectedObjectId: id }),

    // Embroidery Actions
    enableEmbroidery: () => {
        const state = get();
        if (!state.isEmbroideryEnabled) {
            // Add initial embroidery object to canvas if not present
            const id = 'embroidery-main';
            const newObject = {
                id,
                type: 'embroidery',
                x: state.width / 2,
                y: state.height / 2,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                ...state.embroideryState
            };
            set({
                isEmbroideryEnabled: true,
                canvasObjects: [...state.canvasObjects, newObject],
                selectedObjectId: id
            });
        }
    },

    updateEmbroideryState: (updates) => {
        set((state) => {
            const newState = { ...state.embroideryState, ...updates };
            // Also update the canvas object if it exists
            const updatedObjects = state.canvasObjects.map(obj =>
                obj.type === 'embroidery' ? { ...obj, ...newState } : obj
            );

            return {
                embroideryState: newState,
                canvasObjects: updatedObjects
            };
        });
    },

    // Vinyl Actions
    setVinylImage: (payload) => {
        set((state) => {
            // payload can be { image, filename } or null
            const image = payload?.image || null;
            const filename = payload?.filename || null;

            // Check if vinyl object exists
            let newObjects = [...state.canvasObjects];
            const existingIndex = newObjects.findIndex(obj => obj.type === 'vinyl');

            if (image) {
                const vinylObj = {
                    type: 'vinyl',
                    id: 'vinyl-main',
                    x: state.width / 2,
                    y: state.height / 2,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    image: image,
                    filename: filename
                };

                if (existingIndex >= 0) {
                    newObjects[existingIndex] = { ...newObjects[existingIndex], image, filename };
                } else {
                    newObjects.push(vinylObj);
                }
            } else {
                // Remove if null
                if (existingIndex >= 0) {
                    newObjects.splice(existingIndex, 1);
                }
            }

            return {
                vinylState: { ...state.vinylState, image, filename },
                canvasObjects: newObjects,
                selectedObjectId: 'vinyl-main'
            };
        });
    },

    clearCanvas: () => set({
        canvasObjects: [],
        selectedObjectId: null,
        isEmbroideryEnabled: false,
        vinylState: { image: null, filename: null, price: 60.00 },
        embroideryState: { text: '', fontFamily: 'Lucida', color: 'Black', price: 80.00 },

        // Design Aids & Alignment State
        showDesignAids: false,
        autoAlign: false,
        alignmentMode: 'middle_center', // default
    }),

    // Design Aids & Alignment State
    showDesignAids: false,
    autoAlign: false,
    alignmentMode: 'middle_center', // default

    toggleDesignAids: (val) => set({ showDesignAids: val }),
    toggleAutoAlign: (val) => set({ autoAlign: val }),
    setAlignmentMode: (mode) => set({ alignmentMode: mode }),

    // Active Zone for Global Tidy
    activeZoneId: 'z1',
    setActiveZoneId: (id) => set({ activeZoneId: id }),
}));

export default useCustomizerStore;
