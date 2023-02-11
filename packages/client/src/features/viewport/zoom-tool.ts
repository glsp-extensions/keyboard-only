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
import { Action, Bounds, Point, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
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
    SChildElement,
    BoundsAware
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
                //  .filter(e => isSelectable(e) && e.selected)
                .filter(e => isSelectable(e) && isBoundsAware(e) && e.selected)
                .filter(e => e.id !== e.root.id)
                .map(e => e) as (SModelElement & BoundsAware)[]
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
        selectedElements: (SModelElement & BoundsAware)[],
        viewport: SModelElement & SModelRoot & Viewport,
        zoomFactor: number
    ): Action {
        // Zoom to element
        if (selectedElements.length > 0) {
            let bounds: (SModelElement & BoundsAware)[] = [];

            if (selectedElements.length === 1) {
                // Zoom based on single bounds
                bounds = Array.from(selectedElements);
            } else {
                // Zoom based on multiple bounds
                const elementsAsSet = new Set(selectedElements) as Set<SModelElement & BoundsAware>;
                // if element is child, only consider parents bounds
                for (const currElem of selectedElements) {
                    if (this.isChildOfSelected(selectedElements, currElem)) {
                        elementsAsSet.delete(currElem);
                    }
                }

                bounds = Array.from(elementsAsSet);
            }

            const center = this.getCenter(bounds);
            return this.setNewZoomFactor(viewport, zoomFactor, center);
        } else {
            // Zoom to viewport
            return this.setNewZoomFactor(viewport, zoomFactor);
        }
    }

    getCenter(selectedElements: (SModelElement & BoundsAware)[]): Point {
        const allBounds = selectedElements.map(e => e.bounds);
        const mergedBounds = allBounds.reduce((b0, b1) => Bounds.combine(b0, b1));
        return Bounds.center(mergedBounds);
    }
    setNewZoomFactor(viewport: SModelElement & SModelRoot & Viewport, zoomFactor: number, point?: Point): SetViewportAction {
        let newViewport: Viewport;
        const newZoom = viewport.zoom * zoomFactor;

        if (point) {
            newViewport = {
                scroll: {
                    x: point.x - (0.5 * viewport.canvasBounds.width) / newZoom,
                    y: point.y - (0.5 * viewport.canvasBounds.height) / newZoom
                },
                zoom: newZoom
            };
        } else {
            newViewport = {
                scroll: viewport.scroll,
                zoom: newZoom
            };
        }

        return SetViewportAction.create(viewport.id, newViewport, { animate: false });
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
