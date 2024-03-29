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
import { Action, ChangeBoundsOperation, Dimension, Point } from '@eclipse-glsp/protocol';
import { inject, injectable, optional } from 'inversify';
import {
    KeyListener,
    KeyTool,
    SModelElement,
    isBoundsAware,
    isSelectable,
    BoundsAware,
    SParentElement,
    ISnapper,
    Selectable,
    isSelected,
    SModelRoot
} from 'sprotty';
import { TYPES } from '../../base/types';
import { isResizable, Resizable } from '../change-bounds/model';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../base/tool-manager/glsp-tool-manager';
import { toElementAndBounds } from '../../utils/smodel-util';
import { GridSnapper } from './snap';
import { isValidMove, isValidSize, minHeight, minWidth } from '../../utils/layout-utils';
import { IMovementRestrictor } from './movement-restrictor';
import { KeyboardManagerService } from '../keyboard/manager/keyboard-manager-service';
import { GLSPActionDispatcher } from '../../base/action-dispatcher';
import { CheatSheetKeyShortcutProvider, SetCheatSheetKeyShortcutAction } from '../cheat-sheet/cheat-sheet';
import { ShowToastMessageAction } from '../toast/toast';
import * as messages from '../toast/messages.json';
import { toArray } from 'sprotty/lib/utils/iterable';
import { ElementNavigatorKeyListener } from '../navigation/diagram-navigation-tool';

@injectable()
export class ResizeTool implements GLSPTool {
    static ID = 'glsp.resize-keyboard';

    isEditTool = true;

    @inject(KeyTool) protected readonly keytool: KeyTool;
    @inject(TYPES.IMovementRestrictor) @optional() readonly movementRestrictor?: IMovementRestrictor;
    @inject(TYPES.ISnapper) @optional() readonly snapper?: ISnapper;
    @inject(KeyboardManagerService) readonly keyboardManager: KeyboardManagerService;
    @inject(TYPES.IActionDispatcher) readonly actionDispatcher: GLSPActionDispatcher;

    protected resizeKeyListener: ResizeKeyListener;

    get id(): string {
        return ResizeTool.ID;
    }

    enable(): void {
        this.resizeKeyListener = new ResizeKeyListener(this);
        this.keytool.register(this.resizeKeyListener);
        this.resizeKeyListener.registerShortcutKey();
    }

    disable(): void {
        this.keytool.deregister(this.resizeKeyListener);
    }
}
@injectable()
export class ResizeKeyListener extends KeyListener implements CheatSheetKeyShortcutProvider {
    protected grid = { x: 20, y: 20 };
    protected isEditMode = false;
    protected readonly accessToken = Symbol('ResizeKeyListener');

    constructor(protected readonly tool: ResizeTool) {
        super();

        if (this.tool.snapper instanceof GridSnapper) {
            this.grid = this.tool.snapper?.grid;
        }
    }
    registerShortcutKey(): void {
        this.tool.actionDispatcher.onceModelInitialized().then(() => {
            this.tool.actionDispatcher.dispatchAll([
                SetCheatSheetKeyShortcutAction.create(Symbol('resize-mode'), [
                    { shortcuts: ['ALT', 'R'], description: 'Activate resize mode for selected element', group: 'Resize', position: 0 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('resize-in'), [
                    { shortcuts: ['+'], description: 'Increase size of element', group: 'Resize', position: 1 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('resize-out'), [
                    { shortcuts: ['-'], description: 'Increase size of element', group: 'Resize', position: 2 }
                ]),
                SetCheatSheetKeyShortcutAction.create(Symbol('resize-default'), [
                    { shortcuts: ['CTRL', '0'], description: 'Set element size to default', group: 'Resize', position: 3 }
                ])
            ]);
        });
    }
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        const actions: Action[] = [];

        if (this.tool.keyboardManager.access(this.accessToken) && this.getSelectedElements(element.root).length > 0) {
            if (this.isEditMode && matchesKeystroke(event, 'Escape')) {
                this.isEditMode = false;
                this.tool.actionDispatcher.dispatch(
                    ShowToastMessageAction.create({
                        id: Symbol.for(ElementNavigatorKeyListener.name),
                        message: messages.resize.resize_mode_deactivated,
                        timeout: ElementNavigatorKeyListener.TIMEOUT
                    })
                );
            } else if (!this.isEditMode && matchesKeystroke(event, 'KeyR', 'alt')) {
                this.isEditMode = true;
                this.tool.actionDispatcher.dispatch(
                    ShowToastMessageAction.create({
                        id: Symbol.for(ElementNavigatorKeyListener.name),
                        message: messages.resize.resize_mode_activated,
                        timeout: ElementNavigatorKeyListener.TIMEOUT
                    })
                );
            }

            if (this.isEditMode) {
                this.tool.keyboardManager.lock(this.accessToken);
            } else {
                this.tool.keyboardManager.unlock(this.accessToken);
            }

            if (this.isEditMode) {
                const selectedElements = Array.from(
                    element.root.index
                        .all()
                        .filter(e => isSelectable(e) && isBoundsAware(e) && isResizable(e) && e.selected)
                        .filter(e => e.id !== e.root.id)
                        .map(e => e) as (SModelElement & BoundsAware)[]
                );

                if (event.key === '+') {
                    for (const elem of selectedElements) {
                        const action = this.handleResizeElement(elem, this.grid.x, this.grid.y);
                        if (action) {
                            actions.push(action);
                        }
                    }
                } else if (matchesKeystroke(event, 'Minus')) {
                    for (const elem of selectedElements) {
                        const action = this.handleResizeElement(elem, -this.grid.x, -this.grid.y);
                        if (action) {
                            actions.push(action);
                        }
                    }
                } else if (matchesKeystroke(event, 'Digit0', 'ctrl')) {
                    for (const elem of selectedElements) {
                        elem.bounds = { x: elem.bounds.x, y: elem.bounds.y, width: minWidth(elem), height: minHeight(elem) };
                        const action = this.handleResizeElement(elem, 0, 0);
                        if (action) {
                            actions.push(action);
                        }
                    }
                }
            }
        }

        return actions;
    }

    protected handleResizeElement(element: SModelElement & BoundsAware, deltaWidth: number, deltaHeight: number): Action | undefined {
        const x = element.bounds.x;
        const y = element.bounds.y;
        const width = element.bounds.width + deltaWidth;
        const height = element.bounds.height + deltaHeight;
        const newPosition = { x, y };
        const newSize = { width, height };

        const resizeElement = { id: element.id, bounds: { x, y, width, height } } as SModelElement & SParentElement & Resizable;

        if (this.isValidBoundChange(resizeElement, newPosition, newSize)) {
            return ChangeBoundsOperation.create([toElementAndBounds(resizeElement)]);
        }

        return undefined;
    }

    protected isValidBoundChange(element: SModelElement & BoundsAware, newPosition: Point, newSize: Dimension): boolean {
        return this.isValidSize(element, newSize) && this.isValidMove(element, newPosition);
    }
    protected isValidSize(element: SModelElement & BoundsAware, size: Dimension): boolean {
        return isValidSize(element, size);
    }

    protected isValidMove(element: SModelElement & BoundsAware, newPosition: Point): boolean {
        return isValidMove(element, newPosition, this.tool.movementRestrictor);
    }
    protected getSelectedElements(root: SModelRoot): (SModelElement & Selectable)[] {
        return toArray(root.index.all().filter(e => isSelected(e))) as (SModelElement & Selectable)[];
    }
}
