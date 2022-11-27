/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
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
import { CreateNodeOperation } from '@eclipse-glsp/protocol';
import { EnableDefaultToolsAction, IActionDispatcher, SetUIExtensionVisibilityAction } from 'sprotty';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';
import { KeyboardGridUI } from '../grid/constants';
import { KeyboardListener } from '../keyboard-listener';
import { KeyboardPointerUI } from './constants';
import { KeyboardPointer } from './keyboard-pointer';
import { KeyboardPointerPosition } from './keyboard-pointer.position';

export class KeyboardPointerKeyboardListener extends KeyboardListener {
    protected get position(): KeyboardPointerPosition {
        return this.keyboardPointer.position;
    }

    constructor(protected readonly keyboardPointer: KeyboardPointer, protected readonly actionDispatcher: IActionDispatcher) {
        super();
    }

    override keyDown(event: KeyboardEvent): void {
        this.moveIfArrows(event);
        this.createIfEnterEvent(event);
        this.hideIfEscapeEvent(event);
    }

    protected moveIfArrows(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'ArrowDown')) {
            this.position.renderPosition = this.position.calcRelativeRenderPosition(0, 10);
            this.keyboardPointer.render();
        } else if (matchesKeystroke(event, 'ArrowUp')) {
            this.position.renderPosition = this.position.calcRelativeRenderPosition(0, -10);
            this.keyboardPointer.render();
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            this.position.renderPosition = this.position.calcRelativeRenderPosition(10, 0);
            this.keyboardPointer.render();
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            this.position.renderPosition = this.position.calcRelativeRenderPosition(-10, 0);
            this.keyboardPointer.render();
        }
    }

    protected createIfEnterEvent(event: KeyboardEvent): any {
        const elementTypeId = this.keyboardPointer.triggerAction.elementTypeId;

        const { container, status } = this.position.containableParentAtDiagramPosition(elementTypeId);

        if (container !== undefined && status === 'NODE_CREATION') {
            if (matchesKeystroke(event, 'Enter')) {
                // close everything and return to default

                const containerId = container.id;
                const location = this.position.diagramPosition;

                this.actionDispatcher.dispatchAll([
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardPointerUI.ID, visible: false, contextElementsId: [] }),
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardGridUI.ID, visible: false, contextElementsId: [] }),
                    CreateNodeOperation.create(elementTypeId, { location, containerId, args: this.keyboardPointer.triggerAction.args }),
                    EnableDefaultToolsAction.create()
                ]);
            } else if (matchesKeystroke(event, 'Enter', 'ctrl')) {
                // stay in this mode, selected palette option stays, grid and keyboard mouse are displayed

                const containerId = container.id;
                const location = this.position.diagramPosition;

                this.actionDispatcher.dispatch(
                    CreateNodeOperation.create(elementTypeId, { location, containerId, args: this.keyboardPointer.triggerAction.args })
                );
            }
        }
    }

    protected hideIfEscapeEvent(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'Escape')) {
            this.keyboardPointer.hide();
        }
    }
}
