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
import { Action, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { KeyListener, KeyTool, SModelElement, findParentByFeature, isViewport } from 'sprotty';
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
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'ArrowUp')) {
            const viewport = findParentByFeature(element, isViewport);
            if (viewport) {
                const newViewport: Viewport = {
                    scroll: {
                        x: viewport.scroll.x,
                        y: viewport.scroll.y - 50
                    },
                    zoom: viewport.zoom
                };
                return [SetViewportAction.create(viewport.id, newViewport, { animate: false })];
            }
        } else if (matchesKeystroke(event, 'ArrowDown')) {
            const viewport = findParentByFeature(element, isViewport);
            if (viewport) {
                const newViewport: Viewport = {
                    scroll: {
                        x: viewport.scroll.x,
                        y: viewport.scroll.y + 50
                    },
                    zoom: viewport.zoom
                };
                return [SetViewportAction.create(viewport.id, newViewport, { animate: false })];
            }
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            const viewport = findParentByFeature(element, isViewport);
            if (viewport) {
                const newViewport: Viewport = {
                    scroll: {
                        x: viewport.scroll.x + 50,
                        y: viewport.scroll.y
                    },
                    zoom: viewport.zoom
                };
                return [SetViewportAction.create(viewport.id, newViewport, { animate: false })];
            }
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            const viewport = findParentByFeature(element, isViewport);
            if (viewport) {
                const newViewport: Viewport = {
                    scroll: {
                        x: viewport.scroll.x - 50,
                        y: viewport.scroll.y
                    },
                    zoom: viewport.zoom
                };
                return [SetViewportAction.create(viewport.id, newViewport, { animate: false })];
            }
        }
        return [];
    }
}
