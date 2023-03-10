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
import { Action, Bounds, CenterAction, Point, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
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
    BoundsAware,
    TYPES
} from 'sprotty';

import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { CheatSheetKeyShortcutProvider, SetCheatSheetKeyShortcutAction } from '../cheat-sheet/cheat-sheet';
import { KeyboardManagerService } from '../keyboard/manager/keyboard-manager-service';

/**
 * Zoom viewport when its focused and arrow keys are hit.
 */
@injectable()
export class ZoomTool implements GLSPTool {
    static ID = 'glsp.zoom-keyboard';

    isEditTool = true;

    protected zoomKeyListener: ZoomKeyListener = new ZoomKeyListener(this);

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(KeyboardManagerService) readonly keyboardManager: KeyboardManagerService;
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher: GLSPActionDispatcher;

    get id(): string {
        return ZoomTool.ID;
    }

    enable(): void {
        this.keytool.register(this.zoomKeyListener);
        this.zoomKeyListener.registerShortcutKey();
    }

    disable(): void {
        this.keytool.deregister(this.zoomKeyListener);
    }
}

@injectable()
export class ZoomKeyListener extends KeyListener implements CheatSheetKeyShortcutProvider {
    protected readonly accessToken = Symbol('ZoomKeyListener');
    protected defaultZoomInFactor = 1.1;
    protected defaultZoomOutFactor = 0.9;
    constructor(protected readonly tool: ZoomTool) {
        super();
    }
    registerShortcutKey(): void {
        this.tool.actionDispatcher.onceModelInitialized().then(() => {
            this.tool.actionDispatcher.dispatchAll([
                SetCheatSheetKeyShortcutAction.create(Symbol('zoom-in'), [
                    { shortcuts: ['+'], description: 'Zoom in to element or viewport', group: 'Zoom', position: 0 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('zoom-out'), [
                    { shortcuts: ['-'], description: 'Zoom out to element or viewport', group: 'Zoom', position: 1 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('zoom-reset'), [
                    { shortcuts: ['CTRL', '0'], description: 'Reset zoom to default', group: 'Zoom', position: 2 }
                ])
            ]);
        });
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        const result: Action[] = [];

        if (this.tool.keyboardManager.access(this.accessToken)) {
            const viewport = findParentByFeature(element, isViewport);
            const selectedElements = Array.from(
                element.root.index
                    .all()
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
            } else if (matchesKeystroke(event, 'Digit0', 'ctrl')) {
                return [CenterAction.create(selectedElements.map(e => e.id))];
            }
        }

        return result;
    }

    protected executeZoomWorkflow(
        selectedElements: (SModelElement & BoundsAware)[],
        viewport: SModelElement & SModelRoot & Viewport,
        zoomFactor: number
    ): Action {
        // Zoom to element
        if (selectedElements.length > 0) {
            const center = this.getCenter(selectedElements, viewport);
            return this.setNewZoomFactor(viewport, zoomFactor, center);
        } else {
            // Zoom to viewport
            return this.setNewZoomFactor(viewport, zoomFactor);
        }
    }
    protected getCenter(selectedElements: (SModelElement & BoundsAware)[], viewport: SModelElement & SModelRoot & Viewport): Point {
        // Get bounds of elements based on the viewport
        const allBounds = selectedElements.map(e => this.boundsInViewport(e, e.bounds, viewport));
        const mergedBounds = allBounds.reduce((b0, b1) => Bounds.combine(b0, b1));
        return Bounds.center(mergedBounds);
    }

    // copy from center-fit.ts, translates the children bounds to the viewport bounds
    protected boundsInViewport(element: SModelElement, bounds: Bounds, viewport: SModelElement & SModelRoot & Viewport): Bounds {
        if (element instanceof SChildElement && element.parent !== viewport) {
            return this.boundsInViewport(element.parent, element.parent.localToParent(bounds) as Bounds, viewport);
        } else {
            return bounds;
        }
    }
    protected setNewZoomFactor(viewport: SModelElement & SModelRoot & Viewport, zoomFactor: number, point?: Point): SetViewportAction {
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

        return SetViewportAction.create(viewport.id, newViewport, { animate: true });
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
