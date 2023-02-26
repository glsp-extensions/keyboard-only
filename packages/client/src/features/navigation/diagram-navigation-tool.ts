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
        console.log('Get previous');
        return undefined;
    }

    next(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        console.log('Get next');
        const elements = this.getElements(root, predicate);
        if (current === undefined) {
            return elements.length > 0 ? elements[0] : undefined;
        }
        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    protected getElements(root: Readonly<SModelRoot>, predicate: (element: SModelElement) => boolean): SModelElement[] {
        const elements = toArray(root.index.all().filter(e => isBoundsAware(e)));

        // TODO: Sort maybe if necessary
        return elements.filter(predicate);
    }

    protected getNextIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        // TODO: Previous Index
        return elements.length - 2;
    }

    protected getPreviousIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        // TODO: Next index
        return 2;
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
            console.log('activated navigation');
            this.isNavigationMode = !this.isNavigationMode;
        }
        const selected = this.getSelectedElements(element.root);

        const current = selected.length > 0 ? selected[0] : element;

        if (this.isNavigationMode && isBoundsAware(current)) {
            if (matchesKeystroke(event, 'ArrowLeft')) {
                console.log('prev element');
            } else if (matchesKeystroke(event, 'ArrowRight')) {
                console.log('next element');

                const target = this.getTarget(current, selected, 'next');

                const selectableTarget = target ? findParentByFeature(target, isSelectable) : undefined;
                console.log('Navigate to element', current, target, selectableTarget);
                if (selectableTarget) {
                    const deselectedElementsIDs = selected.map(e => e.id).filter(id => id !== selectableTarget.id);
                    this.tool.actionDispatcher.dispatch(
                        SelectAction.create({ selectedElementsIDs: [selectableTarget.id], deselectedElementsIDs })
                    );
                    this.tool.actionDispatcher.dispatch(CenterAction.create([selectableTarget.id]));
                }
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
