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
import { Action, ChangeBoundsOperation, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { KeyListener, KeyTool, SModelElement, findParentByFeature, isViewport, isSelectable, isBoundsAware, SModelRoot } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../../base/tool-manager/glsp-tool-manager';

/**
 * Moves viewport when its focused and arrow keys are hit.
 */
@injectable()
export class MovementTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;

    protected movementKeyListener: MoveKeyListener = new MoveKeyListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;

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
    offSetViewport = 50;
    offSetElement = 10;
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        const result: Action[] = [];
        const selectedElements = Array.from(
            element.root.index
                .all()
                .filter(e => isSelectable(e) && e.selected)
                .filter(e => e.id !== e.root.id)
                .map(e => e)
        );
        const viewport = findParentByFeature(element, isViewport);
        if (!viewport) {
            return [];
        }
        const move = (deltaX: number, deltaY: number): void => {
            if (selectedElements.length !== 0) {
                selectedElements.forEach(currentElement => {
                    result.push(this.moveElement(currentElement, deltaX, deltaY));
                    const newPosition = this.getBounds(currentElement, deltaX, deltaY);
                    const viewportAction = this.adaptViewport(viewport, newPosition.x, newPosition.y);
                    if (viewportAction) {
                        result.push(viewportAction);
                    }
                });
            } else {
                result.push(this.moveViewport(viewport, deltaX, deltaY)!);
            }
        };

        if (matchesKeystroke(event, 'ArrowUp')) {
            move(0, -this.offSetViewport);
        } else if (matchesKeystroke(event, 'ArrowDown')) {
            move(0, this.offSetViewport);
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            move(this.offSetViewport, 0);
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            move(-this.offSetViewport, 0);
        }

        return result;
    }

    getBounds(element: SModelElement, offSetX: number, offSetY: number): { x: number; y: number } {
        const bounds = isBoundsAware(element) ? element.bounds : { width: 0, height: 0, x: 0, y: 0 };
        return { x: bounds.x + offSetX, y: bounds.y + offSetY };
    }

    moveViewport(viewport: SModelElement & SModelRoot & Viewport, offsetX: number, offSetY: number): SetViewportAction | undefined {
        if (viewport) {
            const newViewport: Viewport = {
                scroll: {
                    x: viewport.scroll.x + offsetX,
                    y: viewport.scroll.y + offSetY
                },
                zoom: viewport.zoom
            };

            return SetViewportAction.create(viewport.id, newViewport, { animate: false });
        }
        return;
    }

    adaptViewport(viewport: SModelElement & SModelRoot & Viewport, newX: number, newY: number): SetViewportAction | undefined {
        if (!viewport || !viewport.canvasBounds) {
            return;
        }

        if (newX < 0) {
            console.log('Element is out of bounds from the left');
            return this.moveViewport(viewport, -this.offSetViewport, 0);
        } else if (newX > viewport.canvasBounds.width) {
            console.log('Element is out of bounds from the right');
            return this.moveViewport(viewport, this.offSetViewport, 0);
        } else if (newY < 0) {
            console.log('Element is out of bounds from the top');
            return this.moveViewport(viewport, 0, -this.offSetViewport);
        } else if (newY > viewport.canvasBounds.height) {
            console.log('Element is out of bounds from the bottom');
            return this.moveViewport(viewport, 0, this.offSetViewport);
        }
        console.log('Element is within bounds');
        return;
    }

    moveElement(element: SModelElement, offSetX: number, offSetY: number): ChangeBoundsOperation {
        const bounds = isBoundsAware(element) ? element.bounds : { width: 0, height: 0, x: 0, y: 0 };

        return ChangeBoundsOperation.create([
            {
                elementId: element.id,
                newSize: {
                    width: bounds.width,
                    height: bounds.height
                },
                newPosition: {
                    x: bounds.x + offSetX,
                    y: bounds.y + offSetY
                }
            }
        ]);
    }
}
