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
import { Action, DeleteElementOperation } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import {
    EnableDefaultToolsAction,
    findParentByFeature,
    isCtrlOrCmd,
    isDeletable,
    KeyListener,
    KeyTool,
    MouseListener,
    SModelElement
} from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { GLSPTool } from '../../../base/tool-manager/glsp-tool-manager';
import { TYPES } from '../../../base/types';
import { IMouseTool } from '../../mouse-tool/mouse-tool';
import { CursorCSS, cursorFeedbackAction } from '../../tool-feedback/css-feedback';
import { IFeedbackActionDispatcher } from '../../tool-feedback/feedback-action-dispatcher';

/**
 * Moves viewport when its focused and arrow keys are hit.
 */
@injectable()
export class MovementTool implements GLSPTool {
    static ID = 'glsp.movement-keyboard';

    isEditTool = true;
    protected movevementKeyListener: MoveKeyListener = new MoveKeyListener();

    @inject(KeyTool) protected readonly keytool: KeyTool;

    get id(): string {
        return MovementTool.ID;
    }

    enable(): void {
        this.keytool.register(this.movevementKeyListener);
    }

    disable(): void {
        this.keytool.deregister(this.movevementKeyListener);
    }
}

@injectable()
export class MoveKeyListener extends KeyListener {
    override keyDown(element: SModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'ArrowUp')) {
            console.log('arrow up');
            /**   const deleteElementIds = Array.from(
                element.root.index
                    .all()
                    .filter(e => isDeletable(e) && isSelectable(e) && e.selected)
                    .filter(e => e.id !== e.root.id)
                    .map(e => e.id)
            );
            if (deleteElementIds.length > 0) {
                return [DeleteElementOperation.create(deleteElementIds)];**/
        } else if (matchesKeystroke(event, 'ArrowDown')) {
            console.log('arrow down');
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            console.log('arrow right');
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            console.log('arrow left');
        }
        return [];
    }
}

/**
 * Deletes selected elements when clicking on them.
 */
@injectable()
export class MouseMovementTool implements GLSPTool {
    static ID = 'glsp.movement-mouse';

    isEditTool = true;

    protected movementToolMouseListener: MovementToolMouseListener = new MovementToolMouseListener();

    @inject(TYPES.MouseTool) protected mouseTool: IMouseTool;
    @inject(TYPES.IFeedbackActionDispatcher) protected readonly feedbackDispatcher: IFeedbackActionDispatcher;

    get id(): string {
        return MouseMovementTool.ID;
    }

    enable(): void {
        this.mouseTool.register(this.movementToolMouseListener);
        this.feedbackDispatcher.registerFeedback(this, [cursorFeedbackAction(CursorCSS.ELEMENT_DELETION)]);
    }

    disable(): void {
        this.mouseTool.deregister(this.movementToolMouseListener);
        this.feedbackDispatcher.registerFeedback(this, [cursorFeedbackAction()]);
    }
}

@injectable()
export class MovementToolMouseListener extends MouseListener {
    override mouseUp(target: SModelElement, event: MouseEvent): Action[] {
        const deletableParent = findParentByFeature(target, isDeletable);
        if (deletableParent === undefined) {
            return [];
        }
        const result: Action[] = [];
        result.push(DeleteElementOperation.create([deletableParent.id]));
        if (!isCtrlOrCmd(event)) {
            result.push(EnableDefaultToolsAction.create());
        }
        return result;
    }
}
