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

import { Action, Bounds, Point, SelectAction } from '@eclipse-glsp/protocol';
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
    SConnectableElement,
    SChildElement,
    SNode
} from 'sprotty';
import { toArray } from 'sprotty/lib/utils/iterable';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { TYPES } from '../../base/types';
import { calcElementAndRoute, isRoutable, isSelectableAndBoundsAware } from '../../utils/smodel-util';
import { ShowToastMessageAction } from '../toast/toast';
import { applyCssClasses, deleteCssClasses } from '../tool-feedback/css-feedback';
import * as messages from '../toast/messages.json';
import { RepositionAction } from '../viewport/reposition';
import { KeyboardManagerService } from '../keyboard/manager/keyboard-manager-service';
import { CheatSheetKeyShortcutProvider, SetCheatSheetKeyShortcutAction } from '../cheat-sheet/cheat-sheet';

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

    process?(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        target: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): void;
    clean?(root: Readonly<SModelRoot>, current: SModelElement & BoundsAware, previousCurrent?: SModelElement & BoundsAware): void;
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
    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: GLSPActionDispatcher;

    previous(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getPreviousElement(current, predicate);
    }

    next(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getNextElement(current, predicate);
    }

    up(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getIterable(current, previousCurrent, predicate);
    }

    down(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getIterable(current, previousCurrent, predicate);
    }

    process(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        target: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): void {
        let elements: SModelElement[] = [];

        // Mark only edges
        if (target instanceof SEdge) {
            // If current is a edge, we have to check the source and target
            if (current instanceof SEdge) {
                elements = this.getIterables(target, current.source === target.source ? current.source : current.target, predicate);
            } else {
                // Otherwise take the current as it is
                elements = this.getIterables(target, current, predicate);
            }
        }

        elements.filter(e => e.id !== target.id).forEach(e => this.actionDispatcher.dispatch(applyCssClasses(e, 'navigable-element')));
    }
    clean(root: Readonly<SModelRoot>, current: SModelElement & BoundsAware, previousCurrent?: SModelElement & BoundsAware): void {
        root.index.all().forEach(e => this.actionDispatcher.dispatch(deleteCssClasses(e, 'navigable-element')));
    }

    protected getIterables(
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement[] {
        const elements: SModelElement[] = [];

        if (current instanceof SEdge) {
            if (current.target === previousCurrent) {
                current.target?.incomingEdges.forEach(e => elements.push(e));
            } else {
                current.source?.outgoingEdges.forEach(e => elements.push(e));
            }
        }

        return elements.filter(predicate);
    }

    protected getIterable(
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement {
        return this.getIterables(current, previousCurrent, predicate).filter(e => e.id !== current.id)[0];
    }
    protected getNextElement(
        current: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement {
        const elements: SModelElement[] = [];

        if (current instanceof SConnectableElement) {
            current.outgoingEdges.forEach(e => elements.push(e));
        } else if (current instanceof SEdge) {
            const target = current.target as SModelElement;
            elements.push(target);
        }

        return elements.filter(predicate)[0];
    }

    protected getPreviousElement(
        current: SModelElement & BoundsAware,
        predicate: (element: SModelElement) => boolean = () => true
    ): SModelElement {
        const elements: SModelElement[] = [];

        if (current instanceof SConnectableElement) {
            current.incomingEdges.forEach(e => elements.push(e));
        } else if (current instanceof SEdge) {
            const source = current.source as SModelElement;
            elements.push(source);
        }

        return elements.filter(predicate)[0];
    }
}
@injectable()
export class PositionNavigator implements ElementNavigator {
    @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: GLSPActionDispatcher;

    previous(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getNearestElement(root, current, e => this.bounds(root, e).x < this.bounds(root, current).x);
    }

    next(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getNearestElement(root, current, e => this.bounds(root, e).x > this.bounds(root, current).x);
    }

    up(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getNearestElement(root, current, e => this.bounds(root, e).y < this.bounds(root, current).y);
    }

    down(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        previousCurrent?: SModelElement & BoundsAware,
        predicate?: (element: SModelElement) => boolean
    ): SModelElement | undefined {
        return this.getNearestElement(root, current, e => this.bounds(root, e).y > this.bounds(root, current).y);
    }

    protected getNearestElement(
        root: Readonly<SModelRoot>,
        current: SModelElement & BoundsAware,
        filter: (e: SModelElement & BoundsAware) => boolean
    ): SModelElement | undefined {
        const elements = this.boundElements(root).filter(filter);
        return this.sortByDistance(root, current, elements)[0];
    }

    protected sortByDistance(
        root: SModelRoot,
        current: SModelElement & BoundsAware,
        elements: (SModelElement & BoundsAware)[]
    ): (SModelElement & BoundsAware)[] {
        // https://www.tutorialspoint.com/sort-array-of-points-by-ascending-distance-from-a-given-point-javascript
        const distance = (coor1: Point, coor2: Point): number => {
            const x = coor2.x - coor1.x;
            const y = coor2.y - coor1.y;
            return Math.sqrt(x * x + y * y);
        };

        return elements.sort(
            (a, b) =>
                distance(this.bounds(root, a), this.bounds(root, current)) - distance(this.bounds(root, b), this.bounds(root, current))
        );
    }

    protected boundElements(root: Readonly<SModelRoot>): (SModelElement & BoundsAware)[] {
        return toArray(root.index.all().filter(e => e instanceof SNode && isSelectable(e) && isBoundsAware(e))) as (SModelElement &
            BoundsAware)[];
    }

    protected bounds(root: Readonly<SModelRoot>, element: SModelElement & BoundsAware): Bounds {
        return this.boundsInViewport(element, element.bounds, root);
    }

    protected boundsInViewport(element: SModelElement, bounds: Bounds, viewport: SModelRoot): Bounds {
        if (element instanceof SChildElement && element.parent !== viewport) {
            return this.boundsInViewport(element.parent, element.parent.localToParent(bounds) as Bounds, viewport);
        } else {
            return bounds;
        }
    }
}
@injectable()
export class ElementNavigatorTool implements GLSPTool {
    static ID = 'glsp.diagram-navigation';

    isEditTool = true;

    protected elementNavigatorKeyListener: ElementNavigatorKeyListener = new ElementNavigatorKeyListener(this);
    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(TYPES.IElementNavigator) readonly elementNavigator: ElementNavigator;
    @inject(TYPES.ILocalElementNavigator) readonly localElementNavigator: ElementNavigator;
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher: GLSPActionDispatcher;
    @inject(KeyboardManagerService) readonly keyboardManager: KeyboardManagerService;

    get id(): string {
        return ElementNavigatorTool.ID;
    }

    enable(): void {
        this.keytool.register(this.elementNavigatorKeyListener);
        this.elementNavigatorKeyListener.registerShortcutKey();
    }

    disable(): void {
        this.keytool.deregister(this.elementNavigatorKeyListener);
    }
}

enum NavigationMode {
    POSITION = 'position',
    DEFAULT = 'default',
    NONE = 'none'
}

export class ElementNavigatorKeyListener extends KeyListener implements CheatSheetKeyShortcutProvider {
    protected readonly accessToken = Symbol('ElementNavigatorKeyListener');
    static readonly TIMEOUT = 5000;
    protected mode = NavigationMode.NONE;
    protected previousNode?: SModelElement & BoundsAware;
    protected navigator?: ElementNavigator;

    constructor(protected readonly tool: ElementNavigatorTool) {
        super();
    }
    registerShortcutKey(): void {
        this.tool.actionDispatcher.onceModelInitialized().then(() => {
            this.tool.actionDispatcher.dispatchAll([
                SetCheatSheetKeyShortcutAction.create(Symbol('activate-default-navigation'), [
                    { shortcuts: ['ALT', 'N'], description: 'Activate default navigation mode', group: 'Default Navigation', position: 0 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('default-navigation-elements'), [
                    {
                        shortcuts: ['⬅ ➡'],
                        description: 'Navigate through elements',
                        group: 'Default Navigation',
                        position: 1
                    }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('default-navigation-edges'), [
                    {
                        shortcuts: ['⬆ ⬇'],
                        description: 'Navigate through edges',
                        group: 'Default Navigation',
                        position: 2
                    }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('activate-position-navigation'), [
                    {
                        shortcuts: ['N'],
                        description: 'Activate position based navigation mode',
                        group: 'Position based Navigation',
                        position: 0
                    }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('position-navigation'), [
                    { shortcuts: ['⬅ | ➡'], description: 'Navigate through element', group: 'Position based Navigation', position: 1 }
                ])
            ]);
        });
    }

    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (this.tool.keyboardManager.access(this.accessToken)) {
            if (this.getSelectedElements(element.root).length > 0) {
                if (matchesKeystroke(event, 'Escape')) {
                    this.clean();

                    if (this.mode === NavigationMode.POSITION) {
                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.local_navigation_mode_deactivated,
                                timeout: ElementNavigatorKeyListener.TIMEOUT
                            })
                        );
                    } else if (this.mode === NavigationMode.DEFAULT) {
                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.default_navigation_mode_deactivated,
                                timeout: ElementNavigatorKeyListener.TIMEOUT
                            })
                        );
                    }

                    this.tool.keyboardManager.unlock(this.accessToken);
                    this.mode = NavigationMode.NONE;
                }
                if (matchesKeystroke(event, 'KeyN', 'alt')) {
                    this.clean();
                    if (this.mode !== NavigationMode.POSITION) {
                        this.tool.keyboardManager.lock(this.accessToken);

                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.local_navigation_mode_activated
                            })
                        );
                        this.navigator = this.tool.elementNavigator;
                        this.mode = NavigationMode.POSITION;
                    } else {
                        this.tool.keyboardManager.unlock(this.accessToken);
                        this.mode = NavigationMode.NONE;
                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.local_navigation_mode_deactivated,
                                timeout: ElementNavigatorKeyListener.TIMEOUT
                            })
                        );
                    }
                } else if (matchesKeystroke(event, 'KeyN')) {
                    this.clean();
                    if (this.mode !== NavigationMode.DEFAULT) {
                        this.tool.keyboardManager.lock(this.accessToken);
                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.default_navigation_mode_activated
                            })
                        );
                        this.navigator = this.tool.localElementNavigator;
                        this.mode = NavigationMode.DEFAULT;
                    } else {
                        this.tool.keyboardManager.unlock(this.accessToken);
                        this.mode = NavigationMode.NONE;
                        this.tool.actionDispatcher.dispatch(
                            ShowToastMessageAction.create({
                                id: Symbol.for(ElementNavigatorKeyListener.name),
                                message: messages.navigation.default_navigation_mode_deactivated,
                                timeout: ElementNavigatorKeyListener.TIMEOUT
                            })
                        );
                    }
                }

                const selected = this.getSelectedElements(element.root);

                const current = selected.length > 0 ? selected[0] : undefined;

                if (this.mode !== NavigationMode.NONE && this.navigator !== undefined && current !== undefined && isBoundsAware(current)) {
                    let target;
                    this.navigator.clean?.(current.root, current, this.previousNode);
                    if (matchesKeystroke(event, 'ArrowLeft')) {
                        target = this.navigator.previous(current.root, current);
                    } else if (matchesKeystroke(event, 'ArrowRight')) {
                        target = this.navigator.next(current.root, current);
                    } else if (matchesKeystroke(event, 'ArrowUp')) {
                        target = this.navigator.up?.(current.root, current, this.previousNode);
                    } else if (matchesKeystroke(event, 'ArrowDown')) {
                        target = this.navigator.down?.(current.root, current, this.previousNode);
                    }
                    if (target !== undefined) {
                        this.navigator.process?.(current.root, current, target as SModelElement & BoundsAware, this.previousNode);
                    }
                    const selectableTarget = target ? findParentByFeature(target, isSelectable) : undefined;

                    if (selectableTarget) {
                        if (!(current instanceof SEdge)) {
                            this.previousNode = current;
                        }
                        const deselectedElementsIDs = selected.map(e => e.id).filter(id => id !== selectableTarget.id);
                        this.tool.actionDispatcher.dispatchAll([
                            SelectAction.create({ selectedElementsIDs: [selectableTarget.id], deselectedElementsIDs }),
                            RepositionAction.create([selectableTarget.id])
                        ]);
                    }
                }
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
