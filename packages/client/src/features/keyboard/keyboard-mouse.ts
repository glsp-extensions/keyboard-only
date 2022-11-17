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
import { Action, CreateNodeOperation, LabeledAction, Point, TriggerNodeCreationAction } from '@eclipse-glsp/protocol';
import { inject, injectable } from 'inversify';
import {
    AbstractUIExtension,
    findChildrenAtPosition,
    findParentByFeature,
    IActionDispatcherProvider,
    IActionHandler,
    SetUIExtensionVisibilityAction,
    SModelElement,
    SModelRoot,
    TYPES,
    ViewerOptions
} from 'sprotty';
import { DOMHelper } from 'sprotty/lib/base/views/dom-helper';
import { matchesKeystroke } from 'sprotty/lib/utils/keyboard';

import { toActionArray } from '../../base/auto-complete/auto-complete-widget';
import { SModelRootListener } from '../../base/model/update-model-command';
import { getAbsolutePositionByPoint } from '../../utils/viewpoint-util';
import { Containable, isContainable } from '../hints/model';
import { ToolPalette } from '../tool-palette/tool-palette';
import { FocusDomAction, SetKeyboardMouseAction } from './actions';
import { KeyboardGrid } from './keyboard-grid';

@injectable()
export class KeyboardMouse extends AbstractUIExtension implements IActionHandler, SModelRootListener {
    static readonly ID = 'keyboard-mouse';

    protected x = 20;
    protected y = 20;

    protected readonly circleHeight = 16;
    protected readonly circleWidth = 16;

    protected triggerAction: TriggerNodeCreationAction = {
        elementTypeId: 'task:automated',
        kind: 'triggerNodeCreation'
    };

    protected root: Readonly<SModelRoot>;

    @inject(TYPES.IActionDispatcherProvider) protected actionDispatcherProvider: IActionDispatcherProvider;
    @inject(TYPES.ViewerOptions) protected viewerOptions: ViewerOptions;
    @inject(TYPES.DOMHelper) protected domHelper: DOMHelper;

    get containerPosition(): Point {
        return { x: this.x, y: this.y };
    }

    id(): string {
        return KeyboardMouse.ID;
    }

    containerClass(): string {
        return KeyboardMouse.ID;
    }

    protected initializeContents(containerElement: HTMLElement): void {
        containerElement.style.position = 'absolute';
        containerElement.tabIndex = 20;
        containerElement.addEventListener('keydown', event => {
            this.moveIfArrows(event);
            this.clickIfEnterEvent(event);
            this.hideIfEscapeEvent(event);
        });
        containerElement.style.height = `${this.circleHeight}px`;
        containerElement.style.width = `${this.circleWidth}px`;
        containerElement.style.borderRadius = '100%';
    }

    override show(root: Readonly<SModelRoot>, ...contextElementIds: string[]): void {
        super.show(root, ...contextElementIds);
        this.containerElement.focus();
    }

    protected override onBeforeShow(containerElement: HTMLElement, root: Readonly<SModelRoot>, ...selectedElementIds: string[]): void {
        this.root = root;
        this.render();
    }

    handle(action: Action): Action | void {
        if (TriggerNodeCreationAction.is(action)) {
            console.log('NodeCreationTool', action);
            this.triggerAction = action;
        } else if (SetKeyboardMouseAction.is(action)) {
            console.log('SetKeyboardMouseAction', action);
            this.x = action.x;
            this.y = action.y;

            if (this.containerElement !== undefined) {
                this.render();
            }
        }
    }

    modelRootChanged(root: Readonly<SModelRoot>): void {
        this.root = root;
    }

    protected moveIfArrows(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'ArrowDown')) {
            this.y += 10;
            this.render();
        } else if (matchesKeystroke(event, 'ArrowUp')) {
            this.y -= 10;
            this.render();
        } else if (matchesKeystroke(event, 'ArrowRight')) {
            this.x += 10;
            this.render();
        } else if (matchesKeystroke(event, 'ArrowLeft')) {
            this.x -= 10;
            this.render();
        }
    }

    protected clickIfEnterEvent(event: KeyboardEvent): any {
        const elementTypeId = this.triggerAction.elementTypeId;

        const { container, status } = this.containableParentOf(elementTypeId);
        if (matchesKeystroke(event, 'Enter')) {
            if (container !== undefined && status === 'NODE_CREATION') {
                const containerId = container.id;
                const location = this.diagramPosition();
                this.executeAction([
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardMouse.ID, visible: false, contextElementsId: [] }),
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardGrid.ID, visible: false, contextElementsId: [] }),
                    CreateNodeOperation.create(elementTypeId, { location, containerId, args: this.triggerAction.args })
                ]);
            }
            // this.hide();
        } else if (matchesKeystroke(event, 'Enter', 'ctrl', 'shift')) {
            // back to palette view, disable keyboard mouse & grid

            if (container !== undefined && status === 'NODE_CREATION') {
                const containerId = container.id;
                const location = this.diagramPosition();

                this.executeAction([
                    CreateNodeOperation.create(elementTypeId, { location, containerId, args: this.triggerAction.args }),
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardMouse.ID, visible: false, contextElementsId: [] }),
                    SetUIExtensionVisibilityAction.create({ extensionId: KeyboardGrid.ID, visible: false, contextElementsId: [] }),
                    FocusDomAction.create(ToolPalette.ID)
                ]);
            }
        } else if (matchesKeystroke(event, 'Enter', 'ctrl')) {
            // stay in this mode, selected palette option stays, grid and keyboard mouse are displayed

            if (container !== undefined && status === 'NODE_CREATION') {
                const containerId = container.id;
                const location = this.diagramPosition();
                this.executeAction(CreateNodeOperation.create(elementTypeId, { location, containerId, args: this.triggerAction.args }));
            }
        }
    }

    protected hideIfEscapeEvent(event: KeyboardEvent): any {
        if (matchesKeystroke(event, 'Escape')) {
            this.hide();
        }
    }

    protected executeAction(input: LabeledAction | Action[] | Action): void {
        this.actionDispatcherProvider()
            .then(actionDispatcher => actionDispatcher.dispatchAll(toActionArray(input)))
            .catch(reason => this.logger.error(this, 'No action dispatcher available to execute command palette action', reason));
    }

    protected render(): void {
        const { x, y } = this.containerPosition;
        this.containerElement.style.left = `${x}px`;
        this.containerElement.style.top = `${y}px`;

        const { status } = this.containableParentOf(this.triggerAction.elementTypeId);

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

    protected centerContainerPosition(): Point {
        return {
            x: this.containerPosition.x + this.circleWidth / 2,
            y: this.containerPosition.y + this.circleHeight / 2
        };
    }

    protected diagramPosition(): Point {
        return getAbsolutePositionByPoint(this.root, this.centerContainerPosition());
    }

    protected childrenAtDiagramPosition(): SModelElement[] {
        const position = this.diagramPosition();

        return [this.root, ...findChildrenAtPosition(this.root, position)];
    }

    protected containableParentOf(elementTypeId: string): {
        container: (SModelElement & Containable) | undefined;
        status: Status;
    } {
        const children = this.childrenAtDiagramPosition();

        return containableParentOf(children.reverse()[0], elementTypeId);
    }
}

type Status = 'NODE_CREATION' | 'OPERATION_NOT_ALLOWED';

function containableParentOf(
    target: SModelElement,
    elementTypeId: string
): { container: (SModelElement & Containable) | undefined; status: Status } {
    const container = findParentByFeature(target, isContainable);
    return {
        container,
        status: isCreationAllowed(container, elementTypeId) ? 'NODE_CREATION' : 'OPERATION_NOT_ALLOWED'
    };
}

function isCreationAllowed(container: (SModelElement & Containable) | undefined, elementTypeId: string): boolean | undefined {
    return container && container.isContainableElement(elementTypeId);
}
