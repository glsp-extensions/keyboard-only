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
import { Action, Bounds, Dimension, hasArrayProp, Viewport } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { BoundsAwareViewportCommand, isBoundsAware, isSelectable, isViewport, SModelRoot } from 'sprotty';
import { TYPES } from '../../base/types';

export interface RepositionAction extends Action {
    kind: typeof RepositionAction.KIND;
    elementIDs: string[];
}

export namespace RepositionAction {
    export const KIND = 'repositionAction';

    export function is(object: any): object is RepositionAction {
        return Action.hasKind(object, KIND) && hasArrayProp(object, 'elementIDs');
    }

    export function create(elementIDs: string[]): RepositionAction {
        return {
            kind: KIND,
            elementIDs
        };
    }
}
@injectable()
export class RepositionCommand extends BoundsAwareViewportCommand {
    static readonly KIND = RepositionAction.KIND;

    constructor(@inject(TYPES.Action) protected action: RepositionAction) {
        super(true);
    }

    protected override initialize(model: SModelRoot): void {
        if (isViewport(model)) {
            this.oldViewport = {
                scroll: model.scroll,
                zoom: model.zoom
            };
            const allBounds: Bounds[] = [];
            this.getElementIds().forEach(id => {
                const element = model.index.getById(id);
                if (element && isBoundsAware(element)) {
                    allBounds.push(this.boundsInViewport(element, element.bounds, model));
                }
            });
            if (allBounds.length === 0) {
                model.index.all().forEach(element => {
                    if (isSelectable(element) && element.selected && isBoundsAware(element)) {
                        allBounds.push(this.boundsInViewport(element, element.bounds, model));
                    }
                });
            }
            if (allBounds.length === 0) {
                model.index.all().forEach(element => {
                    if (isBoundsAware(element)) {
                        allBounds.push(this.boundsInViewport(element, element.bounds, model));
                    }
                });
            }

            if (allBounds.length !== 0) {
                const bounds = allBounds.reduce((b0, b1) => Bounds.combine(b0, b1));
                if (Dimension.isValid(bounds)) {
                    this.newViewport = this.getNewViewport(bounds, model);
                }
            }
        }
    }

    getElementIds(): string[] {
        return this.action.elementIDs;
    }

    getNewViewport(bounds: Bounds, model: SModelRoot): Viewport | undefined {
        if (!Dimension.isValid(model.canvasBounds)) {
            return undefined;
        }

        if (isViewport(model)) {
            const zoom = model.zoom;
            const c = Bounds.center(bounds);

            if (this.isFullyVisible(bounds, model)) {
                return undefined;
            } else {
                return {
                    scroll: {
                        x: c.x - (0.5 * model.canvasBounds.width) / zoom,
                        y: c.y - (0.5 * model.canvasBounds.height) / zoom
                    },
                    zoom: zoom
                };
            }
        }
    }

    protected isFullyVisible(bounds: Bounds, viewport: SModelRoot & Viewport): boolean {
        return (
            bounds.x >= viewport.scroll.x &&
            bounds.x + bounds.width <= viewport.scroll.x + viewport.canvasBounds.width / viewport.zoom &&
            bounds.y >= viewport.scroll.y &&
            bounds.y + bounds.height <= viewport.scroll.y + viewport.canvasBounds.height / viewport.zoom
        );
    }
}
