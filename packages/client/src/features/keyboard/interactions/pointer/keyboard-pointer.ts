/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
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
import { Action, TriggerNodeCreationAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import { AbstractUIExtension, IActionDispatcher, IActionHandler, SModelRoot, TYPES } from 'sprotty';

import { SModelRootListener } from '../../../../base/model/update-model-command';
import { KeyboardGridCellSelectedAction } from '../grid/actions';
import { SetKeyboardPointerRenderPositionAction } from './actions';
import { KeyboardPointerMetadata } from './constants';
import { KeyboardPointerKeyboardListener } from './keyboard-pointer.listener';
import { KeyboardPointerPosition } from './keyboard-pointer.position';

@injectable()
export class KeyboardPointer extends AbstractUIExtension implements IActionHandler, SModelRootListener {
    protected _triggerAction: TriggerNodeCreationAction = {
        elementTypeId: 'task:automated',
        kind: 'triggerNodeCreation'
    };

    root: Readonly<SModelRoot>;
    position = new KeyboardPointerPosition(this);
    keyListener;

    constructor(@inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher) {
        super();

        this.keyListener = new KeyboardPointerKeyboardListener(this, actionDispatcher);
    }

    get triggerAction(): TriggerNodeCreationAction {
        return this._triggerAction;
    }

    get isVisible(): boolean {
        return this.containerElement?.style.visibility === 'visible';
    }

    id(): string {
        return KeyboardPointerMetadata.ID;
    }

    containerClass(): string {
        return KeyboardPointerMetadata.ID;
    }

    protected initializeContents(containerElement: HTMLElement): void {
        containerElement.style.position = 'absolute';
        containerElement.style.height = `${KeyboardPointerMetadata.CRICLE_HEIGHT}px`;
        containerElement.style.width = `${KeyboardPointerMetadata.CIRCLE_WIDTH}px`;
        containerElement.style.borderRadius = '100%';
    }

    protected override onBeforeShow(containerElement: HTMLElement, root: Readonly<SModelRoot>, ...selectedElementIds: string[]): void {
        this.root = root;
        this.render();
    }

    handle(action: Action): Action | void {
        if (TriggerNodeCreationAction.is(action)) {
            this._triggerAction = action;
        } else if (SetKeyboardPointerRenderPositionAction.is(action)) {
            this.position.renderPosition = { x: action.x, y: action.y };
            this.render();
        } else if (KeyboardGridCellSelectedAction.is(action) && action.options.originId === KeyboardPointerMetadata.ID) {
            this.position.renderPosition = action.options.centerCellPosition;
            this.render();
        }
    }

    modelRootChanged(root: Readonly<SModelRoot>): void {
        this.root = root;
    }

    render(): void {
        if (this.containerElement !== undefined) {
            const { x, y } = this.position.renderPosition;
            this.containerElement.style.left = `${x}px`;
            this.containerElement.style.top = `${y}px`;

            const { status } = this.position.containableParentAtDiagramPosition(this._triggerAction.elementTypeId);

            this.containerElement.style.borderStyle = 'solid';
            this.containerElement.style.borderWidth = 'thick';
            switch (status) {
                case 'NODE_CREATION': {
                    this.containerElement.style.borderColor = 'green';
                    break;
                }
                case 'OPERATION_NOT_ALLOWED': {
                    this.containerElement.style.borderColor = 'red';
                    break;
                }
            }
        }
    }
}
