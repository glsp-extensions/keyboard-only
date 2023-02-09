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
import { Action, ChangeBoundsOperation, RequestMarkersAction, SetViewportAction, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { off } from 'process';
import { KeyListener, KeyTool, SModelElement, findParentByFeature, isViewport, isSelectable, isBoundsAware, SModelRoot } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../../base/tool-manager/glsp-tool-manager';

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
        const viewport = findParentByFeature(element, isViewport);

        if (!viewport) {
            return [];
        }
        if (matchesKeystroke(event, 'Minus')) {
            const viewportAction = this.setNewViewport(viewport, this.defaultZoomOutFactor);
            if (viewportAction) {
                return [viewportAction];
            }
        } else if (event.key === '+') {
            const viewportAction = this.setNewViewport(viewport, this.defaultZoomInFactor);
            if (viewportAction) {
                return [viewportAction];
            }
        }
        return [];
    }
    setNewViewport(viewport: SModelElement & SModelRoot & Viewport, zoomFactor: number): SetViewportAction | undefined {
        if (viewport) {
            const newViewport: Viewport = {
                scroll: {
                    x: viewport.scroll.x,
                    y: viewport.scroll.y
                },
                zoom: viewport.zoom * zoomFactor
            };

            return SetViewportAction.create(viewport.id, newViewport, { animate: false });
        }
        return;
    }
}
