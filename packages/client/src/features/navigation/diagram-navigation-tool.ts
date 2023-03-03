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

import { Action, CenterAction, Point, SelectAction } from '@eclipse-glsp/protocol';
import { inject, injectable, optional } from 'inversify';
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
    isSelectable,
    EdgeRouterRegistry,
    SEdge,
    SConnectableElement
} from 'sprotty';
import { toArray } from 'sprotty/lib/utils/iterable';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { TYPES } from '../../base/types';
import { calcElementAndRoute, isRoutable, isSelectableAndBoundsAware } from '../../utils/smodel-util';

export interface ElementNavigator {
    previous(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;

    next(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;

    up?(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;

    down?(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined;
}

@injectable()
export class LeftToRightTopToBottomElementNavigator implements ElementNavigator {
    @inject(EdgeRouterRegistry) @optional() readonly edgeRouterRegistry?: EdgeRouterRegistry;

    previous(
        root: Readonly<SModelRoot>,
        current?: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
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
        previousCurrent?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getElements(root, predicate);
        if (current === undefined) {
            return elements.length > 0 ? elements[0] : undefined;
        }
        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    protected getElements(root: Readonly<SModelRoot>, predicate: (element: SModelElement) => boolean): SModelElement[] {
        const elements = toArray(root.index.all().filter(e => isSelectableAndBoundsAware(e))) as (SModelElement & BoundsAware)[];
        return elements.sort((a, b) => this.compare(a, b)).filter(predicate);
    }

    protected getNextIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        for (let index = 0; index < elements.length; index++) {
            if (this.compare(elements[index], current) > 0) {
                return index;
            }
        }

        return 0;
    }

    protected getPreviousIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        for (let index = elements.length - 1; index >= 0; index--) {
            if (this.compare(elements[index], current) < 0) {
                return index;
            }
        }

        return elements.length - 1;
    }

    protected compare(one: SModelElement, other: SModelElement): number {
        let positionOne: Point | undefined = undefined;
        let positionOther: Point | undefined = undefined;

        if (one instanceof SEdge && isRoutable(one)) {
            positionOne = calcElementAndRoute(one, this.edgeRouterRegistry).newRoutingPoints?.[0];
        }

        if (other instanceof SEdge && isRoutable(other)) {
            positionOther = calcElementAndRoute(other, this.edgeRouterRegistry).newRoutingPoints?.[0];
        }

        const boundsOne = findParentByFeature(one, isSelectableAndBoundsAware);
        const boundsOther = findParentByFeature(other, isSelectableAndBoundsAware);

        if (positionOne === undefined && boundsOne) {
            positionOne = boundsOne.bounds;
        }

        if (positionOther === undefined && boundsOther) {
            positionOther = boundsOther.bounds;
        }

        if (positionOne && positionOther) {
            if (positionOne.y !== positionOther.y) {
                return positionOne.y - positionOther.y;
            }
            if (positionOne.x !== positionOther.x) {
                return positionOne.x - positionOther.x;
            }
        }

        return 0;
    }
}

@injectable()
export class LocalElementNavigator implements ElementNavigator {
    @inject(EdgeRouterRegistry) @optional() readonly edgeRouterRegistry?: EdgeRouterRegistry;

    previous(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getPreviousElements(root, predicate, current);

        return elements[this.getPreviousIndex(current, elements) % elements.length];
    }

    next(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getNextElements(root, predicate, current);

        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    up(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getIterables(root, predicate, current, previousCurrent);

        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    down(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement | undefined {
        const elements = this.getIterables(root, predicate, current, previousCurrent);

        return elements[this.getNextIndex(current, elements) % elements.length];
    }

    protected getIterables(
        root: Readonly<SModelRoot>,
        predicate: (element: SModelElement) => boolean,
        current?: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware
    ): SModelElement[] {
        const elements: SModelElement[] = [];

        if (current instanceof SEdge) {
            if (current.target === previousCurrent) {
                current.target?.incomingEdges.forEach(e => elements.push(e));
            } else {
                current.source?.outgoingEdges.forEach(e => elements.push(e));
            }
        }

        return elements.sort((a, b) => this.compare(a, b)).filter(predicate);
    }

    protected getNextElements(
        root: Readonly<SModelRoot>,
        predicate: (element: SModelElement) => boolean,
        current: SModelElement & BoundsAware
    ): SModelElement[] {
        const elements: SModelElement[] = [current];

        if (current instanceof SConnectableElement) {
            current.outgoingEdges.forEach(e => elements.push(e));
        } else if (current instanceof SEdge) {
            const target = current.target as SModelElement;
            elements.push(target);
        }

        return elements.sort((a, b) => this.compare(a, b)).filter(predicate);
    }

    protected getPreviousElements(
        root: Readonly<SModelRoot>,
        predicate: (element: SModelElement) => boolean,
        current: SModelElement & BoundsAware
    ): SModelElement[] {
        const elements: SModelElement[] = [current];

        if (current instanceof SConnectableElement) {
            current.incomingEdges.forEach(e => elements.push(e));
        } else if (current instanceof SEdge) {
            const source = current.source as SModelElement;
            elements.push(source);
        }

        return elements.sort((a, b) => this.compare(a, b)).filter(predicate);
    }

    protected getNextIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        for (let index = 0; index < elements.length; index++) {
            if (this.compare(elements[index], current) > 0) {
                return index;
            }
        }

        return 0;
    }

    protected getPreviousIndex(current: SModelElement & BoundsAware, elements: SModelElement[]): number {
        for (let index = elements.length - 1; index >= 0; index--) {
            if (this.compare(elements[index], current) < 0) {
                return index;
            }
        }

        return elements.length - 1;
    }

    protected compare(one: SModelElement, other: SModelElement): number {
        let positionOne: Point | undefined = undefined;
        let positionOther: Point | undefined = undefined;

        if (one instanceof SEdge && isRoutable(one)) {
            positionOne = calcElementAndRoute(one, this.edgeRouterRegistry).newRoutingPoints?.[0];
        }

        if (other instanceof SEdge && isRoutable(other)) {
            positionOther = calcElementAndRoute(other, this.edgeRouterRegistry).newRoutingPoints?.[0];
        }

        const boundsOne = findParentByFeature(one, isSelectableAndBoundsAware);
        const boundsOther = findParentByFeature(other, isSelectableAndBoundsAware);

        if (positionOne === undefined && boundsOne) {
            positionOne = boundsOne.bounds;
        }

        if (positionOther === undefined && boundsOther) {
            positionOther = boundsOther.bounds;
        }

        if (positionOne && positionOther) {
            if (positionOne.y !== positionOther.y) {
                return positionOne.y - positionOther.y;
            }
            if (positionOne.x !== positionOther.x) {
                return positionOne.x - positionOther.x;
            }
        }

        return 0;
    }
}

@injectable()
export class ElementNavigatorTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;

    protected elementNavigatorKeyListener: ElementNavigatorKeyListener = new ElementNavigatorKeyListener(this);

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(TYPES.IElementNavigator) readonly elementNavigator: ElementNavigator;
    @inject(TYPES.ILocalElementNavigator) readonly localElementNavigator: ElementNavigator;
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

enum NavigationMode {
    LOCAL = 'local',
    DEFAULT = 'default',
    NONE = 'none'
}
export class ElementNavigatorKeyListener extends KeyListener {
    protected mode = NavigationMode.NONE;
    protected previousNode?: SModelElement & BoundsAware;
    protected navigator?: ElementNavigator;

    constructor(protected readonly tool: ElementNavigatorTool) {
        super();
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'KeyN', 'alt')) {
            this.clean();
            if (this.mode !== NavigationMode.LOCAL) {
                this.navigator = this.tool.localElementNavigator;
                this.mode = NavigationMode.LOCAL;
            } else {
                this.mode = NavigationMode.NONE;
            }
        } else if (matchesKeystroke(event, 'KeyN')) {
            this.clean();
            if (this.mode !== NavigationMode.DEFAULT) {
                this.navigator = this.tool.elementNavigator;
                this.mode = NavigationMode.DEFAULT;
            } else {
                this.mode = NavigationMode.NONE;
            }
        }

        const selected = this.getSelectedElements(element.root);

        const current = selected.length > 0 ? selected[0] : undefined;

        if (this.mode !== NavigationMode.NONE && this.navigator !== undefined && current !== undefined && isBoundsAware(current)) {
            let target;
            if (matchesKeystroke(event, 'ArrowLeft')) {
                target = this.navigator.previous(current.root, current);
            } else if (matchesKeystroke(event, 'ArrowRight')) {
                target = this.navigator.next(current.root, current);
            } else if (matchesKeystroke(event, 'ArrowUp')) {
                target = this.navigator.up?.(current.root, current, this.previousNode);
            } else if (matchesKeystroke(event, 'ArrowDown')) {
                target = this.navigator.down?.(current.root, current, this.previousNode);
            }

            const selectableTarget = target ? findParentByFeature(target, isSelectable) : undefined;

            if (selectableTarget) {
                if (!(current instanceof SEdge)) {
                    this.previousNode = current;
                }
                const deselectedElementsIDs = selected.map(e => e.id).filter(id => id !== selectableTarget.id);
                this.tool.actionDispatcher.dispatchAll([
                    SelectAction.create({ selectedElementsIDs: [selectableTarget.id], deselectedElementsIDs }),
                    CenterAction.create([selectableTarget.id])
                ]);
            }
        }

        return [];
    }

    clean(): void {
        this.previousNode = undefined;
        this.navigator = undefined;
    }

    protected getSelectedElements(root: SModelRoot): (SModelElement & Selectable)[] {
        return toArray(root.index.all().filter(e => isSelected(e))) as (SModelElement & Selectable)[];
    }
}
