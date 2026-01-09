import React, { useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import { X } from 'lucide-react';
import useCustomizerStore from '../../store/useCustomizerStore';

const URLImage = ({ image, nodeRef, onChange, ...props }) => {
    const [img] = useImage(image.src || image, 'anonymous');

    // Enforce size logic & Centering
    useEffect(() => {
        if (img && nodeRef?.current) {
            const node = nodeRef.current;
            const isRestrictedType = props.type === 'letter' || props.type === 'patch';
            const isVinyl = props.type === 'vinyl';

            // 1. Center the anchor point
            node.offsetX(img.width / 2);
            node.offsetY(img.height / 2);

            // 2. Initial Scaling Logic
            if (node.scaleX() === 1 && img.width > 0) {
                let scale = 1;

                if (isRestrictedType) {
                    // 100px fixed size for letters/patches
                    const maxDim = 100;
                    scale = maxDim / Math.max(img.width, img.height);
                } else if (isVinyl) {
                    // Reasonable size for Vinyl (e.g., max 200px or 1/3 of stage)
                    // This prevents huge uploads from covering the screen or being off-canvas
                    const maxDim = 200;
                    if (img.width > maxDim || img.height > maxDim) {
                        scale = maxDim / Math.max(img.width, img.height);
                    }
                }

                if (scale !== 1) {
                    node.scaleX(scale);
                    node.scaleY(scale);

                    // Sync back to store
                    if (onChange) {
                        onChange({
                            scaleX: scale,
                            scaleY: scale,
                        });
                    }
                }
            }
        }
    }, [img, props.type]);

    return <KonvaImage image={img} ref={nodeRef} {...props} />;
};

const CanvasObject = ({ obj, onSelect, onChange, zones, toggleAutoAlign }) => {
    const shapeRef = useRef();

    const dragBoundFunc = (pos) => {
        // Enforce strict zone containment
        const cx = pos.x;
        const cy = pos.y;

        // Find closest zone
        let closestZone = zones[0];
        let minDist = Infinity;

        zones.forEach(zone => {
            const zcx = zone.x + zone.width / 2;
            const zcy = zone.y + zone.height / 2;
            const dist = Math.hypot(cx - zcx, cy - zcy);
            if (dist < minDist) {
                minDist = dist;
                closestZone = zone;
            }
        });

        // Restrict to zone
        const constrainedX = Math.max(closestZone.x, Math.min(closestZone.x + closestZone.width, cx));
        const constrainedY = Math.max(closestZone.y, Math.min(closestZone.y + closestZone.height, cy));

        return { x: constrainedX, y: constrainedY };
    };

    const commonProps = {
        onClick: onSelect,
        onTap: onSelect,
        ...obj,
        id: obj.id,
        draggable: true,
        dragBoundFunc,
        onDragStart: () => {
            // AUTO-DISABLE TOGGLE ON INTERACTION
            toggleAutoAlign(false);
        },
        onDragEnd: (e) => {
            onChange({
                x: e.target.x(),
                y: e.target.y(),
            });
        },
        onTransformEnd: (e) => {
            toggleAutoAlign(false); // Also disable on resize/rotate
            const node = shapeRef.current;
            onChange({
                x: node.x(),
                y: node.y(),
                scaleX: node.scaleX(),
                scaleY: node.scaleY(),
                rotation: node.rotation(),
            });
        },
    };

    // ... (Remainder of render logic is similar, just ensuring props are passed)
    return (
        <React.Fragment>
            {obj.type === 'embroidery' ? (
                <Text
                    ref={shapeRef}
                    {...commonProps}
                    text={obj.text}
                    fontFamily={obj.fontFamily}
                    fontSize={obj.fontSize || 30}
                    fill={obj.color}
                    offsetX={shapeRef.current ? shapeRef.current.width() / 2 : 0}
                    offsetY={shapeRef.current ? shapeRef.current.height() / 2 : 0}
                />
            ) : (
                <URLImage
                    {...commonProps}
                    nodeRef={shapeRef}
                    image={obj.image}
                    onChange={onChange}
                />
            )}
        </React.Fragment>
    );
};

export function CustomizerCanvas() {
    const {
        baseProduct,
        canvasObjects,
        selectedObjectId,
        selectObject,
        updateObject,
        setCanvasObjects, // New Batch Update
        addObject,
        removeObject,
        clearCanvas,
        width,
        height,
        showDesignAids,
        autoAlign,
        toggleAutoAlign,
        alignmentMode
    } = useCustomizerStore();

    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const [baseImage] = useImage(baseProduct?.image || '', 'anonymous');

    // ... (Zones Logic skipped for brevity in replacement, but included in full)
    // Calculate Base Image Dimensions with consistent scaling across variants
    const bgImageProps = useMemo(() => {
        if (!baseImage) return { image: null };

        const scale = baseProduct?.globalScale || 1.0;

        // Current image dimensions scaled proportionally by the global safe scale
        const newWidth = baseImage.width * scale;
        const newHeight = baseImage.height * scale;

        return {
            image: baseImage,
            width: newWidth,
            height: newHeight,
            x: (width - newWidth) / 2,
            y: (height - newHeight) / 2,
        };
    }, [baseImage, width, height, baseProduct?.globalScale]);

    // Zones reflect realistic usable surface of the product
    const zones = useMemo(() => {
        if (!bgImageProps.width || !baseProduct) return [];
        const title = (baseProduct?.title || '').toLowerCase();
        let zoneList = [];

        // Surface reference from calculated product image
        const surfW = bgImageProps.width;
        const surfH = bgImageProps.height;
        const surfX = bgImageProps.x;
        const surfY = bgImageProps.y;

        // Define zones strictly within the surface (e.g., center 70% width, 25% height region)
        const zoneW = surfW * 0.6;
        const zoneH = Math.min(surfH * 0.2, 60);
        const zoneX = surfX + (surfW - zoneW) / 2;

        if (title.includes('small')) {
            zoneList = [
                { id: 'z1', x: zoneX, y: surfY + surfH * 0.45 - zoneH / 2, width: zoneW, height: zoneH, label: 'Standard Placement' }
            ];
        } else if (title.includes('medium')) {
            zoneList = [
                { id: 'z1', x: zoneX, y: surfY + surfH * 0.45 - zoneH / 2, width: zoneW, height: zoneH, label: 'Upper' },
                { id: 'z2', x: zoneX, y: surfY + surfH * 0.65 - zoneH / 2, width: zoneW, height: zoneH, label: 'Lower' }
            ];
        } else {
            zoneList = [
                { id: 'z1', x: zoneX, y: surfY + surfH * 0.43 - zoneH / 2, width: zoneW, height: zoneH, label: 'Top' },
                { id: 'z2', x: zoneX, y: surfY + surfH * 0.57 - zoneH / 2, width: zoneW, height: zoneH, label: 'Middle' },
                { id: 'z3', x: zoneX, y: surfY + surfH * 0.71 - zoneH / 2, width: zoneW, height: zoneH, label: 'Bottom' }
            ];
        }
        return zoneList;
    }, [bgImageProps, baseProduct]);


    // --- GLOBAL ALIGNMENT & DISTRIBUTION LOGIC ---
    useEffect(() => {
        if (!autoAlign || canvasObjects.length === 0) return;

        // Group items that are only letters or patches by Closest Zone
        const relevantObjects = canvasObjects.filter(obj => obj.type === 'letter' || obj.type === 'patch');
        if (relevantObjects.length === 0) return;

        const objectsByZone = {};
        zones.forEach(z => objectsByZone[z.id] = []);

        relevantObjects.forEach(obj => {
            // Find closest zone
            let closest = zones[0];
            let minDist = Infinity;
            zones.forEach(z => {
                const zcx = z.x + z.width / 2;
                const zcy = z.y + z.height / 2;
                const dist = Math.hypot(obj.x - zcx, obj.y - zcy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = z;
                }
            });
            objectsByZone[closest.id].push(obj);
        });

        // Distribute within each zone
        let newObjects = [];
        const [vMode, hMode] = alignmentMode.split('_');

        Object.keys(objectsByZone).forEach(zoneId => {
            const zoneObjs = objectsByZone[zoneId];
            if (zoneObjs.length === 0) return;

            const zone = zones.find(z => z.id === zoneId);
            zoneObjs.sort((a, b) => a.x - b.x);

            let targetY = zone.y + zone.height / 2;
            if (vMode === 'top') targetY = zone.y + zone.height * 0.25;
            if (vMode === 'bottom') targetY = zone.y + zone.height * 0.75;

            const padding = 20;
            const slotWidth = 60;
            const totalWidth = zoneObjs.length * slotWidth + (zoneObjs.length - 1) * padding;

            let startX = zone.x + 50;
            if (hMode === 'center') {
                startX = zone.x + (zone.width - totalWidth) / 2 + (slotWidth / 2);
            } else if (hMode === 'right') {
                startX = zone.x + zone.width - totalWidth - 50 + (slotWidth / 2);
            } else {
                startX = zone.x + 50 + (slotWidth / 2);
            }

            zoneObjs.forEach((obj, i) => {
                const newX = startX + i * (slotWidth + padding);
                newObjects.push({
                    ...obj,
                    x: newX,
                    y: targetY,
                    rotation: 0
                });
            });
        });

        const hasChanged = newObjects.some(n => {
            const old = canvasObjects.find(o => o.id === n.id);
            return Math.abs(old.x - n.x) > 1 || Math.abs(old.y - n.y) > 1;
        });

        if (hasChanged) {
            setCanvasObjects(newObjects);
        }
    }, [autoAlign, alignmentMode, canvasObjects.length, zones, canvasObjects]);

    useEffect(() => {
        if (selectedObjectId) {
            const selectedNode = stageRef.current.findOne('#' + selectedObjectId);
            if (selectedNode && transformerRef.current) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer()?.batchDraw();
            } else {
                transformerRef.current?.nodes([]);
            }
        } else {
            transformerRef.current?.nodes([]);
            transformerRef.current?.getLayer()?.batchDraw();
        }
    }, [selectedObjectId, canvasObjects]);

    const checkDeselect = (e) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        const clickedOnBase = e.target.hasName('base-image');
        if (clickedOnEmpty || clickedOnBase) selectObject(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        stageRef.current.setPointersPositions(e);
        const itemData = e.dataTransfer.getData('application/json');
        if (!itemData) return;
        const item = JSON.parse(itemData);
        const stage = stageRef.current;
        const pointerPosition = stage.getPointerPosition();

        addObject({
            ...item,
            id: `${item.type}-${Date.now()}`,
            x: pointerPosition.x,
            y: pointerPosition.y,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
        });
    };

    const handleDeleteSelected = () => {
        if (selectedObjectId) {
            transformerRef.current.nodes([]);
            removeObject(selectedObjectId);
        }
    };

    const handleDownload = () => {
        if (stageRef.current) {
            selectObject(null);
            setTimeout(() => {
                const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
                const link = document.createElement('a');
                link.download = `custom-design-${Date.now()}.png`;
                link.href = uri;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 50);
        }
    };

    const selectedObj = canvasObjects.find(o => o.id === selectedObjectId);
    const isRestrictedType = selectedObj?.type === 'letter' || selectedObj?.type === 'patch';

    return (
        <React.Fragment>
            {/* Action Buttons - Positioned relative to the gray panel container */}
            <div className="absolute top-4 right-4 z-30 flex gap-2">
                <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200 shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> DOWNLOAD
                </button>
                <button onClick={() => clearCanvas()} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200 shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> CLEAR ALL
                </button>
            </div>

            {selectedObjectId && (
                <button onClick={handleDeleteSelected} className="absolute top-16 right-4 z-30 bg-white p-2 rounded-full text-red-500 shadow-md hover:bg-red-50 transition-all border border-gray-200" style={{ top: '4rem' }}>
                    <X size={20} />
                </button>
            )}

            {/* Canvas Container - Background is transparent to stand out against parent gray */}
            <div className="relative group" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>

                <Stage width={width} height={height} onMouseDown={checkDeselect} onTouchStart={checkDeselect} ref={stageRef}>
                    <Layer>
                        {baseImage && <KonvaImage name="base-image" {...bgImageProps} />}

                        {showDesignAids && zones.map((zone) => (
                            <Rect key={zone.id} x={zone.x} y={zone.y} width={zone.width} height={zone.height} stroke="red" strokeWidth={2} fill="rgba(255, 0, 0, 0.1)" dash={[5, 5]} />
                        ))}

                        {canvasObjects.map((obj) => (
                            <CanvasObject
                                key={obj.id}
                                obj={obj}
                                onSelect={() => selectObject(obj.id)}
                                onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
                                zones={zones}
                                toggleAutoAlign={toggleAutoAlign}
                            />
                        ))}

                        <Transformer
                            ref={transformerRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                if (isRestrictedType) {
                                    if (newBox.width > 100 || newBox.height > 100) return oldBox;
                                }
                                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                                return newBox;
                            }}
                            enabledAnchors={isRestrictedType ? [] : ['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                            rotateEnabled={true}
                        />
                    </Layer>
                </Stage>
            </div>
        </React.Fragment>
    );
}
