import React, { useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva';
import useImage from 'use-image';
import { X } from 'lucide-react';
import useCustomizerStore from '../../store/useCustomizerStore';

const URLImage = ({ image, nodeRef, onChange, ...props }) => {
    const [img] = useImage(image.src || image);

    // Enforce 50x50 initial size logic & Centering
    useEffect(() => {
        if (img && nodeRef?.current) {
            const node = nodeRef.current;
            const isRestrictedType = props.type === 'letter' || props.type === 'patch';

            // 1. Center the anchor point
            node.offsetX(img.width / 2);
            node.offsetY(img.height / 2);

            // 2. Enforce initial 50px constraint if new addition (scaleX === 1)
            // Or if we want to strictly enforce it always on load?
            // "Cannot exceed 50x50" - ensures it starts there.
            if (isRestrictedType && node.scaleX() === 1 && img.width > 0) {
                const maxDim = 50;
                // Calculate scale to fit strictly within 50x50
                const scale = maxDim / Math.max(img.width, img.height);

                node.scaleX(scale);
                node.scaleY(scale);

                // Important: sync back to store so it persists
                if (onChange) {
                    onChange({
                        scaleX: scale,
                        scaleY: scale,
                        // Update position to account for offset if needed?
                        // No, (x,y) is anchor position. If we set offset, (x,y) is the visual center.
                        // We might need to ensure the visual position doesn't jump if we just added it.
                        // If we just dropped it, x/y is pointer pos. Setting offset centers it on pointer. This is desired.
                    });
                }
            }
        }
    }, [img, props.type]);

    return <KonvaImage image={img} ref={nodeRef} {...props} />;
};

const CanvasObject = ({ obj, onSelect, onChange, stageWidth, stageHeight, zones, autoAlign, alignmentMode }) => {
    const shapeRef = useRef();

    const dragBoundFunc = (pos) => {
        // 1. Find the closest zone to the object
        // Use current mouse pos (pos) as the center approximation since we centered offsets
        const cx = pos.x;
        const cy = pos.y;

        // Simple distance check to center of zones
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

        if (!closestZone) return pos;

        // 2. If Auto Align is ON, snap to specific point in that zone
        if (autoAlign) {
            let tx = closestZone.x + closestZone.width / 2;
            let ty = closestZone.y + closestZone.height / 2;

            // Adjust based on alignmentMode
            // Mode format: 'vertical_horizontal' e.g. 'top_left', 'middle_center'
            const [v, h] = alignmentMode.split('_');

            // Horizontal
            if (h === 'left') tx = closestZone.x + 50; // padding
            else if (h === 'right') tx = closestZone.x + closestZone.width - 50;
            // else center (already set)

            // Vertical
            if (v === 'top') ty = closestZone.y + closestZone.height * 0.25; // slightly down from top edge? or just top padding?
            else if (v === 'bottom') ty = closestZone.y + closestZone.height * 0.75;
            // else middle (already set)

            return { x: tx, y: ty };
        }

        // 3. If Auto Align OFF, restrict to bounds of the zone
        // Object size approximation (bounding box would be better but expensive here)
        // Assume ~50px radius or use obj data if passed (obj width is not easily known here without node)
        // Let's use strict point containment for the center (x,y)

        const constrainedX = Math.max(closestZone.x, Math.min(closestZone.x + closestZone.width, cx));
        const constrainedY = Math.max(closestZone.y, Math.min(closestZone.y + closestZone.height, cy));

        return { x: constrainedX, y: constrainedY };
    };

    const commonProps = {
        onClick: onSelect,
        onTap: onSelect,
        ...obj,
        id: obj.id, // CRITICAL: This allows stage.findOne('#id') to work
        draggable: true,
        dragBoundFunc, // Apply constraint
        onDragEnd: (e) => {
            onChange({
                x: e.target.x(),
                y: e.target.y(),
            });
        },
        onTransformEnd: (e) => {
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
                    // For text, centering is different. offsetX/Y depends on width/height which changes.
                    // Konva Text handles this better with align='center', but rotation anchor is top-left by default.
                    // For simpler implementation, let's leave embroidery centering for now unless requested,
                    // prompt specifically mentioned "letters and patches" for 50x50.
                    // "fix spacing and alignment on the main product canvas" is general.
                    // Let's try to center embroidery too if possible.
                    offsetX={shapeRef.current ? shapeRef.current.width() / 2 : 0}
                    offsetY={shapeRef.current ? shapeRef.current.height() / 2 : 0}
                />
            ) : (
                <URLImage
                    {...commonProps}
                    nodeRef={shapeRef}
                    image={obj.image}
                    onChange={onChange} // Pass it down
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
        addObject,
        removeObject,
        clearCanvas,
        width,
        height,
        // New State
        showDesignAids,
        autoAlign,
        alignmentMode
    } = useCustomizerStore();

    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const [baseImage] = useImage(baseProduct?.image || '');

    // Calculate Zones based on Product Title
    // Assumptions based on prompt:
    // Small -> 1 zone
    // Medium -> 2 zones
    // Large -> 3 zones
    const zones = useMemo(() => {
        const title = (baseProduct?.title || '').toLowerCase();
        let zoneList = [];

        // Define zone dimensions (fixed width strip, varying Y)
        const zoneW = width * 0.8; // 80% width
        const zoneH = 80; // height of the strip
        const zoneX = (width - zoneW) / 2; // Center horizontal

        if (title.includes('small')) {
            // 1 Zone (Center)
            zoneList = [
                { id: 'z1', x: zoneX, y: height / 2 - zoneH / 2, width: zoneW, height: zoneH, label: 'Standard Placement' }
            ];
        } else if (title.includes('medium')) {
            // 2 Zones
            zoneList = [
                { id: 'z1', x: zoneX, y: height * 0.35, width: zoneW, height: zoneH, label: 'Upper Placement' },
                { id: 'z2', x: zoneX, y: height * 0.65 - zoneH, width: zoneW, height: zoneH, label: 'Lower Placement' }
            ];
        } else {
            // Large/Default: 3 Zones
            zoneList = [
                { id: 'z1', x: zoneX, y: height * 0.25, width: zoneW, height: zoneH, label: 'Top' },
                { id: 'z2', x: zoneX, y: height * 0.5 - zoneH / 2, width: zoneW, height: zoneH, label: 'Middle' },
                { id: 'z3', x: zoneX, y: height * 0.75 - zoneH, width: zoneW, height: zoneH, label: 'Bottom' }
            ];
        }
        return zoneList;
    }, [baseProduct, width, height]);


    // Handle Selection & Transformer Attachment
    useEffect(() => {
        if (selectedObjectId) {
            const selectedNode = stageRef.current.findOne('#' + selectedObjectId);

            if (selectedNode && transformerRef.current) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer().batchDraw();
            } else {
                transformerRef.current?.nodes([]);
            }
        } else {
            transformerRef.current?.nodes([]);
            transformerRef.current?.getLayer().batchDraw();
        }
    }, [selectedObjectId, canvasObjects]);

    const checkDeselect = (e) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        const clickedOnBase = e.target.hasName('base-image');

        if (clickedOnEmpty || clickedOnBase) {
            selectObject(null);
        }
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
            // Deselect everything before screenshot
            selectObject(null);

            // Wait a tick for transformer to disappear
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

    // Get selected object to determine transformer rules
    const selectedObj = canvasObjects.find(o => o.id === selectedObjectId);
    const isRestrictedType = selectedObj?.type === 'letter' || selectedObj?.type === 'patch';

    return (
        <div
            className="shadow-lg border border-gray-200 bg-white relative group"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Top Right Controls: Download & Clear */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200"
                    title="Download Design"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    DOWNLOAD
                </button>
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to clear the canvas?')) {
                            clearCanvas();
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200"
                    title="Clear All"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    CLEAR ALL
                </button>
            </div>

            {/* Delete Button Overlay */}
            {selectedObjectId && (
                <button
                    onClick={handleDeleteSelected}
                    className="absolute top-16 right-4 z-10 bg-white p-2 rounded-full text-red-500 shadow-md hover:bg-red-50 transition-all border border-gray-200"
                    title="Remove Selected Item"
                    style={{ top: '4rem' }} // Push down to avoid overlap with new buttons
                >
                    <X size={20} />
                </button>
            )}

            <Stage
                width={width}
                height={height}
                onMouseDown={checkDeselect}
                onTouchStart={checkDeselect}
                ref={stageRef}
            >
                <Layer>
                    {/* Base Product Image */}
                    {baseImage && (
                        <KonvaImage
                            name="base-image"
                            image={baseImage}
                            width={width}
                            height={height}
                            fit="contain"
                        />
                    )}

                    {/* Zones (Show if toggled) */}
                    {showDesignAids && zones.map((zone) => (
                        <Rect
                            key={zone.id}
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            stroke="red"
                            strokeWidth={2}
                            fill="rgba(255, 0, 0, 0.1)"
                            dash={[5, 5]}
                        />
                    ))}

                    {/* Canvas Objects */}
                    {canvasObjects.map((obj) => (
                        <CanvasObject
                            key={obj.id}
                            obj={obj}
                            onSelect={() => selectObject(obj.id)}
                            onChange={(newAttrs) => updateObject(obj.id, newAttrs)}
                            stageWidth={width}
                            stageHeight={height}
                            // Pass Zone Props
                            zones={zones}
                            autoAlign={autoAlign}
                            alignmentMode={alignmentMode}
                        />
                    ))}

                    {/* Global Transformer */}
                    <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                            if (isRestrictedType) {
                                // STRICT 50px LIMIT (User changed to 100 manually, keeping 100)
                                if (newBox.width > 100 || newBox.height > 100) {
                                    return oldBox;
                                }
                            }

                            // Check valid bounds
                            if (newBox.width < 5 || newBox.height < 5) {
                                return oldBox;
                            }
                            return newBox;
                        }}
                        enabledAnchors={isRestrictedType
                            ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] // Corner only for aspect ratio?
                            : ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                        }
                    />
                </Layer>
            </Stage>
        </div>
    );
}
