/********************************************************************************
 * Copyright (c) 2019-2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { Action, Bounds, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import {
    KeyListener,
    KeyTool,
    SModelElement,
    findParentByFeature,
    isViewport,
    isSelectable,
    isBoundsAware,
    SModelRoot,
    SChildElement
} from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';

/**
 * Zoom viewport when its focused and arrow keys are hit.
 */
@injectable()
export class ZoomTool implements GLSPTool {
    static ID = 'glsp.zoom-keyboard';

    isEditTool = true;

    protected zoomKeyListener: ZoomKeyListener = new ZoomKeyListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;

    get id(): string {
        return ZoomTool.ID;
    }

    enable(): void {
        this.keytool.register(this.zoomKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.zoomKeyListener);
    }
}

@injectable()
export class ZoomKeyListener extends KeyListener {
    defaultZoomInFactor = 1.1;
    defaultZoomOutFactor = 0.9;
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        const result: Action[] = [];
        const viewport = findParentByFeature(element, isViewport);
        const selectedElements = Array.from(
            element.root.index
                .all()
                .filter(e => isSelectable(e) && e.selected)
                .filter(e => e.id !== e.root.id)
                .map(e => e)
        );

        if (!viewport) {
            return [];
        }
        if (matchesKeystroke(event, 'Minus')) {
            const action = this.executeZoomWorkflow(selectedElements, viewport, this.defaultZoomOutFactor);
            if (action) {
                result.push(action);
            }
        } else if (event.key === '+') {
            const action = this.executeZoomWorkflow(selectedElements, viewport, this.defaultZoomInFactor);
            if (action) {
                result.push(action);
            }
        }
        return result;
    }

    executeZoomWorkflow(
        selectedElements: SModelElement[],
        viewport: SModelElement & SModelRoot & Viewport,
        zoomFactor: number
    ): Action | undefined {
        if (selectedElements.length > 1) {
            const elementsAsSet = new Set(selectedElements);
            // if element is child, only consider parents bounds
            for (const currElem of selectedElements) {
                if (this.isChildOfSelected(selectedElements, currElem)) {
                    elementsAsSet.delete(currElem);
                }
            }

            const avgBounds: Bounds = this.getCenter(Array.from(elementsAsSet));
            const viewportAction = this.setNewZoomFactor(viewport, zoomFactor, avgBounds, avgBounds.x, avgBounds.y);
            if (viewportAction) {
                return viewportAction;
            }
        }
        if (selectedElements.length === 1) {
            const bounds = isBoundsAware(selectedElements[0]) ? selectedElements[0].bounds : { width: 0, height: 0, x: 0, y: 0 };
            const viewportAction = this.setNewZoomFactor(viewport, zoomFactor, bounds, bounds.x, bounds.y);
            if (viewportAction) {
                return viewportAction;
            }
        } else {
            const viewportAction = this.setNewZoomFactor(viewport, zoomFactor, undefined, undefined, undefined);
            if (viewportAction) {
                return viewportAction;
            }
        }
        return;
    }

    getCenter(selectedElements: SModelElement[]): Bounds {
        const allBounds: Bounds[] = [];

        selectedElements.forEach(currentElement => {
            allBounds.push(isBoundsAware(currentElement) ? currentElement.bounds : { width: 0, height: 0, x: 0, y: 0 });
        });

        const totalWidth = allBounds.reduce((sum, currentBound) => sum + currentBound.width, 0);
        const totalHeight = allBounds.reduce((sum, currentBound) => sum + currentBound.height, 0);
        const totalX = allBounds.reduce((sum, currentBound) => sum + currentBound.x, 0);
        const totalY = allBounds.reduce((sum, currentBound) => sum + currentBound.y, 0);

        return {
            width: totalWidth / allBounds.length,
            height: totalHeight / allBounds.length,
            x: totalX / allBounds.length,
            y: totalY / allBounds.length
        };
    }
    setNewZoomFactor(
        viewport: SModelElement & SModelRoot & Viewport,
        zoomFactor: number,
        bounds: Bounds | undefined,
        x: number | undefined,
        y: number | undefined
    ): SetViewportAction | undefined {
        let newViewport: Viewport;
        const newZoom = viewport.zoom * zoomFactor;
        if (viewport) {
            if (x && y && bounds) {
                const c = Bounds.center(bounds);
                newViewport = {
                    scroll: {
                        x: c.x - (0.5 * viewport.canvasBounds.width) / newZoom,
                        y: c.y - (0.5 * viewport.canvasBounds.height) / newZoom
                    },
                    zoom: newZoom
                };
            } else {
                newViewport = {
                    scroll: {
                        x: x === undefined ? viewport.scroll.x : x,
                        y: y === undefined ? viewport.scroll.y : y
                    },
                    zoom: newZoom
                };
            }

            return SetViewportAction.create(viewport.id, newViewport, { animate: false });
        }
        return;
    }
    protected isChildOfSelected(selectedElements: SModelElement[], element: SModelElement): boolean {
        const elementsAsSet = new Set(selectedElements);
        while (element instanceof SChildElement) {
            element = element.parent;
            if (elementsAsSet.has(element)) {
                return true;
            }
        }
        return false;
    }

    protected returnParentOfChild(selectedElements: Set<SModelElement>, element: SModelElement): SModelElement | undefined {
        while (element instanceof SChildElement) {
            element = element.parent;
            if (selectedElements.has(element)) {
                return element;
            }
        }
        return undefined;
    }
}
