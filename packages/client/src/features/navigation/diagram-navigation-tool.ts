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

import { Action, CenterAction, SelectAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import {
    KeyListener,
    KeyTool,
    SModelElement,
    SModelRoot,
    BoundsAware,
    isBoundsAware,
    isSelected,
    Selectable,
    findParentByFeature,
    isSelectable
} from 'sprotty';
import { toArray } from 'sprotty/lib/utils/iterable';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { TYPES } from '../../base/types';
import { isSelectableAndBoundsAware } from '../../index';
import { GEdge } from '../../lib/model';

export interface ElementNavigator {
    previous(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;
    next(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;
}

@injectable()
export class DefaultElementNavigator implements ElementNavigator {
    previous(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getElements(root, predicate);

        if (current === undefined) {
            return elements.length > 0 ? elements[0] : undefined;
        }
        return elements[this.getPreviousIndex(current, elements) % elements.length];
    }

    next(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getElements(root, predicate);
        if (current === undefined) {
            return elements.length > 0 ? elements[0] : undefined;
        }
        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    protected getElements(root: Readonly<SModelRoot>, predicate: (element: SModelElement) => boolean): SModelElement[] {
        const elements = toArray(root.index.all().filter(e => isSelectableAndBoundsAware(e) && !(e instanceof GEdge))) as (SModelElement &
            BoundsAware)[];
        return elements.sort((a, b) => this.compare(a, b)).filter(predicate);
    }

    protected getNextIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        // console.log('=== Get Next Index', current, elements);

        for (let index = 0; index < elements.length; index++) {
            if (this.compare(elements[index], current) > 0) {
                /* console.log('=========================');
                console.log('Before', elements.slice(0, index));
                console.log('Current', index, elements[index]);
                console.log('After', elements.slice(index + 1));
                console.log('=========================');*/
                return index;
            }
        }
        //  console.log('Return to start');
        return 0;
    }

    protected getPreviousIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        //  console.log('=== Get Previous Index', current, elements);

        for (let index = elements.length - 1; index >= 0; index--) {
            if (this.compare(elements[index], current) < 0) {
                /*   console.log('=========================');
                console.log('Before', elements.slice(0, index));
                console.log('Current', index, elements[index]);
                console.log('After', elements.slice(index + 1));
                console.log('=========================');*/
                return index;
            }
        }
        //  console.log('Return to end');
        return elements.length - 1;
    }
    protected compare(one: SModelElement, other: SModelElement): number {
        const boundsOne = findParentByFeature(one, isSelectableAndBoundsAware);
        const boundsOther = findParentByFeature(other, isSelectableAndBoundsAware);
        if (boundsOne && boundsOther) {
            if (boundsOne.bounds.y !== boundsOther.bounds.y) {
                return boundsOne.bounds.y - boundsOther.bounds.y;
            }
            if (boundsOne.bounds.x !== boundsOther.bounds.x) {
                return boundsOne.bounds.x - boundsOther.bounds.x;
            }
        }
        console.log('== ERROR ==, Comparison failed for ', one, other);
        return 0;
    }
}

@injectable()
export class ElementNavigatorTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;

    protected elementNavigatorKeyListener: ElementNavigatorKeyListener = new ElementNavigatorKeyListener(this);

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(DefaultElementNavigator) readonly elementNavigator: DefaultElementNavigator;
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher: GLSPActionDispatcher;

    get id(): string {
        return ElementNavigatorTool.ID;
    }

    enable(): void {
        this.keytool.register(this.elementNavigatorKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.elementNavigatorKeyListener);
    }
}

export class ElementNavigatorKeyListener extends KeyListener {
    isNavigationMode = false;

    constructor(protected readonly tool: ElementNavigatorTool) {
        super();
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'KeyN')) {
            // console.log('activated navigation');
            this.isNavigationMode = !this.isNavigationMode;
        }
        const selected = this.getSelectedElements(element.root);

        const current = selected.length > 0 ? selected[0] : element;

        if (this.isNavigationMode && isBoundsAware(current)) {
            let target;
            if (matchesKeystroke(event, 'ArrowLeft')) {
                target = this.getTarget(current, selected, 'previous');
            } else if (matchesKeystroke(event, 'ArrowRight')) {
                target = this.getTarget(current, selected, 'next');
            }
            const selectableTarget = target ? findParentByFeature(target, isSelectable) : undefined;
            console.log('Navigate to element', selectableTarget);

            if (selectableTarget) {
                const deselectedElementsIDs = selected.map(e => e.id).filter(id => id !== selectableTarget.id);
                this.tool.actionDispatcher.dispatch(
                    SelectAction.create({ selectedElementsIDs: [selectableTarget.id], deselectedElementsIDs })
                );
                this.tool.actionDispatcher.dispatch(CenterAction.create([selectableTarget.id]));
            }
        }

        return [];
    }

    protected getSelectedElements(root: SModelRoot): (SModelElement & Selectable)[] {
        return toArray(root.index.all().filter(e => isSelected(e))) as (SModelElement & Selectable)[];
    }

    protected getTarget(
        current: SModelElement & BoundsAware,
        selected: SModelElement[],
        direction: 'previous' | 'next'
    ): SModelElement | undefined {
        if (direction === 'previous') {
            return this.tool.elementNavigator.previous(current.root, current);
        } else {
            return this.tool.elementNavigator.next(current.root, current);
        }
    }
}
