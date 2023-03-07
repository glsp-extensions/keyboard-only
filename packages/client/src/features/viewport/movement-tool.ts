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
import { Action, ChangeBoundsOperation, Point, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable, optional } from 'inversify';
import {
    KeyListener,
    KeyTool,
    SModelElement,
    findParentByFeature,
    isViewport,
    isSelectable,
    isBoundsAware,
    SModelRoot,
    BoundsAware,
    ISnapper
} from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { TYPES } from '../../base/types';
import { GridSnapper } from '../change-bounds/snap';

/**
 * Moves viewport when its focused and arrow keys are hit.
 */
@injectable()
export class MovementTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;

    protected movementKeyListener: MoveKeyListener = new MoveKeyListener(this);

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(TYPES.ISnapper) @optional() readonly snapper?: ISnapper;
    get id(): string {
        return MovementTool.ID;
    }

    enable(): void {
        this.keytool.register(this.movementKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.movementKeyListener);
    }
}

@injectable()
export class MoveKeyListener extends KeyListener {
    protected grid = { x: 20, y: 20 };

    constructor(protected readonly tool: MovementTool) {
        super();

        if (this.tool.snapper instanceof GridSnapper) {
            this.grid = this.tool.snapper?.grid;
        }
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        const result: Action[] = [];
        const selectedElements = Array.from(
            element.root.index
                .all()
                .filter(e => isSelectable(e) && isBoundsAware(e) && e.selected)
                .filter(e => e.id !== e.root.id)
                .map(e => e) as (SModelElement & BoundsAware)[]
        );
        const viewport = findParentByFeature(element, isViewport);
        if (!viewport) {
            return [];
        }

        if (matchesKeystroke(event, 'ArrowUp')) {
            return this.move(selectedElements, 0, -this.grid.x, viewport);
        } else if (matchesKeystroke(event, 'ArrowDown')) {
            return this.move(selectedElements, 0, this.grid.x, viewport);
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            return this.move(selectedElements, this.grid.x, 0, viewport);
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            return this.move(selectedElements, -this.grid.x, 0, viewport);
        }

        return result;
    }

    protected getBounds(element: SModelElement & BoundsAware, offSetX: number, offSetY: number): Point {
        return { x: element.bounds.x + offSetX, y: element.bounds.y + offSetY };
    }

    protected moveViewport(viewport: SModelElement & SModelRoot & Viewport, offsetX: number, offSetY: number): SetViewportAction {
        const newViewport: Viewport = {
            scroll: {
                x: viewport.scroll.x + offsetX,
                y: viewport.scroll.y + offSetY
            },
            zoom: viewport.zoom
        };

        return SetViewportAction.create(viewport.id, newViewport, { animate: true });
    }

    protected adaptViewport(viewport: SModelElement & SModelRoot & Viewport, newPoint: Point): SetViewportAction | undefined {
        if (newPoint.x < viewport.scroll.x) {
            return this.moveViewport(viewport, -this.grid.x, 0);
        } else if (newPoint.x > viewport.scroll.x + viewport.canvasBounds.width) {
            return this.moveViewport(viewport, this.grid.x, 0);
        } else if (newPoint.y < viewport.scroll.y) {
            return this.moveViewport(viewport, 0, -this.grid.x);
        } else if (newPoint.y > viewport.scroll.y + viewport.canvasBounds.height) {
            return this.moveViewport(viewport, 0, this.grid.x);
        }
        return;
    }

    protected moveElement(element: SModelElement & BoundsAware, offSetX: number, offSetY: number): ChangeBoundsOperation {
        return ChangeBoundsOperation.create([
            {
                elementId: element.id,
                newSize: {
                    width: element.bounds.width,
                    height: element.bounds.height
                },
                newPosition: {
                    x: element.bounds.x + offSetX,
                    y: element.bounds.y + offSetY
                }
            }
        ]);
    }
    protected move(
        selectedElements: (SModelElement & BoundsAware)[],
        deltaX: number,
        deltaY: number,
        viewport: SModelElement & SModelRoot & Viewport
    ): Action[] {
        const results: Action[] = [];

        if (selectedElements.length !== 0) {
            selectedElements.forEach(currentElement => {
                results.push(this.moveElement(currentElement, deltaX, deltaY));
                const newPosition = this.getBounds(currentElement, deltaX, deltaY);
                const viewportAction = this.adaptViewport(viewport, newPosition);
                if (viewportAction) {
                    results.push(viewportAction);
                }
            });
        } else {
            results.push(this.moveViewport(viewport, deltaX, deltaY)!);
        }

        return results;
    }
}
