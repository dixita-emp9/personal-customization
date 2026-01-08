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
                    // 50px constraint for letters/patches
                    const maxDim = 50;
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
    const zones = useMemo(() => {
        const title = (baseProduct?.title || '').toLowerCase();
        let zoneList = [];
        const zoneW = width * 0.8;
        const zoneH = 80;
        const zoneX = (width - zoneW) / 2;

        if (title.includes('small')) {
            zoneList = [{ id: 'z1', x: zoneX, y: height / 2 - zoneH / 2, width: zoneW, height: zoneH, label: 'Standard Placement' }];
        } else if (title.includes('medium')) {
            zoneList = [
                { id: 'z1', x: zoneX, y: height * 0.35, width: zoneW, height: zoneH, label: 'Upper Placement' },
                { id: 'z2', x: zoneX, y: height * 0.65 - zoneH, width: zoneW, height: zoneH, label: 'Lower Placement' }
            ];
        } else {
            zoneList = [
                { id: 'z1', x: zoneX, y: height * 0.25, width: zoneW, height: zoneH, label: 'Top' },
                { id: 'z2', x: zoneX, y: height * 0.5 - zoneH / 2, width: zoneW, height: zoneH, label: 'Middle' },
                { id: 'z3', x: zoneX, y: height * 0.75 - zoneH, width: zoneW, height: zoneH, label: 'Bottom' }
            ];
        }
        return zoneList;
    }, [baseProduct, width, height]);


    // --- GLOBAL ALIGNMENT & DISTRIBUTION LOGIC ---
    useEffect(() => {
        if (!autoAlign || canvasObjects.length === 0) return;

        // Group objects by Closest Zone
        const objectsByZone = {};
        zones.forEach(z => objectsByZone[z.id] = []);

        canvasObjects.forEach(obj => {
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
        const [vMode, hMode] = alignmentMode.split('_'); // top_left, middle_center, bottom_right

        Object.keys(objectsByZone).forEach(zoneId => {
            const zoneObjs = objectsByZone[zoneId];
            if (zoneObjs.length === 0) return;

            const zone = zones.find(z => z.id === zoneId);

            // Sort by current X to preserve order (Left to Right)
            zoneObjs.sort((a, b) => a.x - b.x);

            // Calculate Target Y
            let targetY = zone.y + zone.height / 2; // Default Middle
            if (vMode === 'top') targetY = zone.y + zone.height * 0.25;
            if (vMode === 'bottom') targetY = zone.y + zone.height * 0.75;

            // Calculate Target X Layout
            const padding = 20; // Increased spacing to prevent overlap
            // We need width of items. 
            // Approximation: letters/patches ~50px scaled.
            // Embroidery width is variable.
            // Since we don't have bounding boxes here easily without querying Node,
            // we will use a Fixed Spacing strategy or assume 60px/80px spacing?
            // "Tidy" implies even spacing. Let's assume an average slot width of 60px.
            const slotWidth = 60;
            const totalWidth = zoneObjs.length * slotWidth + (zoneObjs.length - 1) * padding;

            let startX = zone.x + 50; // Default Left

            if (hMode === 'center') {
                startX = zone.x + (zone.width - totalWidth) / 2 + (slotWidth / 2);
            } else if (hMode === 'right') {
                startX = zone.x + zone.width - totalWidth - 50 + (slotWidth / 2);
            } else {
                // Left
                startX = zone.x + 50 + (slotWidth / 2);
            }

            // Assign Position
            zoneObjs.forEach((obj, i) => {
                const newX = startX + i * (slotWidth + padding);

                newObjects.push({
                    ...obj,
                    x: newX,
                    y: targetY,
                    rotation: 0 // Tidy also resets rotation? Usually yes.
                });
            });
        });

        // Check if anything actually changed to avoid loop
        const hasChanged = newObjects.some(n => {
            const old = canvasObjects.find(o => o.id === n.id);
            return Math.abs(old.x - n.x) > 1 || Math.abs(old.y - n.y) > 1;
        });

        if (hasChanged) {
            setCanvasObjects(newObjects);
        }

    }, [autoAlign, alignmentMode, canvasObjects.length, zones, canvasObjects]); // Dependency on canvasObjects is risky if we update checking equality, but needed for new adds.


    // ... (Selection, Drop, Delete, Download handlers - largely unchanged)
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

        // Note: New object triggers Effect -> Auto Align will grab it if ON.
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

    // Calculate Base Image Dimensions to Fit & Center
    let bgImageProps = { image: baseImage };
    if (baseImage) {
        const imgRatio = baseImage.width / baseImage.height;
        const stageRatio = width / height;
        let newWidth, newHeight;

        // Contain logic
        if (stageRatio > imgRatio) {
            newHeight = height;
            newWidth = baseImage.width * (height / baseImage.height);
        } else {
            newWidth = width;
            newHeight = baseImage.height * (width / baseImage.width);
        }

        bgImageProps = {
            ...bgImageProps,
            width: newWidth,
            height: newHeight,
            x: (width - newWidth) / 2,
            y: (height - newHeight) / 2,
        };
    }

    const selectedObj = canvasObjects.find(o => o.id === selectedObjectId);
    const isRestrictedType = selectedObj?.type === 'letter' || selectedObj?.type === 'patch';

    return (
        <div className="shadow-lg border border-gray-200 bg-white relative group" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> DOWNLOAD
                </button>
                <button onClick={() => { if (confirm('Clear canvas?')) clearCanvas(); }} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition-colors border border-gray-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg> CLEAR ALL
                </button>
            </div>

            {selectedObjectId && (
                <button onClick={handleDeleteSelected} className="absolute top-16 right-4 z-10 bg-white p-2 rounded-full text-red-500 shadow-md hover:bg-red-50 transition-all border border-gray-200" style={{ top: '4rem' }}>
                    <X size={20} />
                </button>
            )}

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
                        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    />
                </Layer>
            </Stage>
        </div>
    );
}
